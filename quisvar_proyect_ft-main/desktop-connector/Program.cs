using Dhyrium.Desktop.Connector;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 2 && args[0] == "--cad-observe")
        {
            // Also bound lifetime if the coordinator itself exits or crashes mid-call.
            using var deadline = new System.Threading.Timer(_ => Environment.Exit(2), null, 15000, Timeout.Infinite);
            try
            {
                using var observer = new AutoCadAutosaveLocator(args[1], start: false);
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(observer.ProbeInProcess())); return 0;
            }
            catch (Exception error)
            {
                SessionLog.Write(Path.GetDirectoryName(Path.GetFullPath(args[1]))!, "observer", "observer-failed", error);
                return 1;
            }
        }
        if (args.Length == 2 && args[0] == "--self-test-coordinator")
        {
            using var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(args[1]));
            var config = json.RootElement;
            var settings = new ConnectorSettings(config.GetProperty("serverUrl").GetString()!, config.GetProperty("root").GetString()!);
            var vault = new InMemoryTokenVault(); vault.Save(settings.ServerUrl, "e30.eyJpZCI6MX0.signature");
            ApplicationConfiguration.Initialize();
            try { return DesktopCoordinator.Run("dhyrium://open/document?ticket=" + config.GetProperty("ticket").GetString(), settings, vault); }
            catch (Exception error) { Console.Error.WriteLine(error); return 1; }
        }
        if (args.Length == 2 && args[0] == "--self-test-large-file")
        {
            try { LargeFileSelfTest.RunAsync(args[1]).GetAwaiter().GetResult(); return 0; }
            catch (Exception error) { Console.Error.WriteLine(error); return 1; }
        }
        if (args.Length == 2 && args[0] == "--self-test-transfer-ui")
        {
            ApplicationConfiguration.Initialize();
            var config = LargeFileSelfTest.Load(args[1], "ui-cache");
            Application.Run(new DocumentTransferForm(config.Settings, new LargeFileSelfTest.TestVault(), config.Launch, new LargeFileSelfTest.TestLauncher()));
            return 0;
        }
        if (args.Length == 0)
        {
            ApplicationConfiguration.Initialize();
            try { return DesktopCoordinator.Run(null); }
            catch (Exception error) { MessageBox.Show(error.Message, "Dhyrium Desktop"); return 1; }
        }
        if (args.Length == 2 && args[0].Equals("uri", StringComparison.OrdinalIgnoreCase))
        {
            ApplicationConfiguration.Initialize();
            try
            {
                DhyriumProtocol.ParseDesktopLaunchRequest(args[1]);
                return DesktopCoordinator.Run(args[1]);
            }
            catch (Exception error) { MessageBox.Show(error.Message, "Dhyrium Desktop", MessageBoxButtons.OK, MessageBoxIcon.Error); return 1; }
        }
        return CommandLine.RunAsync(args).GetAwaiter().GetResult();
    }
}
