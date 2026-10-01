using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

internal static class SessionIdentity
{
    // This claim partitions local data only. The API still authenticates every operation.
    public static string Account(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3) throw new UnauthorizedAccessException("Inicie sesión nuevamente en Desktop.");
        var payload = parts[1].Replace('-', '+').Replace('_', '/');
        using var json = JsonDocument.Parse(Convert.FromBase64String(payload.PadRight((payload.Length + 3) / 4 * 4, '=')));
        var id = json.RootElement.GetProperty("id").GetInt32();
        if (id <= 0) throw new UnauthorizedAccessException("Cuenta de Desktop no válida.");
        return id.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }

    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)))[..24];
    public static ConnectorSettings Scope(ConnectorSettings settings, string account) => settings with
    {
        CacheRoot = Path.Combine(settings.CacheRoot, "accounts", Hash(ServerEndpoint.NormalizeServerUrl(settings.ServerUrl) + "|" + account))
    };
}

internal sealed class AccountTokenVault(ITokenVault inner, string account) : ITokenVault
{
    public string? Read(string serverUrl)
    {
        var token = inner.Read(serverUrl);
        if (token is null || SessionIdentity.Account(token) != account)
            throw new UnauthorizedAccessException("Sesión pausada: vuelva a iniciar sesión con la cuenta de este documento.");
        return token;
    }
    public void Save(string serverUrl, string token) => throw new NotSupportedException();
    public void Delete(string serverUrl) => throw new NotSupportedException();
}

internal static class SessionLog
{
    private static readonly object Gate = new();
    public static void Write(string root, string document, string action, Exception? error = null)
    {
        try
        {
            lock (Gate)
            {
                var folder = Path.Combine(root, "logs"); Directory.CreateDirectory(folder);
                // Never record exception messages: HTTP exceptions can contain launch tickets.
                File.AppendAllText(Path.Combine(folder, DateTime.UtcNow.ToString("yyyy-MM-dd") + ".jsonl"),
                    JsonSerializer.Serialize(new { at = DateTimeOffset.UtcNow, document, action,
                        error = error?.GetType().Name, hresult = error?.HResult }) + Environment.NewLine);
            }
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }
}
