using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

internal sealed class AutoCadRecoveryMonitor : IAsyncDisposable
{
    private readonly ICadObserver _locator;
    private readonly CancellationTokenSource _stop = new();
    private readonly Task _capture;
    private readonly Task _upload;
    private readonly string _bindingPath;
    private string? _manualSource;
    private string? _boundSource;
    private (string Path, long Length, DateTime Modified)? _observed;
    private volatile string? _captureStatus;
    private volatile string? _uploadStatus;
    public string DirectoryPath { get; }
    public string Status => _locator.Status + " " + _captureStatus + " " + _uploadStatus;
    public DrawingPresence Presence => _locator.Presence;

    public AutoCadRecoveryMonitor(string drawing, DesktopDocumentOpenRequest request, DhyriumApiClient api, Func<string> token, ICadObserver? observer = null)
    {
        DirectoryPath = Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(drawing))!, "recoveries");
        Directory.CreateDirectory(DirectoryPath);
        _bindingPath = drawing + ".autosave-source.json";
        if (File.Exists(_bindingPath)) _boundSource = JsonSerializer.Deserialize<string>(File.ReadAllText(_bindingPath));
        _locator = observer ?? new AutoCadAutosaveLocator(drawing);
        _capture = CaptureLoopAsync(_stop.Token);
        _upload = UploadLoopAsync(request, api, token, _stop.Token);
    }

    public void SelectSource(string path)
    {
        if (!new[] { ".sv$", ".bak" }.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase))
            throw new InvalidDataException("Seleccione el autoguardado .sv$ o respaldo .bak de este dibujo.");
        _manualSource = Path.GetFullPath(path);
    }

    private async Task CaptureLoopAsync(CancellationToken token)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
            while (await timer.WaitForNextTickAsync(token))
            {
                try
                {
                    var source = _manualSource ?? _locator.Source ?? _boundSource;
                    if (source is null) continue;
                    if (source != _boundSource)
                    {
                        await File.WriteAllTextAsync(_bindingPath + ".tmp", JsonSerializer.Serialize(source), token);
                        File.Move(_bindingPath + ".tmp", _bindingPath, true);
                        _boundSource = source;
                    }
                    var file = new FileInfo(source);
                    if (!file.Exists) { _captureStatus = "Esperando que AutoCAD genere el autoguardado identificado."; continue; }
                    var stamp = (source, file.Length, file.LastWriteTimeUtc);
                    if (_observed == stamp) continue;
                    await CaptureAsync(source, DirectoryPath, token);
                    _observed = stamp;
                    _captureStatus = "Autoguardado conservado localmente a las " + DateTime.Now.ToString("HH:mm:ss") + ".";
                    SessionLog.Write(DirectoryPath, "recovery", "captured");
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
                catch (Exception error) { _captureStatus = "Recuperación pendiente: " + error.Message; }
            }
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
    }

    internal static async Task<string> CaptureAsync(string source, string directory, CancellationToken token)
    {
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, Guid.NewGuid().ToString("N") + ".capturing");
        try
        {
            await StableFileSnapshot.CreateAsync(source, temporary, token);
            var header = new byte[6];
            await using (var file = File.OpenRead(temporary)) await file.ReadExactlyAsync(header, token);
            var signature = Encoding.ASCII.GetString(header);
            if (!System.Text.RegularExpressions.Regex.IsMatch(signature, "^AC10[0-9]{2}$"))
                throw new InvalidDataException("La copia todavía no tiene un encabezado DWG válido.");
            var destination = Path.Combine(directory, DhyriumProtocol.HashFile(temporary).ToLowerInvariant() + ".dwg");
            if (!File.Exists(destination)) File.Move(temporary, destination);
            return destination;
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private async Task UploadLoopAsync(DesktopDocumentOpenRequest request, DhyriumApiClient api, Func<string> readToken, CancellationToken token)
    {
        try
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            while (await timer.WaitForNextTickAsync(token))
            {
                try
                {
                    foreach (var path in Directory.GetFiles(DirectoryPath, "*.dwg").OrderByDescending(File.GetLastWriteTimeUtc))
                    {
                        if (File.Exists(path + ".uploaded")) continue;
                        await api.UploadRecoveryAsync(request, path, readToken(), token);
                        await File.WriteAllTextAsync(path + ".uploaded", DateTimeOffset.UtcNow.ToString("O"), token);
                        _uploadStatus = "Copia de recuperación confirmada en Dhyrium a las " + DateTime.Now.ToString("HH:mm:ss") + ".";
                        SessionLog.Write(DirectoryPath, request.DocumentId, "recovery-uploaded");
                    }
                }
                catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
                catch (Exception error) { _uploadStatus = "Copia local pendiente de enviar: " + error.Message; }
            }
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
    }

    public async ValueTask DisposeAsync()
    {
        _stop.Cancel(); _locator.Dispose();
        await Task.WhenAll(_capture, _upload);
        _stop.Dispose();
    }
}
