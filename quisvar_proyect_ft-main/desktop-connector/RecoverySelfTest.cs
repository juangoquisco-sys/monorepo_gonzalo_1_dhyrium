using System.Text;

namespace Dhyrium.Desktop.Connector;

internal static class RecoverySelfTest
{
    public static async Task RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), "Dhyrium-Recovery-Test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var autosave = Path.Combine(root, "plano.sv$");
            var copies = Path.Combine(root, "copies");
            await File.WriteAllTextAsync(autosave, "AC1032-cambios sin guardar");
            var originalHash = DhyriumProtocol.HashFile(autosave);
            string captured;
            await using (var editor = new FileStream(autosave, FileMode.Open, FileAccess.ReadWrite, FileShare.ReadWrite))
                captured = await AutoCadRecoveryMonitor.CaptureAsync(autosave, copies, CancellationToken.None);
            File.Delete(autosave); // Simulate cleanup/crash: durable copy survives.
            if (!File.Exists(captured) || DhyriumProtocol.HashFile(captured) != originalHash)
                throw new Exception("No se conservó el autoguardado completo tras desaparecer el original.");
            await File.WriteAllTextAsync(autosave, "AC1032-cambios sin guardar");
            await AutoCadRecoveryMonitor.CaptureAsync(autosave, copies, CancellationToken.None);
            if (Directory.GetFiles(copies, "*.dwg").Length != 1) throw new Exception("Una copia idéntica se duplicó.");
            await File.WriteAllTextAsync(autosave, "archivo incompleto");
            try { await AutoCadRecoveryMonitor.CaptureAsync(autosave, copies, CancellationToken.None); throw new Exception("Se aceptó un archivo sin encabezado DWG."); }
            catch (InvalidDataException) { }
            if (Directory.GetFiles(copies, "*.capturing*").Length != 0) throw new Exception("Quedaron capturas parciales.");
            await File.WriteAllTextAsync(autosave, "AC1032-contenido inicial");
            var changing = StableFileSnapshot.CreateAsync(autosave, Path.Combine(root, "unstable"), CancellationToken.None);
            await Task.Delay(150);
            await File.WriteAllTextAsync(autosave, "AC1032-contenido cambiado durante la captura");
            try { await changing; throw new Exception("Se aceptó una captura que cambió durante la copia."); }
            catch (IOException) { }
            if (File.Exists(Path.Combine(root, "unstable"))) throw new Exception("Se publicó una captura inestable.");
            Console.WriteLine("Prueba correcta: autoguardado persistente, deduplicación, archivo abierto y rechazo de captura inestable.");
        }
        finally { Directory.Delete(root, true); }
    }
}
