using System.Diagnostics;
using System.Windows.Forms;

namespace Dhyrium.Desktop.Connector;

public sealed class DocumentTransferForm : Form
{
    private readonly ConnectorSettings _settings;
    private readonly ITokenVault _vault;
    private readonly DesktopLaunchRequest _launch;
    private readonly ILocalFileLauncher _launcher;
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromMinutes(15) };
    private readonly DhyriumApiClient _api;
    private DesktopDocumentOpenRequest? _request;
    private OpenedDocumentSession? _session;
    private CancellationTokenSource? _operation;
    private string? _packagePath;
    private bool _closing;
    private bool _managed;
    private bool _resumeOnly;
    private bool _closedHandled;
    private readonly Label _localPath = new() { AutoSize = true, MaximumSize = new Size(620, 0) };
    private readonly Label _editorStatus = new() { AutoSize = true, MaximumSize = new Size(620, 0) };
    public bool Ready => _session is not null && _operation is null;
    private readonly Label _file = new() { AutoSize = true, MaximumSize = new Size(620, 0), Font = new Font("Segoe UI", 12, FontStyle.Bold) };
    private readonly Label _status = new() { AutoSize = true, MaximumSize = new Size(620, 0), Text = "Preparando apertura…" };
    private readonly Label _instructions = new() { AutoSize = true, MaximumSize = new Size(620, 0) };
    private readonly Label _recoveryStatus = new() { AutoSize = true, MaximumSize = new Size(620, 0) };
    private readonly Button _recoveries = new() { Text = "Recuperaciones de AutoCAD", AutoSize = true, Visible = false };
    private readonly ProgressBar _progress = new() { Width = 610, Height = 22, Maximum = 1000 };
    private readonly Button _resume = new() { Text = "Reanudar", AutoSize = true, Enabled = false };
    private readonly Button _pause = new() { Text = "Pausar", AutoSize = true };
    private readonly Button _deliver = new() { Text = "Entregar paquete actualizado", AutoSize = true, Enabled = false };
    private readonly Button _folder = new() { Text = "Abrir carpeta local", AutoSize = true, Enabled = false };
    private readonly Button _cancelDelivery = new() { Text = "Cancelar entrega pendiente", AutoSize = true, Visible = false };
    private readonly System.Windows.Forms.Timer _statusTimer = new() { Interval = 1500 };
    private long _lastProgressTicks;

    public DocumentTransferForm(ConnectorSettings settings, ITokenVault vault, DesktopLaunchRequest launch, ILocalFileLauncher? launcher = null)
    {
        _settings = settings; _vault = vault; _launch = launch;
        _launcher = launcher ?? new WindowsShellFileLauncher();
        _api = new DhyriumApiClient(_http, settings.ServerUrl);
        Text = "Dhyrium Desktop — archivos";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(680, 340);
        MinimumSize = new Size(700, 380);
        Font = new Font("Segoe UI", 10);
        BackColor = Color.White;
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, Padding = new Padding(24), AutoScroll = true };
        var actions = new FlowLayoutPanel { AutoSize = true, MaximumSize = new Size(620, 0), FlowDirection = FlowDirection.LeftToRight };
        actions.Controls.AddRange([_pause, _resume, _deliver, _folder, _cancelDelivery, _recoveries]);
        layout.Controls.AddRange([_file, _localPath, _editorStatus, _status, _progress, _instructions, _recoveryStatus, actions]);
        Controls.Add(layout);
        _api.ProgressChanged += OnProgress;
        _pause.Click += (_, _) => _operation?.Cancel();
        _resume.Click += async (_, _) => await RunOperationAsync();
        _cancelDelivery.Click += async (_, _) =>
        {
            if (_session is null || _operation is not null) return;
            _operation = new CancellationTokenSource();
            _resume.Enabled = false; _deliver.Enabled = false;
            _cancelDelivery.Enabled = false;
            try
            {
                await _session.CancelPendingDeliveryAsync();
                _packagePath = null;
                _status.Text = "Entrega pendiente cancelada. Su archivo local original se conserva.";
                _resume.Enabled = false; _cancelDelivery.Visible = false; _deliver.Enabled = _session.IsMapPackage;
            }
            catch (Exception error) { _status.Text = error.Message; }
            finally { _cancelDelivery.Enabled = true; _operation.Dispose(); _operation = null; }
        };
        _deliver.Click += async (_, _) =>
        {
            using var picker = new OpenFileDialog { Title = "Seleccione el paquete regenerado desde ArcMap", Filter = "Paquete de ArcMap (*.mpk)|*.mpk", CheckFileExists = true };
            if (picker.ShowDialog(this) != DialogResult.OK) return;
            _packagePath = picker.FileName;
            await RunOperationAsync();
        };
        _folder.Click += (_, _) =>
        {
            if (_session is not null) Process.Start(new ProcessStartInfo("explorer.exe", Path.GetDirectoryName(_session.LocalFilePath)!) { UseShellExecute = true });
        };
        Shown += async (_, _) => await RunOperationAsync();
        _recoveries.Click += (_, _) =>
        {
            if (_session?.RecoveryDirectory is null || _request is null) return;
            using var form = new RecoveryForm(_session, _request, _api, () => _vault.Read(_settings.ServerUrl) ?? throw new UnauthorizedAccessException("Inicie sesión en Dhyrium Desktop."));
            form.ShowDialog(this);
        };
        FormClosing += OnClosing;
        _statusTimer.Tick += (_, _) =>
        {
            _localPath.Text = _session?.LocalFilePath ?? "";
            if (_session?.IsReadOnly == true)
            {
                _status.Text = $"Solo lectura: {_session.LockedByName ?? "otra persona"} tiene este archivo abierto para editar. Sus cambios no se enviarán.";
                _editorStatus.Text = "";
                _recoveries.Visible = false;
                _resume.Enabled = false; _pause.Enabled = false; _deliver.Enabled = false; _cancelDelivery.Visible = false;
                return;
            }
            _recoveries.Visible = _session?.RecoveryDirectory is not null;
            _recoveryStatus.Text = _session?.RecoveryStatus ?? "";
            _editorStatus.Text = _session?.EditorPresence switch
            {
                DrawingPresence.Open => "Dibujo abierto",
                DrawingPresence.Closed => "Dibujo cerrado; los pendientes y las recuperaciones siguen protegidos.",
                _ => "Comprobando estado del editor. Guardar como requiere vincular la nueva copia en Recuperaciones."
            };
            if (_session?.EditorPresence == DrawingPresence.Open) _closedHandled = false;
            if (_session?.EditorPresence == DrawingPresence.Closed && !_closedHandled && !_session.HasEditorLock && _operation is null)
            {
                _closedHandled = true;
                _ = FlushClosedDrawingAsync();
            }
            if (_session?.RecoveryDelivered == true)
            {
                _status.Text = "Recuperación entregada. Cierre el dibujo anterior y vuelva a abrirlo desde la web para continuar.";
                _resume.Enabled = false;
                return;
            }
            if (_operation is null && _session?.LastSyncError is { } error)
            { _status.Text = error + " La copia pendiente se conserva; pulse Reanudar."; _resume.Enabled = true; }
            else if (_operation is null && _session?.IsSynchronizing == false && _session.LastSyncedAt is { } saved)
                _status.Text = _session.SourcePublicationPending
                    ? "Versión guardada; el servidor está actualizando la copia visible en la tarea."
                    : $"Guardado en Dhyrium a las {saved:HH:mm:ss}. Puede seguir trabajando en AutoCAD.";
        };
        _statusTimer.Start();
    }

    private void OnProgress(TransferProgress progress)
    {
        var now = Environment.TickCount64;
        if (now - Interlocked.Read(ref _lastProgressTicks) < 150 && progress.CompletedBytes != progress.TotalBytes) return;
        Interlocked.Exchange(ref _lastProgressTicks, now);
        if (IsDisposed || !IsHandleCreated) return;
        BeginInvoke(() => {
            if (IsDisposed) return;
            _progress.Value = progress.TotalBytes > 0 ? (int)Math.Clamp(progress.CompletedBytes * 1000 / progress.TotalBytes, 0, 1000) : 0;
            _status.Text = $"{progress.Phase}: {progress.CompletedBytes / 1024d / 1024:F1} / {progress.TotalBytes / 1024d / 1024:F1} MB";
        });
    }

    private async Task RunOperationAsync()
    {
        if (_operation is not null) return;
        _operation = new CancellationTokenSource();
        _pause.Enabled = true; _resume.Enabled = false; _deliver.Enabled = false;
        try
        {
            var cancellationToken = _operation.Token;
            await Task.Run(async () =>
            {
                if (_session is null)
                {
                    var token = _vault.Read(_settings.ServerUrl) ?? throw new UnauthorizedAccessException("Inicie sesión en Dhyrium Desktop.");
                    // Retain the redeemed request for retries: the launch ticket is single-use.
                    _request ??= await _api.RedeemDesktopLaunchAsync(_launch.Ticket, token, cancellationToken);
                    BeginInvoke(() => _file.Text = _request.FileName);
                    var service = new ConnectorService(_settings, _api, _vault, _launcher);
                    _session = await service.OpenDocumentAsync(_request, cancellationToken, !_resumeOnly);
                }
                else if (_packagePath is not null) await _session.DeliverMapPackageAsync(_packagePath, cancellationToken);
                else if (!_session.IsMapPackage) await _session.SyncNowAsync(cancellationToken);
            }, cancellationToken);
            _file.Text = _request?.FileName ?? "Archivo";
            _status.Text = _packagePath is not null ? "Nueva versión guardada en Dhyrium." : "Archivo preparado y abierto con la aplicación de Windows.";
            if (_session!.SourcePublicationPending) _status.Text = "Versión guardada. El servidor está actualizando la copia visible en la tarea; se reintentará automáticamente.";
            _packagePath = null;
            _instructions.Text = _session!.IsReadOnly
                ? $"Este archivo lo tiene abierto para editar {_session.LockedByName ?? "otra persona"}. Se abrió en modo solo lectura; cierre y vuelva a abrirlo desde la web cuando esté libre para editar."
                : _session.IsMapPackage
                ? "ArcMap extrae el paquete para editarlo. Para entregar cambios, genere un nuevo .mpk desde ArcMap y pulse «Entregar paquete actualizado». Guardar el mapa extraído no actualiza el paquete original."
                : "Pulse Guardar en su aplicación: Desktop enviará los cambios sin esperar a que la cierre. " +
                    (_managed ? "Puede ocultar esta ventana: Desktop continúa en la bandeja." : "Mantenga esta ventana abierta.");
            _folder.Enabled = true;
            _progress.Value = 1000;
        }
        catch (OperationCanceledException) { _status.Text = "Transferencia pausada. Los datos recibidos se conservan para reanudar."; _resume.Enabled = true; }
        catch (Exception error) { _status.Text = error.Message; _resume.Enabled = true; }
        finally
        {
            _operation.Dispose(); _operation = null;
            _pause.Enabled = false;
            _deliver.Enabled = _session?.IsMapPackage == true && _session?.IsReadOnly == false && _packagePath is null;
            _cancelDelivery.Visible = _session is not null && _resume.Enabled;
        }
    }

    private async void OnClosing(object? sender, FormClosingEventArgs args)
    {
        if (_closing) return;
        if (_managed && args.CloseReason == CloseReason.UserClosing) { args.Cancel = true; Hide(); return; }
        args.Cancel = true;
        _closing = true;
        _operation?.Cancel();
        while (_operation is not null) await Task.Delay(50);
        _statusTimer.Stop();
        if (_session is not null) await _session.DisposeAsync();
        _http.Dispose();
        Close();
    }

    internal DocumentTransferForm(ConnectorSettings settings, ITokenVault vault, DesktopDocumentOpenRequest request, bool resumeOnly)
        : this(settings, vault, new DesktopLaunchRequest(""))
    {
        _request = request; _managed = true; _resumeOnly = resumeOnly;
        ClientSize = new Size(680, 440);
    }

    internal async Task ReopenAsync(DesktopDocumentOpenRequest request)
    {
        Show(); WindowState = FormWindowState.Normal; Activate();
        // A launch can arrive while a persisted session is still being prepared.
        // Queue it instead of losing that launch or creating a second form.
        while (_operation is not null) await Task.Delay(100);
        if (_session is null) { _resumeOnly = false; await RunOperationAsync(); return; }
        if (_resumeOnly)
        {
            var deadline = DateTime.UtcNow.AddSeconds(30);
            while (_session.EditorPresence == DrawingPresence.Unknown && DateTime.UtcNow < deadline) await Task.Delay(250);
        }
        // DrawingPresence is only tracked for .dwg (AutoCAD/Civil 3D autosave
        // monitoring); every other document type stays "Unknown" forever, so
        // gating on it here would block reopening Word/Excel/PDF files even
        // after they were genuinely closed. For those, the Office/AutoCAD
        // lock-file check (HasEditorLock) is the only signal we have — and is
        // reliable on its own. Unknown is deliberately conservative only for
        // .dwg: never open a second working copy of a drawing.
        var isDwg = Path.GetExtension(_session.LocalFilePath).Equals(".dwg", StringComparison.OrdinalIgnoreCase);
        var stillOpen = isDwg
            ? (_session.EditorPresence != DrawingPresence.Closed || _session.HasEditorLock)
            : _session.HasEditorLock;
        if (!_session.IsMapPackage && stillOpen)
        {
            _editorStatus.Text = "Sesión existente. Si el archivo se cerró, espere a que Desktop confirme su estado.";
            return;
        }
        try
        {
            if (!_session.IsMapPackage && !_session.RecoveryDelivered)
            {
                var uploaded = await _session.SyncNowAsync();
                if (_session.HasPendingChanges) throw new IOException("Hay cambios pendientes. Se conserva la copia actual hasta confirmar su envío.");
                // A flush can advance the server beyond the already redeemed launch.
                if (uploaded) request = _session.CurrentRequest;
            }
            await _session.DisposeAsync(); _session = null;
            _request = request; _resumeOnly = false;
            await RunOperationAsync();
        }
        catch (Exception error) { _status.Text = error.Message; }
    }

    internal async Task StopAsync()
    {
        _managed = false; _closing = true;
        _operation?.Cancel();
        while (_operation is not null) await Task.Delay(50);
        _statusTimer.Stop();
        if (_session is not null) await _session.DisposeAsync();
        _http.Dispose(); Close(); Dispose();
    }

    private async Task FlushClosedDrawingAsync()
    {
        try
        {
            if (_session is not null) await _session.SyncNowAsync();
            SessionLog.Write(_settings.CacheRoot, _request?.DocumentId ?? "session", "drawing-closed");
        }
        catch (Exception error)
        {
            if (!IsDisposed) _status.Text = "Dibujo cerrado con cambios pendientes: " + error.Message;
            SessionLog.Write(_settings.CacheRoot, _request?.DocumentId ?? "session", "close-flush-pending", error);
        }
    }
}
