using System.Diagnostics;

namespace Dhyrium.Desktop.Connector;

public interface ILocalFileLauncher
{
    Process? Open(string localFilePath);
}

public sealed class WindowsShellFileLauncher : ILocalFileLauncher
{
    public Process? Open(string localFilePath)
    {
        return Process.Start(new ProcessStartInfo
        {
            FileName = localFilePath,
            UseShellExecute = true,
            Verb = "open",
        });
    }
}

public sealed class ConnectorService
{
    private readonly ConnectorSettings _settings;
    private readonly DhyriumApiClient _apiClient;
    private readonly ITokenVault _tokenVault;
    private readonly ILocalFileLauncher _fileLauncher;

    public ConnectorService(
        ConnectorSettings settings,
        DhyriumApiClient apiClient,
        ITokenVault tokenVault,
        ILocalFileLauncher fileLauncher)
    {
        _settings = settings ?? throw new ArgumentNullException(nameof(settings));
        _apiClient = apiClient ?? throw new ArgumentNullException(nameof(apiClient));
        _tokenVault = tokenVault ?? throw new ArgumentNullException(nameof(tokenVault));
        _fileLauncher = fileLauncher ?? throw new ArgumentNullException(nameof(fileLauncher));
    }

    public async Task<OpenedDocumentSession> OpenDocumentAsync(
        DesktopDocumentOpenRequest request,
        CancellationToken cancellationToken = default)
    {
        var workspace = new ManagedDocumentWorkspace(
            _settings,
            _apiClient,
            _tokenVault,
            request);
        try
        {
            var localFilePath = await workspace.PrepareAsync(cancellationToken);
            var process = _fileLauncher.Open(localFilePath);
            return new OpenedDocumentSession(workspace, localFilePath, process);
        }
        catch
        {
            await workspace.DisposeAsync();
            throw;
        }
    }

    public async Task<OpenedDocumentSession> OpenDocumentAsync(
        DesktopLaunchRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        var token = _tokenVault.Read(_settings.ServerUrl) ??
            throw new UnauthorizedAccessException(
                "La sesión de Dhyrium Desktop venció. Inicie sesión de nuevo.");
        var documentRequest = await _apiClient.RedeemDesktopLaunchAsync(
            request.Ticket,
            token,
            cancellationToken);
        return await OpenDocumentAsync(documentRequest, cancellationToken);
    }
}

public sealed class OpenedDocumentSession : IAsyncDisposable
{
    private readonly ManagedDocumentWorkspace _workspace;
    private readonly Process? _applicationProcess;
    private bool _disposed;

    internal OpenedDocumentSession(
        ManagedDocumentWorkspace workspace,
        string localFilePath,
        Process? applicationProcess)
    {
        _workspace = workspace;
        LocalFilePath = localFilePath;
        _applicationProcess = applicationProcess;
    }

    public string LocalFilePath { get; }

    public string? LastSyncError => _workspace.LastSyncError;

    public Task<bool> SyncNowAsync(CancellationToken cancellationToken = default) =>
        _workspace.SyncNowAsync(cancellationToken);

    public Task WaitForEditorSessionEndAsync(CancellationToken cancellationToken = default) =>
        _workspace.WaitForEditorSessionEndAsync(cancellationToken);

    public async Task WaitForApplicationExitAsync(CancellationToken cancellationToken)
    {
        if (_applicationProcess is null)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return;
        }

        await _applicationProcess.WaitForExitAsync(cancellationToken);
        await _workspace.SyncNowAsync(cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        try
        {
            await _workspace.SyncNowAsync();
        }
        finally
        {
            _applicationProcess?.Dispose();
            await _workspace.DisposeAsync();
        }
    }
}
