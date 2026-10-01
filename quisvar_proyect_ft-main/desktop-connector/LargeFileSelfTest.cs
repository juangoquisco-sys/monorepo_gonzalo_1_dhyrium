using System.Diagnostics;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public static class LargeFileSelfTest
{
    public sealed class TestVault : ITokenVault
    {
        public void Save(string serverUrl, string token) { }
        public string? Read(string serverUrl) => "local-integration-test";
        public void Delete(string serverUrl) { }
    }
    public sealed class TestLauncher : ILocalFileLauncher
    {
        public string? OpenedPath { get; private set; }
        public Process? Open(string localFilePath) { OpenedPath = localFilePath; return null; }
    }
    public static (ConnectorSettings Settings, DesktopLaunchRequest Launch, string Source, string Root) Load(string configPath, string cacheName)
    {
        using var json = JsonDocument.Parse(File.ReadAllText(configPath));
        var config = json.RootElement;
        var serverUrl = config.GetProperty("serverUrl").GetString()!;
        if (!new Uri(serverUrl).IsLoopback) throw new InvalidOperationException("La prueba requiere un servidor local aislado.");
        var root = config.GetProperty("root").GetString()!;
        return (new ConnectorSettings(serverUrl, Path.Combine(root, cacheName)), new DesktopLaunchRequest(config.GetProperty("ticket").GetString()!), config.GetProperty("source").GetString()!, root);
    }
    public static async Task RunAsync(string configPath)
    {
        var config = Load(configPath, "client-cache");
        using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(15) };
        var api = new DhyriumApiClient(http, config.Settings.ServerUrl);
        var launcher = new TestLauncher();
        var started = Stopwatch.StartNew();
        long lastReport = 0;
        api.ProgressChanged += progress => {
            if (Environment.TickCount64 - lastReport > 1000)
            { lastReport = Environment.TickCount64; Console.WriteLine($"{progress.Phase}: {progress.CompletedBytes}/{progress.TotalBytes}"); }
        };
        var service = new ConnectorService(config.Settings, api, new TestVault(), launcher);
        await using var session = await service.OpenDocumentAsync(config.Launch);
        if (launcher.OpenedPath != session.LocalFilePath || !session.IsMapPackage) throw new Exception("El MPK no se preparó.");
        if (await session.SyncNowAsync()) throw new Exception("Un MPK no debe usar guardado automático.");
        await session.DeliverMapPackageAsync(config.Source);
        var results = await http.GetStringAsync(config.Settings.ServerUrl + "/results");
        using var json = JsonDocument.Parse(results);
        var data = json.RootElement;
        if (!data.GetProperty("resumed").GetBoolean() || !data.GetProperty("interruptedUpload").GetBoolean() ||
            data.GetProperty("checksumSha256").GetString() != data.GetProperty("uploadedHash").GetString() || data.GetProperty("uploadCount").GetInt32() != 1)
            throw new Exception("No pasó la prueba de integridad y reanudación.");
        var report = new { results = data.Clone(), clientPeakWorkingSet = Process.GetCurrentProcess().PeakWorkingSet64, elapsedSeconds = started.Elapsed.TotalSeconds,
            arcMapLaunched = false, originalModified = false };
        var output = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(Path.Combine(config.Root, "large-file-result.json"), output);
        Console.WriteLine(output);
    }
}
