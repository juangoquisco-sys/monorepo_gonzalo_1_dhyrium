using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public sealed partial class DhyriumApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _serverUrl;

    public DhyriumApiClient(HttpClient httpClient, string serverUrl)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _serverUrl = ServerEndpoint.NormalizeServerUrl(serverUrl);
    }

    public async Task<string> LoginAsync(
        string dni,
        string password,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dni) || string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("El usuario y la contraseña son obligatorios.");
        }

        var payload = JsonSerializer.Serialize(new { dni = dni.Trim(), password });
        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUri("auth/login"))
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStreamAsync(cancellationToken));
        if (!document.RootElement.TryGetProperty("token", out var tokenElement) ||
            string.IsNullOrWhiteSpace(tokenElement.GetString()))
        {
            throw new InvalidOperationException(
                "Dhyrium no devolvió un token de inicio de sesión válido.");
        }

        return tokenElement.GetString()!;
    }

    public async Task<DesktopDocumentOpenRequest> RedeemDesktopLaunchAsync(
        string launchTicket,
        string token,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(launchTicket);
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        using var request = CreateAuthorizedRequest(
            HttpMethod.Post,
            $"desktop/documents/launches/{EscapePath(launchTicket)}/redeem",
            token);
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
        using var responseDocument = JsonDocument.Parse(
            await response.Content.ReadAsStreamAsync(cancellationToken));

        if (!responseDocument.RootElement.TryGetProperty("launch", out var launch) ||
            !launch.TryGetProperty("document", out var document) ||
            !launch.TryGetProperty("version", out var version) ||
            !launch.TryGetProperty("contentPath", out var contentPath) ||
            !launch.TryGetProperty("savePath", out var savePath) ||
            !document.TryGetProperty("id", out var documentId) ||
            !document.TryGetProperty("originalName", out var fileName) ||
            !version.TryGetProperty("id", out var versionId) ||
            string.IsNullOrWhiteSpace(documentId.GetString()) ||
            string.IsNullOrWhiteSpace(versionId.GetString()) ||
            string.IsNullOrWhiteSpace(fileName.GetString()) ||
            string.IsNullOrWhiteSpace(contentPath.GetString()) ||
            string.IsNullOrWhiteSpace(savePath.GetString()))
        {
            throw new InvalidOperationException(
                "Dhyrium no devolvió un permiso de apertura válido.");
        }

        var resolvedDocumentId = documentId.GetString()!;
        var resolvedVersionId = versionId.GetString()!;
        if (!Guid.TryParse(resolvedDocumentId, out _) ||
            !Guid.TryParse(resolvedVersionId, out _) ||
            !DhyriumProtocol.IsApprovedApiPath(
                contentPath.GetString()!,
                resolvedDocumentId,
                resolvedVersionId,
                savePath: false) ||
            !DhyriumProtocol.IsApprovedApiPath(
                savePath.GetString()!,
                resolvedDocumentId,
                resolvedVersionId,
                savePath: true))
        {
            throw new InvalidOperationException(
                "Dhyrium devolvió una ruta de archivo no autorizada.");
        }

        return new DesktopDocumentOpenRequest(
            resolvedDocumentId,
            resolvedVersionId,
            DhyriumProtocol.SafeFileName(fileName.GetString()!),
            contentPath.GetString()!,
            savePath.GetString()!,
            version.TryGetProperty("sizeBytes", out var size) ? size.GetInt64() : 0,
            version.TryGetProperty("checksumSha256", out var checksum) ? checksum.GetString() : null,
            launch.TryGetProperty("transferPath", out var transferPath) &&
                transferPath.GetString() == $"/desktop/documents/{resolvedDocumentId}/transfers"
                ? transferPath.GetString() : null,
            launch.TryGetProperty("maxFileBytes", out var maxBytes) ? maxBytes.GetInt64() : 4L * 1024 * 1024 * 1024,
            launch.TryGetProperty("readOnly", out var readOnly) && readOnly.GetBoolean(),
            launch.TryGetProperty("lockedByName", out var lockedByName) ? lockedByName.GetString() : null);
    }

    public async Task HeartbeatLockAsync(DesktopDocumentOpenRequest request, string token, CancellationToken cancellationToken = default)
    {
        using var httpRequest = CreateAuthorizedRequest(HttpMethod.Post, $"desktop/documents/{EscapePath(request.DocumentId)}/lock/heartbeat", token);
        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    public async Task ReleaseLockAsync(DesktopDocumentOpenRequest request, string token, CancellationToken cancellationToken = default)
    {
        using var httpRequest = CreateAuthorizedRequest(HttpMethod.Delete, $"desktop/documents/{EscapePath(request.DocumentId)}/lock", token);
        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);
    }

    public Task DownloadDocumentContentAsync(
        DesktopDocumentOpenRequest request, string destinationPath, string token,
        CancellationToken cancellationToken = default) =>
        DownloadResumableAsync(request, destinationPath, token, cancellationToken);

    internal async Task AuthorizeResumeAsync(DesktopDocumentOpenRequest document, string token)
    {
        if (!DhyriumProtocol.IsApprovedApiPath(document.ContentPath, document.DocumentId, document.VersionId, false))
            throw new InvalidDataException("Ruta de recuperación de sesión no válida.");
        using var request = CreateAuthorizedRequest(HttpMethod.Get, document.ContentPath, token);
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        await EnsureSuccessAsync(response, CancellationToken.None);
    }

    public async Task<DesktopUploadResult> UploadDocumentVersionAsync(
        DesktopDocumentOpenRequest request,
        string baseVersionId,
        string localFilePath,
        string token,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentException.ThrowIfNullOrWhiteSpace(baseVersionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(localFilePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        if (request.TransferPath is not null)
            return await UploadResumableAsync(request, baseVersionId, localFilePath, token, cancellationToken);

        await using var stream = new FileStream(
            localFilePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.ReadWrite,
            bufferSize: 1024 * 64,
            useAsync: true);
        using var form = new MultipartFormDataContent();
        using var file = new StreamContent(stream);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        form.Add(file, "file", request.FileName);
        form.Add(new StringContent(baseVersionId, Encoding.UTF8), "baseVersionId");

        using var requestMessage = CreateAuthorizedRequest(
            HttpMethod.Post,
            request.SavePath,
            token);
        requestMessage.Content = form;

        using var response = await _httpClient.SendAsync(requestMessage, cancellationToken);
        if (response.StatusCode == HttpStatusCode.Conflict)
        {
            throw new InvalidOperationException(
                "El archivo fue actualizado por otra persona. Vuelva a abrirlo desde Dhyrium antes de guardar sus cambios.");
        }
        await EnsureSuccessAsync(response, cancellationToken);
        using var responseDocument = JsonDocument.Parse(
            await response.Content.ReadAsStreamAsync(cancellationToken));

        if (!responseDocument.RootElement.TryGetProperty("version", out var version) ||
            !version.TryGetProperty("id", out var id) ||
            !version.TryGetProperty("versionNumber", out var versionNumber) ||
            string.IsNullOrWhiteSpace(id.GetString()) ||
            !Guid.TryParse(id.GetString(), out _) ||
            !versionNumber.TryGetInt32(out var number))
        {
            throw new InvalidOperationException(
                "Dhyrium no devolvió la versión creada por el guardado.");
        }

        return new DesktopUploadResult(id.GetString()!, number,
            version.TryGetProperty("sourcePublicationPending", out var pending) && pending.GetBoolean());
    }

    private HttpRequestMessage CreateAuthorizedRequest(
        HttpMethod method,
        string relativePath,
        string token)
    {
        var request = new HttpRequestMessage(method, ApiUri(relativePath));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private Uri ApiUri(string relativePath) => ServerEndpoint.ApiUri(_serverUrl, relativePath);

    private static string EscapePath(string value) => Uri.EscapeDataString(value);
}
