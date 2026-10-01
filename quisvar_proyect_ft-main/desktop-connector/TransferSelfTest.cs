using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;

namespace Dhyrium.Desktop.Connector;

public static class TransferSelfTest
{
    public static async Task RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), "Dhyrium-Transfer-Test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var bytes = RandomNumberGenerator.GetBytes(256 * 1024);
            var hash = Convert.ToHexString(SHA256.HashData(bytes));
            var request = new DesktopDocumentOpenRequest(Guid.NewGuid().ToString(), Guid.NewGuid().ToString(), "map.mpk", "/content", "/versions", bytes.Length, hash);
            using var cancellation = new CancellationTokenSource();
            using var handler = new RangeHandler(bytes, cancellation);
            using var http = new HttpClient(handler);
            var api = new DhyriumApiClient(http, "http://localhost");
            var destination = Path.Combine(root, "map.mpk");
            try { await api.DownloadDocumentContentAsync(request, destination, "test", cancellation.Token); throw new Exception("No se pausó la descarga."); }
            catch (OperationCanceledException) { }
            var partial = destination + $".{request.VersionId}.download";
            if (!File.Exists(partial) || new FileInfo(partial).Length != 64 * 1024) throw new Exception("No se conservó el prefijo descargado.");
            await api.DownloadDocumentContentAsync(request, destination, "test");
            if (handler.LastOffset != 64 * 1024 || DhyriumProtocol.HashFile(destination) != hash) throw new Exception("La reanudación no conservó la integridad.");
            var count = handler.Count;
            await api.DownloadDocumentContentAsync(request, destination, "test");
            if (handler.Count != count) throw new Exception("La copia verificada se descargó otra vez.");
            var corrupted = request with { ChecksumSha256 = new string('0', 64) };
            try { await api.DownloadDocumentContentAsync(corrupted, Path.Combine(root, "bad.mpk"), "test"); throw new Exception("Se aceptó una huella incorrecta."); }
            catch (InvalidDataException) { }
            if (File.Exists(Path.Combine(root, "bad.mpk"))) throw new Exception("Se publicó un archivo corrupto.");
            var snapshot = Path.Combine(root, "cancel.snapshot");
            await File.WriteAllTextAsync(snapshot, "pending");
            await File.WriteAllTextAsync(snapshot + ".transfer.json", "{}");
            await api.CancelPendingUploadAsync(request, snapshot, "test");
            if (File.Exists(snapshot) || !File.Exists(destination)) throw new Exception("Cancelar no debe borrar el archivo original.");
            Console.WriteLine("Prueba correcta: pausa, reanudación, caché y rechazo de huella incorrecta.");
        }
        finally { Directory.Delete(root, recursive: true); }
    }

    private sealed class RangeHandler(byte[] bytes, CancellationTokenSource cancellation) : HttpMessageHandler
    {
        public long LastOffset { get; private set; }
        public int Count { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Count++;
            LastOffset = request.Headers.Range?.Ranges.First().From ?? 0;
            if (Count == 1) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(new PausedStream(bytes, cancellation)) });
            var response = new HttpResponseMessage(LastOffset > 0 ? HttpStatusCode.PartialContent : HttpStatusCode.OK)
            { Content = new ByteArrayContent(bytes, (int)LastOffset, bytes.Length - (int)LastOffset) };
            if (LastOffset > 0) response.Content.Headers.ContentRange = new ContentRangeHeaderValue(LastOffset, bytes.Length - 1, bytes.Length);
            return Task.FromResult(response);
        }
    }

    private sealed class PausedStream(byte[] bytes, CancellationTokenSource cancellation) : MemoryStream(bytes)
    {
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken token = default)
        {
            if (Position >= 64 * 1024) { cancellation.Cancel(); throw new OperationCanceledException(cancellation.Token); }
            return base.ReadAsync(buffer[..Math.Min(buffer.Length, 64 * 1024)], token);
        }
    }
}
