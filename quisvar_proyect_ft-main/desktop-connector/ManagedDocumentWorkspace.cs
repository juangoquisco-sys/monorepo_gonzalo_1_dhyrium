using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public sealed class ManagedDocumentWorkspace : IAsyncDisposable
{
    private static readonly TimeSpan DebounceDelay = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan StabilityDelay = TimeSpan.FromMilliseconds(400);
    private static readonly TimeSpan EditorLockPollDelay = TimeSpan.FromMilliseconds(500);
    private static readonly TimeSpan EditorLockReleaseDelay = TimeSpan.FromSeconds(2);
    // Some Windows applications are opened by ShellExecute in an existing process.
    // In that case Process.Start can finish immediately even though the document
    // remains open. Keep the file watcher alive for a workday as a safe fallback.
    private static readonly TimeSpan UnobservedEditorSessionLifetime = TimeSpan.FromHours(8);

    private readonly ConnectorSettings _settings;
    private readonly DhyriumApiClient _apiClient;
    private readonly ITokenVault _tokenVault;
    private readonly DesktopDocumentOpenRequest _request;
    private readonly bool _refreshFromServer;
    private readonly ICadObserver? _observer;
    private readonly SemaphoreSlim _syncGate = new(1, 1);
    private readonly CancellationTokenSource _lifetimeCancellation = new();
    private string _baseVersionId;
    private FileSystemWatcher? _watcher;
    private CancellationTokenSource? _debounceCancellation;
    private Task? _lastBackgroundSync;
    private Task? _polling;
    private Task? _lockHeartbeat;
    private AutoCadRecoveryMonitor? _recovery;
    public bool RecoveryDelivered { get; private set; }
    private (long Length, DateTime Modified)? _observedFile;
    private bool _disposed;
    private FileStream? _sessionLock;
    public bool IsMapPackage => Path.GetExtension(_request.FileName).Equals(".mpk", StringComparison.OrdinalIgnoreCase);
    private string StatePath => FilePath + ".state.json";
    private sealed record WorkspaceState(string BaseVersionId, string? LastSyncedHash, bool RecoveryDelivered = false);
    public DrawingPresence EditorPresence => _recovery?.Presence ?? DrawingPresence.Unknown;
    public bool HasEditorLock => HasKnownEditorLock();
    public bool IsReadOnly => _request.ReadOnly;
    public string? LockedByName => _request.LockedByName;
    public bool HasPendingChanges => File.Exists(FilePath + ".upload-snapshot") ||
        (!IsMapPackage && !RecoveryDelivered && File.Exists(FilePath) &&
         !string.Equals(DhyriumProtocol.HashFile(FilePath), LastSyncedHash, StringComparison.OrdinalIgnoreCase));

    public ManagedDocumentWorkspace(
        ConnectorSettings settings,
        DhyriumApiClient apiClient,
        ITokenVault tokenVault,
        DesktopDocumentOpenRequest request, bool refreshFromServer = true, ICadObserver? observer = null)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        _apiClient = apiClient ?? throw new ArgumentNullException(nameof(apiClient));
        _tokenVault = tokenVault ?? throw new ArgumentNullException(nameof(tokenVault));
        _request = request ?? throw new ArgumentNullException(nameof(request));
        _baseVersionId = _request.VersionId;
        _refreshFromServer = refreshFromServer;
        _observer = observer;
    }

    public string FilePath { get; private set; } = string.Empty;

    public string? LastSyncedHash { get; private set; }

    public DesktopUploadResult? LastUpload { get; private set; }

    public string? LastSyncError { get; private set; }
    public DateTimeOffset? LastSyncedAt { get; private set; }
    public bool IsSynchronizing { get; private set; }
    public string? RecoveryStatus => _recovery?.Status;
    public string? RecoveryDirectory => _recovery?.DirectoryPath;
    public void SelectAutosaveSource(string path) => _recovery?.SelectSource(path);

    public async Task<string> PrepareAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        var token = ReadTokenOrThrow();
        FilePath = BuildManagedFilePath();

        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        try { _sessionLock = new FileStream(FilePath + ".session.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None); }
        catch (IOException) { throw new IOException("Este documento ya tiene una sesión abierta en Dhyrium Desktop."); }
        // A prior read-only open marks the cached copy read-only on disk; clear
        // that before anything below tries to overwrite it, or File.Move fails.
        ClearReadOnlyIfSet(FilePath);
        if (_request.ReadOnly)
        {
            // Another person holds the edit lock: always show the current server
            // copy, never a locally cached working copy that might have pending
            // edits from a session that lost its own lock.
            var incoming = FilePath + ".readonly-incoming";
            await _apiClient.DownloadDocumentContentAsync(_request, incoming, token, cancellationToken);
            File.Move(incoming, FilePath, true);
            LastSyncedHash = _request.ChecksumSha256;
            try { File.SetAttributes(FilePath, File.GetAttributes(FilePath) | FileAttributes.ReadOnly); }
            catch (IOException) { }
            // Don't touch state.json: it belongs to the edit session that holds
            // (or last held) the lock, and this view doesn't track sync state.
            SessionLog.Write(_settings.CacheRoot, _request.DocumentId, "workspace-prepared-readonly");
            return FilePath;
        }
        LastSyncedHash = _request.ChecksumSha256;
        if (File.Exists(StatePath))
        {
            var state = JsonSerializer.Deserialize<WorkspaceState>(await File.ReadAllTextAsync(StatePath, cancellationToken));
            if (state is not null) { _baseVersionId = state.BaseVersionId; LastSyncedHash = state.LastSyncedHash; RecoveryDelivered = state.RecoveryDelivered; }
        }
        // Only a clean, closed working copy can be refreshed to a newly authorized version.
        if (_refreshFromServer && File.Exists(FilePath) && (_baseVersionId != _request.VersionId || RecoveryDelivered) && !HasKnownEditorLock() &&
            !HasPendingChanges && !File.Exists(FilePath + ".package-snapshot"))
        {
            var archive = Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(FilePath))!, "versions", _baseVersionId);
            Directory.CreateDirectory(archive);
            File.Copy(FilePath, Path.Combine(archive, Guid.NewGuid().ToString("N") + "-" + Path.GetFileName(FilePath)), false);
            var incoming = FilePath + ".incoming";
            await _apiClient.DownloadDocumentContentAsync(_request, incoming, token, cancellationToken);
            File.Move(incoming, FilePath, true);
            _baseVersionId = _request.VersionId; LastSyncedHash = _request.ChecksumSha256; RecoveryDelivered = false;
        }
        // Keep local unsent changes on retry/restart. Download only a missing managed file.
        if (!File.Exists(FilePath))
            await _apiClient.DownloadDocumentContentAsync(_request, FilePath, token, cancellationToken);
        LastSyncedHash ??= DhyriumProtocol.HashFile(FilePath);
        await PersistStateAsync();
        SessionLog.Write(_settings.CacheRoot, _request.DocumentId, "workspace-prepared");
        // We hold the edit lock: keep renewing it for as long as this workspace
        // stays open, so no one else can open the document for editing.
        _lockHeartbeat = HeartbeatLockAsync(_lifetimeCancellation.Token);
        if (!IsMapPackage)
        {
            StartWatcher();
            _polling = PollChangesAsync(_lifetimeCancellation.Token);
            if (Path.GetExtension(FilePath).Equals(".dwg", StringComparison.OrdinalIgnoreCase))
                _recovery = new AutoCadRecoveryMonitor(FilePath, _request, _apiClient, ReadTokenOrThrow, _observer);
        }
        return FilePath;
    }

    private async Task HeartbeatLockAsync(CancellationToken token)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            do
            {
                try { await _apiClient.HeartbeatLockAsync(_request, ReadTokenOrThrow(), token); }
                catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
                catch (Exception error) { SessionLog.Write(_settings.CacheRoot, _request.DocumentId, "lock-heartbeat-failed", error); }
            } while (await timer.WaitForNextTickAsync(token));
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
    }

    public async Task<bool> SyncNowAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return !_request.ReadOnly && !IsMapPackage && !RecoveryDelivered &&
            await SynchronizeIfChangedAsync(waitForStability: true, cancellationToken);
    }

    public DesktopDocumentOpenRequest CurrentRequest => _request with { VersionId = _baseVersionId,
        ContentPath = $"/desktop/documents/{_request.DocumentId}/versions/{_baseVersionId}/content",
        ChecksumSha256 = LastSyncedHash, SizeBytes = File.Exists(FilePath) ? new FileInfo(FilePath).Length : _request.SizeBytes };

    public async Task WaitForEditorSessionEndAsync(
        CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        var startedAt = DateTimeOffset.UtcNow;
        var observedEditorLock = false;
        DateTimeOffset? lockReleasedAt = null;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var editorHasLock = HasKnownEditorLock();

            if (_recovery is not null)
            {
                if (EditorPresence == DrawingPresence.Closed && !editorHasLock)
                {
                    await SynchronizeIfChangedAsync(true, cancellationToken);
                    if (!HasPendingChanges) return;
                }
                await Task.Delay(EditorLockPollDelay, cancellationToken);
                continue;
            }

            if (editorHasLock)
            {
                observedEditorLock = true;
                lockReleasedAt = null;
            }
            else if (observedEditorLock)
            {
                lockReleasedAt ??= DateTimeOffset.UtcNow;
                if (DateTimeOffset.UtcNow - lockReleasedAt >= EditorLockReleaseDelay)
                {
                    await SynchronizeIfChangedAsync(
                        waitForStability: true,
                        cancellationToken);
                    return;
                }
            }
            else if (DateTimeOffset.UtcNow - startedAt >= UnobservedEditorSessionLifetime)
            {
                await SynchronizeIfChangedAsync(
                    waitForStability: true,
                    cancellationToken);
                return;
            }

            await Task.Delay(EditorLockPollDelay, cancellationToken);
        }
    }

    private void StartWatcher()
    {
        var directory = Path.GetDirectoryName(FilePath);
        if (string.IsNullOrWhiteSpace(directory))
        {
            throw new InvalidOperationException("No se pudo preparar el espacio local administrado.");
        }

        _watcher = new FileSystemWatcher(directory, Path.GetFileName(FilePath))
        {
            IncludeSubdirectories = false,
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true,
        };

        _watcher.Changed += OnLocalFileChanged;
        _watcher.Created += OnLocalFileChanged;
        _watcher.Renamed += OnLocalFileRenamed;
        _watcher.Error += (_, _) => ScheduleSynchronization();
    }

    private async Task PollChangesAsync(CancellationToken token)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
            while (await timer.WaitForNextTickAsync(token))
            {
                try
                {
                    var file = new FileInfo(FilePath);
                    if (file.Exists && (_observedFile != (file.Length, file.LastWriteTimeUtc) ||
                        File.Exists(FilePath + ".upload-snapshot") || LastSyncError is not null))
                        await SynchronizeIfChangedAsync(true, token);
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
                catch (Exception error) { LastSyncError = error.Message; }
            }
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
    }

    private void OnLocalFileChanged(object sender, FileSystemEventArgs eventArgs)
    {
        if (IsManagedFile(eventArgs.FullPath))
        {
            ScheduleSynchronization();
        }
    }

    private void OnLocalFileRenamed(object sender, RenamedEventArgs eventArgs)
    {
        if (IsManagedFile(eventArgs.FullPath))
        {
            ScheduleSynchronization();
        }
    }

    private bool IsManagedFile(string path) =>
        string.Equals(path, FilePath, StringComparison.OrdinalIgnoreCase);

    private bool HasKnownEditorLock()
    {
        if (string.IsNullOrWhiteSpace(FilePath))
        {
            return false;
        }

        var directory = Path.GetDirectoryName(FilePath);
        var fileName = Path.GetFileName(FilePath);
        if (string.IsNullOrWhiteSpace(directory) || string.IsNullOrWhiteSpace(fileName))
        {
            return false;
        }

        var candidates = new[]
        {
            Path.ChangeExtension(FilePath, ".dwl"),
            Path.ChangeExtension(FilePath, ".dwl2"),
            Path.Combine(directory, $"~${fileName}"),
            Path.Combine(directory, $".~lock.{fileName}#"),
        };

        return candidates.Any(File.Exists);
    }

    private void ScheduleSynchronization()
    {
        if (_disposed)
        {
            return;
        }

        var nextCancellation = CancellationTokenSource.CreateLinkedTokenSource(
            _lifetimeCancellation.Token);
        var previousCancellation = Interlocked.Exchange(
            ref _debounceCancellation,
            nextCancellation);
        previousCancellation?.Cancel();

        _lastBackgroundSync = SynchronizeAfterDebounceAsync(nextCancellation);
    }

    private async Task SynchronizeAfterDebounceAsync(CancellationTokenSource cancellation)
    {
        try
        {
            await Task.Delay(DebounceDelay, cancellation.Token);
            await SynchronizeIfChangedAsync(waitForStability: true, _lifetimeCancellation.Token);
        }
        catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
        {
            // A newer write superseded this pending synchronization.
        }
        catch (Exception exception)
        {
            LastSyncError = exception.Message;
        }
        finally
        {
            if (ReferenceEquals(_debounceCancellation, cancellation))
            {
                Interlocked.CompareExchange(ref _debounceCancellation, null, cancellation);
            }

            cancellation.Dispose();
        }
    }

    private async Task<bool> SynchronizeIfChangedAsync(
        bool waitForStability,
        CancellationToken cancellationToken)
    {
        await _syncGate.WaitAsync(cancellationToken);
        IsSynchronizing = true;
        try
        {
            if (RecoveryDelivered) return false;
            if (string.IsNullOrWhiteSpace(FilePath) || !File.Exists(FilePath))
            {
                return false;
            }

            if (waitForStability && !await WaitForStableFileAsync(cancellationToken))
            {
                return false;
            }

            var snapshot = FilePath + ".upload-snapshot";
            var candidateHash = File.Exists(snapshot) ? DhyriumProtocol.HashFile(snapshot) : DhyriumProtocol.HashFile(FilePath);
            if (File.Exists(snapshot) && string.Equals(candidateHash, LastSyncedHash, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(snapshot);
                candidateHash = DhyriumProtocol.HashFile(FilePath);
            }
            if (string.Equals(candidateHash, LastSyncedHash, StringComparison.OrdinalIgnoreCase))
            {
                if (File.Exists(snapshot)) File.Delete(snapshot);
                var unchanged = new FileInfo(FilePath);
                _observedFile = (unchanged.Length, unchanged.LastWriteTimeUtc);
                LastSyncError = null;
                return false;
            }
            if (!File.Exists(snapshot)) await CreateSnapshotAsync(FilePath, snapshot, cancellationToken);
            candidateHash = DhyriumProtocol.HashFile(snapshot);
            LastUpload = await _apiClient.UploadDocumentVersionAsync(_request, _baseVersionId, snapshot, ReadTokenOrThrow(), cancellationToken);
            _baseVersionId = LastUpload.VersionId;
            LastSyncedHash = candidateHash;
            await PersistStateAsync();
            LastSyncedAt = DateTimeOffset.Now;
            SessionLog.Write(_settings.CacheRoot, _request.DocumentId, "version-confirmed");
            File.Delete(snapshot);
            // Writes during transfer belong to the next version; never mark them as uploaded.
            if (!string.Equals(DhyriumProtocol.HashFile(FilePath), candidateHash, StringComparison.OrdinalIgnoreCase)) ScheduleSynchronization();

            LastSyncError = null;
            return true;
        }
        finally
        {
            IsSynchronizing = false;
            _syncGate.Release();
        }
    }

    private async Task<bool> WaitForStableFileAsync(CancellationToken cancellationToken)
    {
        const int maximumAttempts = 5;
        for (var attempt = 0; attempt < maximumAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!File.Exists(FilePath))
            {
                return false;
            }

            var first = new FileInfo(FilePath);
            var firstLength = first.Length;
            var firstWrite = first.LastWriteTimeUtc;
            await Task.Delay(StabilityDelay, cancellationToken);

            var second = new FileInfo(FilePath);
            if (second.Exists &&
                second.Length == firstLength &&
                second.LastWriteTimeUtc == firstWrite)
            {
                return true;
            }
        }

        return false;
    }

    private async Task PersistStateAsync()
    {
        var temporary = StatePath + ".tmp";
        await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(new WorkspaceState(_baseVersionId, LastSyncedHash, RecoveryDelivered)));
        File.Move(temporary, StatePath, overwrite: true);
    }

    public async Task CancelPendingDeliveryAsync()
    {
        await _syncGate.WaitAsync();
        try
        {
            await _apiClient.CancelPendingUploadAsync(_request, FilePath + (IsMapPackage ? ".package-snapshot" : ".upload-snapshot"), ReadTokenOrThrow());
            LastSyncError = null;
        }
        finally { _syncGate.Release(); }
    }

    private static Task CreateSnapshotAsync(string sourcePath, string snapshot, CancellationToken cancellationToken) =>
        StableFileSnapshot.CreateAsync(sourcePath, snapshot, cancellationToken);

    public async Task DeliverRecoveredDrawingAsync(string drawing, CancellationToken token)
    {
        if (_recovery is null || !Path.GetExtension(drawing).Equals(".dwg", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Seleccione el dibujo DWG revisado y guardado desde AutoCAD o Civil 3D.");
        await _syncGate.WaitAsync(token);
        var snapshot = FilePath + ".recovered-snapshot";
        try
        {
            if (RecoveryDelivered) throw new InvalidOperationException("Abra de nuevo el dibujo desde la web para continuar trabajando.");
            if (File.Exists(snapshot) && !string.Equals(DhyriumProtocol.HashFile(snapshot), DhyriumProtocol.HashFile(drawing), StringComparison.OrdinalIgnoreCase))
                throw new IOException("Hay otra recuperación pendiente de entregar. Seleccione la misma copia para reintentar.");
            if (!File.Exists(snapshot)) await CreateSnapshotAsync(drawing, snapshot, token);
            LastUpload = await _apiClient.UploadDocumentVersionAsync(_request, _baseVersionId, snapshot, ReadTokenOrThrow(), token);
            // Once recovery becomes canonical, the old open drawing must never
            // automatically overwrite it. Start a fresh session from the web.
            RecoveryDelivered = true;
            _baseVersionId = LastUpload.VersionId;
            await PersistStateAsync();
            LastSyncedAt = DateTimeOffset.Now;
            LastSyncError = null;
            File.Delete(snapshot);
        }
        finally { _syncGate.Release(); }
    }

    public async Task DeliverMapPackageAsync(string exportedPackagePath, CancellationToken cancellationToken = default)
    {
        if (!IsMapPackage || !Path.GetExtension(exportedPackagePath).Equals(".mpk", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Seleccione el paquete .mpk generado desde ArcMap.");
        await _syncGate.WaitAsync(cancellationToken);
        try
        {
            var snapshot = FilePath + ".package-snapshot";
            if (File.Exists(snapshot) && !string.Equals(DhyriumProtocol.HashFile(snapshot), DhyriumProtocol.HashFile(exportedPackagePath), StringComparison.OrdinalIgnoreCase))
                throw new IOException("Hay una entrega pendiente de otro paquete. Reanúdela antes de enviar uno distinto.");
            if (!File.Exists(snapshot)) await CreateSnapshotAsync(exportedPackagePath, snapshot, cancellationToken);
            var hash = DhyriumProtocol.HashFile(snapshot);
            LastUpload = await _apiClient.UploadDocumentVersionAsync(_request, _baseVersionId, snapshot, ReadTokenOrThrow(), cancellationToken);
            _baseVersionId = LastUpload.VersionId;
            LastSyncedHash = hash;
            await PersistStateAsync();
            File.Delete(snapshot);
            LastSyncError = null;
        }
        finally { _syncGate.Release(); }
    }

    private static void ClearReadOnlyIfSet(string path)
    {
        if (!File.Exists(path)) return;
        var attributes = File.GetAttributes(path);
        if ((attributes & FileAttributes.ReadOnly) != 0)
            File.SetAttributes(path, attributes & ~FileAttributes.ReadOnly);
    }

    private string BuildManagedFilePath()
    {
        var source = Encoding.UTF8.GetBytes(_request.DocumentId);
        try
        {
            var key = Convert.ToHexString(SHA256.HashData(source));
            return Path.Combine(
                Path.GetFullPath(_settings.CacheRoot),
                "documents",
                key[..24],
                "working",
                DhyriumProtocol.SafeFileName(_request.FileName));
        }
        finally
        {
            CryptographicOperations.ZeroMemory(source);
        }
    }

    private string ReadTokenOrThrow() =>
        _tokenVault.Read(_settings.ServerUrl) ??
        throw new UnauthorizedAccessException(
            "La sesión de Dhyrium Desktop venció. Inicie sesión de nuevo.");

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _lifetimeCancellation.Cancel();
        _watcher?.Dispose();
        _watcher = null;
        if (_recovery is not null) await _recovery.DisposeAsync();
        if (_polling is not null) await _polling;
        if (_lockHeartbeat is not null) await _lockHeartbeat;

        var debounceCancellation = Interlocked.Exchange(ref _debounceCancellation, null);
        debounceCancellation?.Cancel();

        if (_lastBackgroundSync is not null)
        {
            try
            {
                await _lastBackgroundSync;
            }
            catch (OperationCanceledException)
            {
                // Expected while closing the connector.
            }
        }

        await _syncGate.WaitAsync();
        _syncGate.Release();
        if (!_request.ReadOnly && !string.IsNullOrWhiteSpace(FilePath))
        {
            // Best effort: let someone else edit immediately. If this fails
            // (offline, server down) the 60s lease still expires on its own.
            try { await _apiClient.ReleaseLockAsync(_request, ReadTokenOrThrow()); }
            catch (Exception error) { SessionLog.Write(_settings.CacheRoot, _request.DocumentId, "lock-release-failed", error); }
        }
        _sessionLock?.Dispose();
        _syncGate.Dispose();
        _lifetimeCancellation.Dispose();
    }
}
