using System.Net;
using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public static class SelfTest
{
    public static async Task RunAsync()
    {
        var temporaryRoot = Path.Combine(
            Path.GetTempPath(),
            $"Dhyrium-Desktop-SelfTest-{Guid.NewGuid():N}");
        Directory.CreateDirectory(temporaryRoot);

        try
        {
            var handler = new FakeDhyriumHandler();
            using var httpClient = new HttpClient(handler);
            var settings = new ConnectorSettings(
                "http://dhyrium.local",
                Path.Combine(temporaryRoot, "managed-cache"));
            var settingsStore = new ConnectorSettingsStore(
                Path.Combine(temporaryRoot, "settings"));
            settingsStore.Save(settings);
            var persistedSettings = settingsStore.Load();
            var loadedSettings = persistedSettings ??
                throw new InvalidOperationException("La configuración no se pudo guardar.");
            Ensure(
                loadedSettings.ServerUrl == settings.ServerUrl,
                "La dirección del servidor no se conservó.");

            var vault = new InMemoryTokenVault();
            var apiClient = new DhyriumApiClient(httpClient, settings.ServerUrl);
            var token = await apiClient.LoginAsync("12345678", "clave-de-prueba");
            Ensure(token == FakeDhyriumHandler.TestToken, "El inicio de sesión no devolvió el token esperado.");
            vault.Save(settings.ServerUrl, token);

            var request = DhyriumProtocol.ParseDesktopLaunchRequest(
                "dhyrium://open/document?ticket=" + FakeDhyriumHandler.TestTicket);
            Ensure(
                request.Ticket == FakeDhyriumHandler.TestTicket,
                "El enlace no conservó el permiso temporal.");

            var launcher = new RecordingFileLauncher();
            var service = new ConnectorService(settings, apiClient, vault, launcher);
            await using (var session = await service.OpenDocumentAsync(request))
            {
                Ensure(File.Exists(session.LocalFilePath), "El archivo no se preparó localmente.");
                Ensure(
                    File.ReadAllText(session.LocalFilePath) == FakeDhyriumHandler.InitialContent,
                    "El contenido descargado no coincide.");
                Ensure(
                    string.Equals(launcher.LastOpenedPath, session.LocalFilePath, StringComparison.Ordinal),
                    "Windows no recibió el archivo preparado para abrirlo.");
                Ensure(
                    !await session.SyncNowAsync(),
                    "Un archivo sin cambios no debe crear una versión.");

                await File.AppendAllTextAsync(session.LocalFilePath, "\nCambio local");
                Ensure(
                    await session.SyncNowAsync(),
                    "Un cambio local debe crear una versión.");
                Ensure(handler.UploadCount == 1, "Se esperaba exactamente una nueva versión.");
                Ensure(
                    handler.LastUploadedBody?.Contains("Cambio local", StringComparison.Ordinal) == true,
                    "La nueva versión no contiene el cambio local.");
                Ensure(
                    handler.LastUploadedBody?.Contains("baseVersionId", StringComparison.Ordinal) == true &&
                    handler.LastUploadedBody.Contains(FakeDhyriumHandler.InitialVersionId, StringComparison.Ordinal),
                    "El primer guardado debe declarar la versión que abrió.");

                await File.AppendAllTextAsync(session.LocalFilePath, "\nSegundo cambio local");
                Ensure(
                    await session.SyncNowAsync(),
                    "Un segundo cambio local debe crear una segunda versión.");
                Ensure(handler.UploadCount == 2, "Se esperaban dos versiones nuevas.");
                Ensure(
                    handler.LastUploadedBody?.Contains(FakeDhyriumHandler.SecondVersionId, StringComparison.Ordinal) == true,
                    "El segundo guardado debe depender de la versión recién creada.");
                Ensure(
                    !await session.SyncNowAsync(),
                    "El mismo cambio no debe subir una tercera versión.");

                var editorLockPath = Path.ChangeExtension(session.LocalFilePath, ".dwl");
                await File.WriteAllTextAsync(editorLockPath, "AutoCAD abierto");
                var editorSession = session.WaitForEditorSessionEndAsync();
                await Task.Delay(TimeSpan.FromMilliseconds(750));
                await File.AppendAllTextAsync(session.LocalFilePath, "\nCambio antes de cerrar AutoCAD");
                File.Delete(editorLockPath);
                await editorSession.WaitAsync(TimeSpan.FromSeconds(8));

                Ensure(
                    handler.UploadCount == 3,
                    "Al cerrar AutoCAD se debe guardar el último cambio pendiente.");
                Ensure(
                    handler.LastUploadedBody?.Contains(
                        "Cambio antes de cerrar AutoCAD",
                        StringComparison.Ordinal) == true,
                    "El cambio detectado al cerrar AutoCAD no llegó al servidor.");
            }

            Ensure(
                handler.RedeemCount == 1,
                "El permiso temporal debe canjearse una sola vez.");
            Ensure(
                handler.BearerTokens.Where(tokenValue => tokenValue is not null)
                    .All(tokenValue => tokenValue == FakeDhyriumHandler.TestToken) &&
                handler.BearerTokens.Count(tokenValue => tokenValue is not null) >= 2,
                "Las llamadas al servidor deben llevar la sesión de Dhyrium.");
            Console.WriteLine(
                "Prueba correcta: autenticación, descarga, apertura local simulada, guardado, versionado y cierre de AutoCAD verificados.");
        }
        finally
        {
            if (Directory.Exists(temporaryRoot))
            {
                Directory.Delete(temporaryRoot, recursive: true);
            }
        }
    }

    private static void Ensure(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException($"Prueba fallida: {message}");
        }
    }

    private sealed class RecordingFileLauncher : ILocalFileLauncher
    {
        public string? LastOpenedPath { get; private set; }

        public System.Diagnostics.Process? Open(string localFilePath)
        {
            LastOpenedPath = localFilePath;
            return null;
        }
    }

    private sealed class FakeDhyriumHandler : HttpMessageHandler
    {
        public const string TestToken = "token-de-prueba";
        public const string TestTicket = "0123456789012345678901234567890123456789012";
        public const string DocumentId = "3a95be8d-e348-4c78-9206-9cdfae1b6d95";
        public const string InitialVersionId = "f861dd6e-98a4-4d59-9d72-3af84ecbf669";
        public const string SecondVersionId = "92a61711-87f9-4875-8da6-7a0ca36e0e34";
        public const string ThirdVersionId = "82cd5593-232a-43c6-b1bd-fd2d2b14755f";
        public const string InitialContent = "Plano inicial de Dhyrium";
        public int UploadCount { get; private set; }
        public int RedeemCount { get; private set; }
        public string? LastUploadedBody { get; private set; }
        public List<string?> BearerTokens { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            BearerTokens.Add(request.Headers.Authorization?.Parameter);
            var path = request.RequestUri?.AbsolutePath;

            if (request.Method == HttpMethod.Post && path == "/api/v1/auth/login")
            {
                using var document = JsonDocument.Parse(
                    await request.Content!.ReadAsStreamAsync(cancellationToken));
                Ensure(
                    document.RootElement.GetProperty("dni").GetString() == "12345678" &&
                    document.RootElement.GetProperty("password").GetString() == "clave-de-prueba",
                    "El inicio de sesión debe usar las credenciales existentes de Dhyrium.");
                return JsonResponse(new { token = TestToken });
            }

            Ensure(
                request.Headers.Authorization?.Scheme == "Bearer" &&
                request.Headers.Authorization.Parameter == TestToken,
                "Las operaciones de archivos requieren un token Bearer.");

            if (request.Method == HttpMethod.Post &&
                path == "/api/v1/desktop/documents/launches/" + TestTicket + "/redeem")
            {
                RedeemCount++;
                return JsonResponse(new
                {
                    launch = new
                    {
                        document = new
                        {
                            id = DocumentId,
                            originalName = "Plano principal.dwg",
                            extension = "dwg",
                            currentVersionNumber = 1,
                        },
                        version = new
                        {
                            id = InitialVersionId,
                            versionNumber = 1,
                            originalName = "Plano principal.dwg",
                            mimeType = "application/octet-stream",
                            sizeBytes = InitialContent.Length,
                            checksumSha256 = "a".PadLeft(64, 'a'),
                            source = "ORIGINAL_IMPORT",
                        },
                        contentPath = $"/desktop/documents/{DocumentId}/versions/{InitialVersionId}/content",
                        savePath = $"/desktop/documents/{DocumentId}/versions",
                    },
                });
            }

            if (request.Method == HttpMethod.Get &&
                path == $"/api/v1/desktop/documents/{DocumentId}/versions/{InitialVersionId}/content")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(Encoding.UTF8.GetBytes(InitialContent)),
                };
            }

            if (request.Method == HttpMethod.Post &&
                path == $"/api/v1/desktop/documents/{DocumentId}/versions")
            {
                UploadCount++;
                LastUploadedBody = await request.Content!.ReadAsStringAsync(cancellationToken);
                Ensure(
                    LastUploadedBody.Contains("baseVersionId", StringComparison.Ordinal),
                    "El envío de versión debe incluir su versión base.");
                return JsonResponse(new
                {
                    version = new
                    {
                        id = UploadCount == 1 ? SecondVersionId : ThirdVersionId,
                        versionNumber = UploadCount + 1,
                    },
                });
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }

        private static HttpResponseMessage JsonResponse<T>(T payload)
        {
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json"),
            };
        }
    }
}
