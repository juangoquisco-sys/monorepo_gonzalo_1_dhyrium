using System.Net.Http.Headers;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public sealed record RecoveryEntry(string Checksum, long SizeBytes, DateTimeOffset CreatedAt, string BaseVersionId);

public sealed partial class DhyriumApiClient
{
    public async Task UploadRecoveryAsync(DesktopDocumentOpenRequest request, string path, string token, CancellationToken cancellationToken)
    {
        var checksum = DhyriumProtocol.HashFile(path).ToLowerInvariant();
        using var message = CreateAuthorizedRequest(HttpMethod.Put, $"desktop/documents/{request.DocumentId}/recoveries/{checksum}", token);
        message.Headers.Add("X-Base-Version-Id", request.VersionId);
        await using var source = File.OpenRead(path);
        message.Content = new StreamContent(source);
        message.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        using var response = await _httpClient.SendAsync(message, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
        if (json.RootElement.GetProperty("recovery").GetProperty("checksum").GetString() != checksum)
            throw new InvalidDataException("El servidor no confirmó la copia de recuperación enviada.");
    }

    public async Task<RecoveryEntry[]> ListRecoveriesAsync(string documentId, string token, CancellationToken cancellationToken)
    {
        using var message = CreateAuthorizedRequest(HttpMethod.Get, $"desktop/documents/{documentId}/recoveries", token);
        using var response = await _httpClient.SendAsync(message, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
        return JsonSerializer.Deserialize<RecoveryEntry[]>(json.RootElement.GetProperty("recoveries"),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
    }

    public async Task DownloadRecoveryAsync(DesktopDocumentOpenRequest document, RecoveryEntry recovery, string target, string token, CancellationToken cancellationToken)
    {
        if (recovery.Checksum.Length != 64 || !recovery.Checksum.All(Uri.IsHexDigit)) throw new InvalidDataException("Copia de recuperación inválida.");
        var request = document with { VersionId = recovery.Checksum, SizeBytes = recovery.SizeBytes, ChecksumSha256 = recovery.Checksum,
            ContentPath = $"desktop/documents/{document.DocumentId}/recoveries/{recovery.Checksum}/content" };
        await DownloadResumableAsync(request, target, token, cancellationToken);
    }
}
