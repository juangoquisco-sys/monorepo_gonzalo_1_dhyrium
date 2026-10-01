using System.Text;

namespace Dhyrium.Desktop.Connector;

internal static class SessionSelfTest
{
    internal sealed class TestObserver : ICadObserver
    {
        public DrawingPresence Presence { get; set; }
        public string? Source { get; set; }
        public string Status => "Observador de prueba";
        public void Dispose() { }
    }

    private static void Check(bool condition, string message)
    { if (!condition) throw new Exception("Sesiones: " + message); }

    public static async Task RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), "Dhyrium-Sessions-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var n = 0;
            using var observer = new AutoCadAutosaveLocator(Path.Combine(root, "plano.dwg"), () =>
            {
                n++;
                if (n <= 3) throw new InvalidOperationException("Could not get dispatch ID for FullName");
                if (n == 4) return new(DrawingPresence.Open, Path.Combine(root, "plano.sv$"), 10, "Identificado");
                if (n == 5) throw new System.Runtime.InteropServices.COMException("Busy", unchecked((int)0x80010001));
                return new(DrawingPresence.Closed, null, null, "Cerrado");
            }, false);
            for (var i = 0; i < 3; i++) Check(!observer.ObserveOnce(), "error transitorio debía reintentarse");
            Check(observer.ObserveOnce() && observer.Presence == DrawingPresence.Open, "no recuperó el detector");
            var source = observer.Source;
            Check(!observer.ObserveOnce() && observer.Source == source, "perdió la ruta anterior tras un rechazo COM");
            Check(!observer.ObserveOnce(), "cerró sin confirmar dos observaciones");
            Check(observer.ObserveOnce() && observer.Presence == DrawingPresence.Closed, "no confirmó el cierre");

            var settings = new ConnectorSettings("http://dhyrium.local", root);
            Check(SessionIdentity.Scope(settings, "1") != SessionIdentity.Scope(settings, "2"), "mezcló cuentas");
            Check(SessionIdentity.Scope(settings, "1") != SessionIdentity.Scope(settings with { ServerUrl = "http://otro.local" }, "1"), "mezcló servidores");
            var accountVault = new InMemoryTokenVault();
            string Token(int id) => "e30." + Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"id\":" + id + "}")).TrimEnd('=').Replace('+', '-').Replace('/', '_') + ".signature";
            accountVault.Save(settings.ServerUrl, Token(1));
            var guarded = new AccountTokenVault(accountVault, "1"); Check(guarded.Read(settings.ServerUrl) is not null, "rechazó su cuenta");
            accountVault.Save(settings.ServerUrl, Token(2));
            try { guarded.Read(settings.ServerUrl); throw new Exception("Permitió cambio de cuenta"); } catch (UnauthorizedAccessException) { }

            var handler = new SelfTest.FakeDhyriumHandler(); using var http = new HttpClient(handler);
            var api = new DhyriumApiClient(http, settings.ServerUrl);
            var vault = new InMemoryTokenVault(); vault.Save(settings.ServerUrl, SelfTest.FakeDhyriumHandler.TestToken);
            var request = await api.RedeemDesktopLaunchAsync(SelfTest.FakeDhyriumHandler.TestTicket, SelfTest.FakeDhyriumHandler.TestToken);
            var changedVersion = request with { VersionId = SelfTest.FakeDhyriumHandler.SecondVersionId,
                ContentPath = $"/desktop/documents/{request.DocumentId}/versions/{SelfTest.FakeDhyriumHandler.SecondVersionId}/content" };
            string path;
            await using (var first = new ManagedDocumentWorkspace(settings, api, vault, request, observer: new TestObserver()))
            {
                path = await first.PrepareAsync();
                await using var duplicate = new ManagedDocumentWorkspace(settings, api, vault, changedVersion, observer: new TestObserver());
                try { await duplicate.PrepareAsync(); throw new Exception("Abrió dos sesiones para versiones distintas"); } catch (IOException) { }
                await File.AppendAllTextAsync(path, " pendiente sin red");
                handler.ConflictUploads = true;
                try { await first.SyncNowAsync(); throw new Exception("Aceptó conflicto"); } catch (InvalidOperationException) { }
                Check(File.Exists(path + ".upload-snapshot"), "perdió snapshot pendiente");
            }
            await using (var resumed = new ManagedDocumentWorkspace(settings, api, vault, request, false, new TestObserver()))
            {
                Check(await resumed.PrepareAsync() == path, "cambió ruta al reiniciar");
                Check(File.ReadAllText(path).Contains("pendiente sin red"), "sobrescribió pendiente al reiniciar");
                handler.ConflictUploads = false;
                await resumed.SyncNowAsync();
                Check(handler.UploadCount == 1 && !resumed.HasPendingChanges, "no reanudó el pendiente");
            }
            // An old persisted manifest must never refresh a newly saved file backwards.
            await using (var resumed = new ManagedDocumentWorkspace(settings, api, vault, request, false, new TestObserver()))
            {
                await resumed.PrepareAsync();
                Check(File.ReadAllText(path).Contains("pendiente sin red"), "restauró una versión antigua sobre un guardado confirmado");
            }
            var newest = request with { VersionId = SelfTest.FakeDhyriumHandler.ThirdVersionId,
                ContentPath = $"/desktop/documents/{request.DocumentId}/versions/{SelfTest.FakeDhyriumHandler.ThirdVersionId}/content" };
            await using (var refreshed = new ManagedDocumentWorkspace(settings, api, vault, newest, true, new TestObserver()))
            {
                Check(await refreshed.PrepareAsync() == path, "cambió la ruta al actualizar la cabeza");
                Check(File.ReadAllText(path) == SelfTest.FakeDhyriumHandler.InitialContent, "no descargó la cabeza autorizada");
                Check(Directory.GetFiles(Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(path))!, "versions"), "*.dwg", SearchOption.AllDirectories).Length == 1,
                    "no conservó la copia anterior al actualizar");
                var recovered = Path.Combine(root, "recuperado.dwg"); await File.WriteAllTextAsync(recovered, "AC1032-recuperado");
                await refreshed.DeliverRecoveredDrawingAsync(recovered, CancellationToken.None);
            }
            await using (var restoredRecovery = new ManagedDocumentWorkspace(settings, api, vault, newest, false, new TestObserver()))
            {
                await restoredRecovery.PrepareAsync();
                Check(restoredRecovery.RecoveryDelivered && !await restoredRecovery.SyncNowAsync(), "un reinicio sobrescribió la recuperación entregada");
            }
            Console.WriteLine("Prueba correcta: exclusión entre versiones, cuenta/servidor, conflictos, reinicio y recuperación del detector COM.");
        }
        finally { Directory.Delete(root, true); }
    }
}
