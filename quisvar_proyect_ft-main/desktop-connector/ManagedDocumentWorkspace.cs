using System.Security.Cryptography;
using System.Text;

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
    private readonly SemaphoreSlim _syncGate = new(1, 1);
    private readonly CancellationTokenSource _lifetimeCancellation = new();
    private string _baseVersionId;
    private FileSystemWatcher? _watcher;
    private CancellationTokenSource? _debounceCancellation;
    private Task? _lastBackgroundSync;
    private bool _disposed;

    public ManagedDocumentWorkspace(
        ConnectorSettings settings,
        DhyriumApiClient apiClient,
        ITokenVault tokenVault,
        DesktopDocumentOpenRequest request)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        _apiClient = apiClient ?? throw new ArgumentNullException(nameof(apiClient));
        _tokenVault = tokenVault ?? throw new ArgumentNullException(nameof(tokenVault));
        _request = request ?? throw new ArgumentNullException(nameof(request));
        _baseVersionId = _request.VersionId;
    }

    public string FilePath { get; private set; } = string.Empty;

    public string? LastSyncedHash { get; private set; }

    public DesktopUploadResult? LastUpload { get; private set; }

    public string? LastSyncError { get; private set; }

    public async Task<string> PrepareAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        var token = ReadTokenOrThrow();
        FilePath = BuildManagedFilePath();

        await _apiClient.DownloadDocumentContentAsync(
            _request,
            FilePath,
            token,
            cancellationToken);

        LastSyncedHash = DhyriumProtocol.HashFile(FilePath);
        StartWatcher();
        return FilePath;
    }

    public async Task<bool> SyncNowAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        return await SynchronizeIfChangedAsync(waitForStability: false, cancellationToken);
    }

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
            await SynchronizeIfChangedAsync(waitForStability: true, cancellation.Token);
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
        try
        {
            if (string.IsNullOrWhiteSpace(FilePath) || !File.Exists(FilePath))
            {
                return false;
            }

            if (waitForStability && !await WaitForStableFileAsync(cancellationToken))
            {
                return false;
            }

            var candidateHash = DhyriumProtocol.HashFile(FilePath);
            if (string.Equals(candidateHash, LastSyncedHash, StringComparison.Ordinal))
            {
                return false;
            }

            var token = ReadTokenOrThrow();
            LastUpload = await _apiClient.UploadDocumentVersionAsync(
                _request,
                _baseVersionId,
                FilePath,
                token,
                cancellationToken);
            _baseVersionId = LastUpload.VersionId;

            var finalHash = DhyriumProtocol.HashFile(FilePath);
            if (string.Equals(finalHash, candidateHash, StringComparison.Ordinal))
            {
                LastSyncedHash = candidateHash;
            }
            else
            {
                ScheduleSynchronization();
            }

            LastSyncError = null;
            return true;
        }
        finally
        {
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

        _syncGate.Dispose();
        _lifetimeCancellation.Dispose();
    }
}
