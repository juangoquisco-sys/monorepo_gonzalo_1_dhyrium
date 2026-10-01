using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public sealed partial class DhyriumApiClient
{
    public async Task CancelPendingUploadAsync(DesktopDocumentOpenRequest request, string snapshot, string token)
    {
        var statePath = snapshot + ".transfer.json";
        if (request.TransferPath is not null && File.Exists(statePath))
        {
            using var state = JsonDocument.Parse(await File.ReadAllTextAsync(statePath));
            var id = state.RootElement.GetProperty("transferId").GetString();
            if (!Guid.TryParse(id, out _)) throw new InvalidDataException("Transferencia pendiente inválida.");
            using var delete = CreateAuthorizedRequest(HttpMethod.Delete, $"{request.TransferPath}/{id}", token);
            using var response = await _httpClient.SendAsync(delete);
            if (response.StatusCode != HttpStatusCode.NotFound) await EnsureSuccessAsync(response, CancellationToken.None);
        }
        File.Delete(statePath);
        File.Delete(snapshot);
    }
    public event Action<TransferProgress>? ProgressChanged;
    private void Report(string phase, long completed, long total) =>
        ProgressChanged?.Invoke(new TransferProgress(phase, completed, total));

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var message = response.StatusCode switch
        {
            HttpStatusCode.Unauthorized => "La sesión venció. Inicie sesión de nuevo en Dhyrium Desktop.",
            HttpStatusCode.Forbidden => "Su usuario no tiene permiso para acceder a este archivo.",
            HttpStatusCode.RequestEntityTooLarge => "El archivo supera el límite permitido por el servidor.",
            _ => $"El servidor respondió con el error {(int)response.StatusCode}.",
        };
        try
        {
            using var json = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
            if (json.RootElement.TryGetProperty("message", out var text) && !string.IsNullOrWhiteSpace(text.GetString()))
                message = text.GetString()!;
        }
        catch (JsonException) { }
        throw new HttpRequestException(message, null, response.StatusCode);
    }

    private async Task DownloadResumableAsync(DesktopDocumentOpenRequest request, string destinationPath, string token, CancellationToken cancellationToken)
    {
        if (request.SizeBytes <= 0 || request.SizeBytes > request.MaxFileBytes ||
            request.ChecksumSha256 is not { Length: 64 } || !request.ChecksumSha256.All(Uri.IsHexDigit))
            throw new InvalidOperationException("El servidor no devolvió tamaño y huella válidos del archivo.");
        Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);
        if (File.Exists(destinationPath))
        {
            Report("Comprobando copia local", 0, request.SizeBytes);
            if (new FileInfo(destinationPath).Length == request.SizeBytes &&
                string.Equals(DhyriumProtocol.HashFile(destinationPath), request.ChecksumSha256, StringComparison.OrdinalIgnoreCase))
            { Report("Copia local verificada", request.SizeBytes, request.SizeBytes); return; }
            throw new IOException("Hay una copia local con cambios. Se conservó para evitar sobrescribirla. Entregue o respalde esa copia antes de volver a descargar.");
        }
        var temporaryPath = destinationPath + $".{request.VersionId}.download";
        for (var attempt = 0; attempt < 4; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var offset = File.Exists(temporaryPath) ? new FileInfo(temporaryPath).Length : 0;
            if (offset > request.SizeBytes) { File.Delete(temporaryPath); offset = 0; }
            if (offset == request.SizeBytes) break;
            var drive = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(destinationPath))!);
            if (drive.AvailableFreeSpace < request.SizeBytes - offset + 64 * 1024 * 1024)
                throw new IOException("No hay espacio suficiente para descargar el archivo.");
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromMinutes(30));
                using var message = CreateAuthorizedRequest(HttpMethod.Get, request.ContentPath, token);
                if (offset > 0)
                {
                    message.Headers.Range = new RangeHeaderValue(offset, null);
                    message.Headers.IfRange = new RangeConditionHeaderValue(new EntityTagHeaderValue($"\"{request.ChecksumSha256}\""));
                }
                using var response = await _httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                await EnsureSuccessAsync(response, timeout.Token);
                if (response.StatusCode == HttpStatusCode.PartialContent)
                {
                    var range = response.Content.Headers.ContentRange;
                    if (range?.From != offset || range.Length != request.SizeBytes)
                        throw new InvalidDataException("El servidor devolvió un rango distinto del solicitado.");
                }
                else if (response.StatusCode == HttpStatusCode.OK) offset = 0;
                else throw new InvalidDataException("Respuesta de descarga inesperada.");
                await using var source = await response.Content.ReadAsStreamAsync(timeout.Token);
                await using var destination = new FileStream(temporaryPath, offset == 0 ? FileMode.Create : FileMode.Append,
                    FileAccess.Write, FileShare.None, 64 * 1024, true);
                var buffer = new byte[64 * 1024];
                Report("Descargando", offset, request.SizeBytes);
                while (true)
                {
                    var read = await source.ReadAsync(buffer, timeout.Token).AsTask().WaitAsync(TimeSpan.FromMinutes(2), timeout.Token);
                    if (read == 0) break;
                    if (offset + read > request.SizeBytes) throw new InvalidDataException("La descarga excedió el tamaño declarado.");
                    await destination.WriteAsync(buffer.AsMemory(0, read), timeout.Token);
                    offset += read;
                    Report("Descargando", offset, request.SizeBytes);
                }
                await destination.FlushAsync(timeout.Token);
                if (offset != request.SizeBytes) throw new IOException("La descarga quedó incompleta.");
                break;
            }
            catch (Exception error) when (attempt < 3 && !cancellationToken.IsCancellationRequested && IsTransient(error))
            { await Task.Delay(TimeSpan.FromSeconds(attempt + 1), cancellationToken); }
        }
        Report("Verificando integridad", request.SizeBytes, request.SizeBytes);
        if (!string.Equals(DhyriumProtocol.HashFile(temporaryPath), request.ChecksumSha256, StringComparison.OrdinalIgnoreCase))
        {
            File.Delete(temporaryPath);
            throw new InvalidDataException("La huella de la descarga no coincide. No se abrió el archivo; vuelva a intentarlo.");
        }
        File.Move(temporaryPath, destinationPath, overwrite: false);
        Report("Archivo verificado", request.SizeBytes, request.SizeBytes);
    }

    private static bool IsTransient(Exception error) => error is IOException or TimeoutException or TaskCanceledException ||
        error is HttpRequestException http && (http.StatusCode is null || (int)http.StatusCode >= 500 || http.StatusCode == HttpStatusCode.RequestTimeout);

    private async Task<DesktopUploadResult> UploadResumableAsync(DesktopDocumentOpenRequest request, string baseVersionId,
        string localFilePath, string token, CancellationToken cancellationToken)
    {
        // The caller supplies a stable snapshot, never the file currently being edited.
        var size = new FileInfo(localFilePath).Length;
        if (size <= 0 || size > request.MaxFileBytes) throw new IOException("El archivo está vacío o supera el límite configurado en el servidor.");
        Report("Verificando archivo para enviar", 0, size);
        var hash = DhyriumProtocol.HashFile(localFilePath).ToLowerInvariant();
        var statePath = localFilePath + ".transfer.json";
        string? transferId = null;
        if (File.Exists(statePath))
        {
            using var saved = JsonDocument.Parse(await File.ReadAllTextAsync(statePath, cancellationToken));
            if (saved.RootElement.GetProperty("checksum").GetString() == hash && saved.RootElement.GetProperty("baseVersionId").GetString() == baseVersionId)
                transferId = saved.RootElement.GetProperty("transferId").GetString();
        }
        JsonDocument? status = null;
        try
        {
            if (Guid.TryParse(transferId, out _))
            {
                using var get = CreateAuthorizedRequest(HttpMethod.Get, $"{request.TransferPath}/{transferId}", token);
                using var response = await _httpClient.SendAsync(get, cancellationToken);
                if (response.StatusCode == HttpStatusCode.NotFound) transferId = null;
                else { await EnsureSuccessAsync(response, cancellationToken); status = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken)); }
            }
            else transferId = null;
            if (transferId is null)
            {
                using var create = CreateAuthorizedRequest(HttpMethod.Post, request.TransferPath!, token);
                create.Content = new StringContent(JsonSerializer.Serialize(new { baseVersionId, originalName = request.FileName, sizeBytes = size, checksumSha256 = hash }), Encoding.UTF8, "application/json");
                using var response = await _httpClient.SendAsync(create, cancellationToken);
                await EnsureSuccessAsync(response, cancellationToken);
                status = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
                transferId = status.RootElement.GetProperty("transfer").GetProperty("id").GetString();
                if (!Guid.TryParse(transferId, out _)) throw new InvalidDataException("Transferencia inválida.");
                var temporary = statePath + ".tmp";
                await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(new { transferId, checksum = hash, baseVersionId }), cancellationToken);
                File.Move(temporary, statePath, overwrite: true);
            }
            var transfer = status!.RootElement.GetProperty("transfer");
            var chunkSize = transfer.GetProperty("chunkSize").GetInt32();
            if (chunkSize < 1 || chunkSize > 8 * 1024 * 1024) throw new InvalidDataException("Tamaño de bloque inválido.");
            var received = transfer.GetProperty("receivedChunks").EnumerateArray().Select(item => item.GetInt32()).ToHashSet();
            var count = (int)((size + chunkSize - 1) / chunkSize);
            var buffer = new byte[chunkSize];
            await using var file = new FileStream(localFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, chunkSize, true);
            for (var index = 0; index < count; index++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var length = (int)Math.Min(chunkSize, size - (long)index * chunkSize);
                if (!received.Contains(index))
                {
                    file.Position = (long)index * chunkSize;
                    await file.ReadExactlyAsync(buffer.AsMemory(0, length), cancellationToken);
                    for (var attempt = 0; ; attempt++)
                    {
                        try
                        {
                            using var put = CreateAuthorizedRequest(HttpMethod.Put, $"{request.TransferPath}/{transferId}/chunks/{index}", token);
                            put.Content = new ByteArrayContent(buffer, 0, length);
                            put.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
                            using var response = await _httpClient.SendAsync(put, cancellationToken);
                            await EnsureSuccessAsync(response, cancellationToken);
                            break;
                        }
                        catch (Exception error) when (attempt < 3 && !cancellationToken.IsCancellationRequested && IsTransient(error))
                        { await Task.Delay(TimeSpan.FromSeconds(attempt + 1), cancellationToken); }
                    }
                }
                Report("Enviando", Math.Min(size, (long)(index + 1) * chunkSize), size);
            }
            Report("Confirmando nueva versión", size, size);
            using var complete = CreateAuthorizedRequest(HttpMethod.Post, $"{request.TransferPath}/{transferId}/complete", token);
            using var completed = await _httpClient.SendAsync(complete, cancellationToken);
            await EnsureSuccessAsync(completed, cancellationToken);
            using var json = JsonDocument.Parse(await completed.Content.ReadAsStreamAsync(cancellationToken));
            var version = json.RootElement.GetProperty("version");
            var id = version.GetProperty("id").GetString();
            if (!Guid.TryParse(id, out _)) throw new InvalidDataException("Versión inválida.");
            var result = new DesktopUploadResult(id!, version.GetProperty("versionNumber").GetInt32(),
                version.TryGetProperty("sourcePublicationPending", out var pending) && pending.GetBoolean());
            File.Delete(statePath);
            // Cleanup is best effort: a lost response must never hide a durable saved version.
            try
            {
                using var delete = CreateAuthorizedRequest(HttpMethod.Delete, $"{request.TransferPath}/{transferId}", token);
                using var deleted = await _httpClient.SendAsync(delete, cancellationToken);
            }
            catch (HttpRequestException) { }
            catch (OperationCanceledException) { }
            Report("Versión guardada", size, size);
            return result;
        }
        finally { status?.Dispose(); }
    }
}
