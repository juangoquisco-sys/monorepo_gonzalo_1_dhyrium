using System.IO.Pipes;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

namespace Dhyrium.Desktop.Connector;

internal sealed class DesktopCoordinator : ApplicationContext
{
    private readonly Control _dispatch = new();
    private readonly NotifyIcon _tray;
    private readonly Dictionary<string, DocumentTransferForm> _documents = new();
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly CancellationTokenSource _stop = new();
    private readonly System.Windows.Forms.Timer _restoreTimer = new() { Interval = 30000 };
    private readonly string _pipeName;
    private readonly ConnectorSettings? _testSettings;
    private readonly ITokenVault _vault;
    private ConnectorSettings? LoadSettings() => _testSettings ?? new ConnectorSettingsStore().Load();
    private DesktopLoginForm? _login;
    private sealed record ResumeEntry(string Account, DesktopDocumentOpenRequest Request);

    public static int Run(string? uri, ConnectorSettings? testSettings = null, ITokenVault? testVault = null)
    {
        if (testSettings is not null && !new Uri(testSettings.ServerUrl).IsLoopback)
            throw new InvalidOperationException("Las pruebas requieren un servidor local aislado.");
        var sid = WindowsIdentity.GetCurrent().User?.Value ?? throw new InvalidOperationException("No se pudo identificar el usuario de Windows.");
        var name = "DhyriumDesktop033-" + SessionIdentity.Hash(sid);
        if (testSettings is not null) name += "-test-" + SessionIdentity.Hash(testSettings.CacheRoot);
        using var owner = new Mutex(false, @"Local\" + name);
        bool first;
        try { first = owner.WaitOne(0); }
        catch (AbandonedMutexException) { first = true; }
        if (!first)
        {
            using var pipe = new NamedPipeClientStream(".", name, PipeDirection.InOut, PipeOptions.CurrentUserOnly);
            pipe.Connect(10000);
            using var writer = new StreamWriter(pipe, Encoding.UTF8, leaveOpen: true) { AutoFlush = true };
            writer.WriteLine(uri ?? "login");
            using var reader = new StreamReader(pipe, Encoding.UTF8, leaveOpen: true);
            if (reader.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult() != "queued")
                throw new IOException("Desktop no confirmó la apertura. Inténtelo nuevamente.");
            return 0;
        }
        try { Application.Run(new DesktopCoordinator(name, uri, testSettings, testVault)); }
        finally { owner.ReleaseMutex(); }
        return 0;
    }

    private DesktopCoordinator(string pipeName, string? uri, ConnectorSettings? testSettings, ITokenVault? testVault)
    {
        _testSettings = testSettings; _vault = testVault ?? new WindowsCredentialVault();
        _pipeName = pipeName; _dispatch.CreateControl();
        _tray = new NotifyIcon { Icon = System.Drawing.SystemIcons.Application, Text = "Dhyrium Desktop 0.3.3", Visible = true };
        var menu = new ContextMenuStrip();
        menu.Items.Add("Mostrar documentos", null, (_, _) => { foreach (var form in _documents.Values) { form.Show(); form.Activate(); } });
        menu.Items.Add("Iniciar sesión", null, (_, _) => ShowLogin());
        menu.Items.Add("Salir y conservar pendientes", null, async (_, _) => await StopAsync());
        _tray.ContextMenuStrip = menu;
        _tray.DoubleClick += (_, _) => { if (_documents.Count == 0) ShowLogin(); else foreach (var form in _documents.Values) form.Show(); };
        _ = ListenAsync();
        _restoreTimer.Tick += async (_, _) => await RestoreAsync(); _restoreTimer.Start();
        _dispatch.BeginInvoke(async () => { await RestoreAsync(); if (uri is null) ShowLogin(); else await OpenAsync(uri); });
    }

    private void ShowLogin()
    {
        if (_login is null || _login.IsDisposed) _login = new DesktopLoginForm();
        _login.Show(); _login.Activate();
    }

    private async Task ListenAsync()
    {
        while (!_stop.IsCancellationRequested)
        {
            try
            {
                await using var pipe = new NamedPipeServerStream(_pipeName, PipeDirection.InOut, 1,
                    PipeTransmissionMode.Byte, PipeOptions.Asynchronous | PipeOptions.CurrentUserOnly);
                await pipe.WaitForConnectionAsync(_stop.Token);
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(_stop.Token); timeout.CancelAfter(TimeSpan.FromSeconds(5));
                using var reader = new StreamReader(pipe, Encoding.UTF8, leaveOpen: true);
                var chars = new char[1]; var message = new StringBuilder();
                while (message.Length <= 4096 && await reader.ReadAsync(chars.AsMemory(), timeout.Token) != 0)
                { if (chars[0] == '\n') break; if (chars[0] != '\r') message.Append(chars[0]); }
                if (message.Length > 4096) continue;
                var uri = message.ToString();
                if (uri != "login") DhyriumProtocol.ParseDesktopLaunchRequest(uri);
                _dispatch.BeginInvoke(async () => { if (uri == "login") ShowLogin(); else await OpenAsync(uri); });
                using var writer = new StreamWriter(pipe, Encoding.UTF8, leaveOpen: true) { AutoFlush = true };
                await writer.WriteLineAsync("queued");
            }
            catch (OperationCanceledException) { }
            catch (Exception error) { SessionLog.Write(ConnectorSettings.Create("http://localhost").CacheRoot, "coordinator", "ipc-error", error); }
        }
    }

    private async Task OpenAsync(string uri)
    {
        await _gate.WaitAsync();
        try
        {
            var settings = LoadSettings() ?? throw new InvalidOperationException("Inicie sesión en Desktop.");
            var token = _vault.Read(settings.ServerUrl) ?? throw new UnauthorizedAccessException("Inicie sesión en Desktop.");
            var account = SessionIdentity.Account(token);
            using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(4) };
            var request = await new DhyriumApiClient(http, settings.ServerUrl).RedeemDesktopLaunchAsync(DhyriumProtocol.ParseDesktopLaunchRequest(uri).Ticket, token);
            var scoped = SessionIdentity.Scope(settings, account);
            var key = scoped.CacheRoot + "|" + request.DocumentId;
            if (_documents.TryGetValue(key, out var existing)) { await existing.ReopenAsync(request); return; }
            await Task.Run(() => InspectLegacy(settings, request));
            Persist(scoped, new ResumeEntry(account, request));
            Add(scoped, account, request, false);
        }
        catch (Exception error) { MessageBox.Show(error.Message, "Dhyrium Desktop", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        finally { _gate.Release(); }
    }

    private void Add(ConnectorSettings scoped, string account, DesktopDocumentOpenRequest request, bool resumeOnly)
    {
        var key = scoped.CacheRoot + "|" + request.DocumentId;
        var form = new DocumentTransferForm(scoped, new AccountTokenVault(_vault, account), request, resumeOnly);
        _documents.Add(key, form);
        form.Show();
        if (resumeOnly) form.Hide();
        SessionLog.Write(scoped.CacheRoot, request.DocumentId, resumeOnly ? "session-resumed" : "session-opened");
    }

    private static void Persist(ConnectorSettings scoped, ResumeEntry entry)
    {
        var folder = Path.Combine(scoped.CacheRoot, "sessions"); Directory.CreateDirectory(folder);
        var file = Path.Combine(folder, SessionIdentity.Hash(entry.Request.DocumentId) + ".json");
        File.WriteAllText(file + ".tmp", JsonSerializer.Serialize(entry)); File.Move(file + ".tmp", file, true);
    }

    private async Task RestoreAsync()
    {
        if (!await _gate.WaitAsync(0)) return;
        try
        {
            var settings = LoadSettings(); if (settings is null) return;
            var token = _vault.Read(settings.ServerUrl); if (token is null) return;
            var account = SessionIdentity.Account(token); var scoped = SessionIdentity.Scope(settings, account);
            var folder = Path.Combine(scoped.CacheRoot, "sessions"); if (!Directory.Exists(folder)) return;
            foreach (var file in Directory.GetFiles(folder, "*.json"))
            {
                try
                {
                    var entry = JsonSerializer.Deserialize<ResumeEntry>(await File.ReadAllTextAsync(file));
                    if (entry is null || entry.Account != account || _documents.ContainsKey(scoped.CacheRoot + "|" + entry.Request.DocumentId)) continue;
                    // Authorization is rechecked by the server before starting any recovered watcher.
                    using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
                    await new DhyriumApiClient(http, scoped.ServerUrl).AuthorizeResumeAsync(entry.Request, token);
                    Add(scoped, account, entry.Request, true);
                }
                catch (Exception error) { SessionLog.Write(scoped.CacheRoot, "resume", "resume-pending", error); }
            }
        }
        catch (Exception error) { SessionLog.Write(ConnectorSettings.Create("http://localhost").CacheRoot, "resume", "resume-pending", error); }
        finally { _gate.Release(); }
    }

    private static void InspectLegacy(ConnectorSettings settings, DesktopDocumentOpenRequest request)
    {
        var folder = Path.Combine(settings.CacheRoot, "documents", SessionIdentity.Hash(request.DocumentId));
        if (!Directory.Exists(folder)) return;
        foreach (var file in Directory.GetFiles(folder, "*", SearchOption.AllDirectories).Where(p => Path.GetExtension(p).Equals(Path.GetExtension(request.FileName), StringComparison.OrdinalIgnoreCase)))
        {
            var locked = File.Exists(Path.ChangeExtension(file, ".dwl")) || File.Exists(Path.ChangeExtension(file, ".dwl2"));
            if (File.Exists(file + ".session.lock"))
            {
                try { using var handle = new FileStream(file + ".session.lock", FileMode.Open, FileAccess.ReadWrite, FileShare.None); }
                catch (IOException) { locked = true; }
            }
            var expected = request.ChecksumSha256;
            if (File.Exists(file + ".state.json"))
            {
                using var state = JsonDocument.Parse(File.ReadAllText(file + ".state.json"));
                if (state.RootElement.TryGetProperty("LastSyncedHash", out var hash)) expected = hash.GetString();
            }
            var clean = string.Equals(DhyriumProtocol.HashFile(file), expected, StringComparison.OrdinalIgnoreCase);
            if (locked || !clean || File.Exists(file + ".upload-snapshot"))
                throw new IOException("Hay una copia de Desktop anterior abierta o pendiente de revisión. Consérvela y revise esta carpeta antes de abrir otra sesión: " + folder);
        }
    }

    private async Task StopAsync()
    {
        _restoreTimer.Stop(); _stop.Cancel();
        await _gate.WaitAsync();
        try { foreach (var form in _documents.Values) await form.StopAsync(); _login?.Close(); _tray.Visible = false; _tray.Dispose(); ExitThread(); }
        finally { _gate.Release(); }
    }
}
