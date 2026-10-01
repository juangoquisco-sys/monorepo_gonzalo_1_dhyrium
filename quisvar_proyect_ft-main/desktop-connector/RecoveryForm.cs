using System.Diagnostics;

namespace Dhyrium.Desktop.Connector;

internal sealed class RecoveryForm : Form
{
    private sealed record Item(string Label, string Path, RecoveryEntry? Remote)
    { public override string ToString() => Label; }
    private readonly ListBox _list = new() { Dock = DockStyle.Fill };
    private readonly Label _status = new() { Dock = DockStyle.Top, Height = 65, Text = "Estas copias conservan el autoguardado sin reemplazar el plano publicado. Abra una copia y valídela con AutoCAD antes de usarla." };
    private readonly Button _open = new() { Text = "Abrir copia", AutoSize = true };
    private readonly CancellationTokenSource _stop = new();

    public RecoveryForm(OpenedDocumentSession session, DesktopDocumentOpenRequest request, DhyriumApiClient api, Func<string> token)
    {
        Text = "Recuperaciones de AutoCAD — " + request.FileName;
        ClientSize = new Size(740, 360); StartPosition = FormStartPosition.CenterParent;
        Font = new Font("Segoe UI", 10);
        var actions = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 50 };
        var refresh = new Button { Text = "Actualizar", AutoSize = true };
        var select = new Button { Text = "Seleccionar autoguardado…", AutoSize = true };
        var deliver = new Button { Text = "Entregar DWG revisado…", AutoSize = true };
        actions.Height = 85;
        actions.Controls.AddRange([_open, refresh, select, deliver]);
        Controls.Add(_list); Controls.Add(_status); Controls.Add(actions);
        var directory = session.RecoveryDirectory!;
        async Task LoadCopies()
        {
            refresh.Enabled = false;
            _list.Items.Clear();
            var local = Directory.GetFiles(directory, "*.dwg");
            foreach (var path in local.OrderByDescending(File.GetLastWriteTimeUtc))
                _list.Items.Add(new Item($"Local — {File.GetLastWriteTime(path):dd/MM/yyyy HH:mm:ss} — {new FileInfo(path).Length / 1048576d:F1} MB", path, null));
            try
            {
                var remote = await api.ListRecoveriesAsync(request.DocumentId, token(), _stop.Token);
                foreach (var entry in remote)
                    _list.Items.Add(new Item($"Servidor — {entry.CreatedAt.ToLocalTime():dd/MM/yyyy HH:mm:ss} — {entry.SizeBytes / 1048576d:F1} MB",
                        Path.Combine(directory, entry.Checksum + ".dwg"), entry));
            }
            catch (Exception error) { if (!IsDisposed) _status.Text = "Las copias locales siguen disponibles. " + error.Message; }
            finally { if (!IsDisposed) refresh.Enabled = true; }
        }
        Shown += async (_, _) => await LoadCopies();
        refresh.Click += async (_, _) => await LoadCopies();
        select.Click += (_, _) =>
        {
            using var picker = new OpenFileDialog { Title = "Seleccione el .sv$ o .bak correspondiente a " + request.FileName,
                Filter = "Recuperación de AutoCAD (*.sv$;*.bak)|*.sv$;*.bak", CheckFileExists = true };
            if (picker.ShowDialog(this) == DialogResult.OK)
            {
                session.SelectAutosaveSource(picker.FileName);
                _status.Text = "Desktop conservará y enviará las modificaciones del autoguardado seleccionado. Pulse Actualizar para ver las copias.";
            }
        };
        _open.Click += async (_, _) =>
        {
            if (_list.SelectedItem is not Item item) return;
            _open.Enabled = false;
            try
            {
                if (item.Remote is not null) await api.DownloadRecoveryAsync(request, item.Remote, item.Path, token(), _stop.Token);
                // Open a working copy: the immutable recovery is never edited.
                var working = Path.Combine(directory, "abiertas"); Directory.CreateDirectory(working);
                var target = Path.Combine(working, DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..6] + "-" + request.FileName);
                File.Copy(item.Path, target);
                Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
                _status.Text = "Copia abierta para revisar. Se conserva el respaldo original. Esta copia no se publica automáticamente en la tarea.";
            }
            catch (Exception error) { if (!IsDisposed) _status.Text = error.Message; }
            finally { if (!IsDisposed) _open.Enabled = true; }
        };
        deliver.Click += async (_, _) =>
        {
            using var picker = new OpenFileDialog { Title = "Entregar como nueva versión: seleccione el DWG recuperado, revisado y guardado", Filter = "Dibujo AutoCAD (*.dwg)|*.dwg", CheckFileExists = true };
            if (picker.ShowDialog(this) != DialogResult.OK) return;
            deliver.Enabled = false;
            try
            {
                await Task.Run(() => session.DeliverRecoveredDrawingAsync(picker.FileName, _stop.Token), _stop.Token);
                if (!IsDisposed) _status.Text = "Recuperación entregada como nueva versión. Cierre el dibujo anterior y vuelva a abrir el archivo desde la web para continuar.";
            }
            catch (Exception error) { if (!IsDisposed) { _status.Text = error.Message; deliver.Enabled = true; } }
        };
        FormClosing += (_, _) => _stop.Cancel();
    }
}
