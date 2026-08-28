using System.Security.Cryptography;
using System.Text;

namespace Dhyrium.Desktop.Connector;

public sealed record ConnectorSettings(string ServerUrl, string CacheRoot)
{
    public static ConnectorSettings Create(string serverUrl) => new(
        ServerEndpoint.NormalizeServerUrl(serverUrl),
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Dhyrium",
            "DesktopConnector"));
}

public sealed record DesktopLaunchRequest(string Ticket);

public sealed record DesktopDocumentOpenRequest(
    string DocumentId,
    string VersionId,
    string FileName,
    string ContentPath,
    string SavePath);

public sealed record DesktopUploadResult(string VersionId, int VersionNumber);

public static class ServerEndpoint
{
    public static string NormalizeServerUrl(string serverUrl)
    {
        if (!Uri.TryCreate(serverUrl.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("La dirección del servidor debe ser HTTP o HTTPS.", nameof(serverUrl));
        }

        return uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
    }

    public static Uri ApiUri(string serverUrl, string relativePath)
    {
        var normalized = NormalizeServerUrl(serverUrl);
        return new Uri($"{normalized}/api/v1/{relativePath.TrimStart('/')}");
    }
}

public static class DhyriumProtocol
{
    private static readonly HashSet<string> WindowsReservedNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    };

    public static DesktopLaunchRequest ParseDesktopLaunchRequest(string rawUri)
    {
        if (!Uri.TryCreate(rawUri, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, "dhyrium", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(uri.Host, "open", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(uri.AbsolutePath.Trim('/'), "document", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("El enlace de Dhyrium Desktop no es válido.", nameof(rawUri));
        }

        var query = ParseQuery(uri.Query);
        if (query.Count != 1 || !query.TryGetValue("ticket", out var ticket) ||
            string.IsNullOrWhiteSpace(ticket) || !IsDesktopTicket(ticket))
        {
            throw new ArgumentException(
                "El enlace de Dhyrium Desktop no contiene un permiso temporal válido.",
                nameof(rawUri));
        }

        return new DesktopLaunchRequest(ticket);
    }

    public static string SafeFileName(string fileName)
    {
        var source = Path.GetFileName(fileName ?? string.Empty);
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(source
            .Select(character => invalid.Contains(character) || char.IsControl(character) ? '_' : character)
            .ToArray())
            .Trim()
            .TrimEnd('.', ' ');

        if (string.IsNullOrWhiteSpace(cleaned) || cleaned is "." or "..")
        {
            throw new ArgumentException("El servidor no devolvió un nombre de archivo válido.", nameof(fileName));
        }

        var baseName = Path.GetFileNameWithoutExtension(cleaned);
        if (WindowsReservedNames.Contains(baseName))
        {
            cleaned = $"_{cleaned}";
        }

        if (string.IsNullOrWhiteSpace(Path.GetExtension(cleaned)))
        {
            throw new ArgumentException("El archivo no tiene extensión para abrirse en Windows.", nameof(fileName));
        }

        return cleaned.Length <= 280 ? cleaned : cleaned[..280];
    }

    public static string HashFile(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }

    public static bool IsApprovedApiPath(
        string path,
        string expectedDocumentId,
        string expectedVersionId,
        bool savePath)
    {
        var normalized = path.Trim();
        if (!normalized.StartsWith("/", StringComparison.Ordinal) ||
            normalized.Contains("//", StringComparison.Ordinal) ||
            normalized.Contains('?', StringComparison.Ordinal) ||
            normalized.Contains('#', StringComparison.Ordinal))
        {
            return false;
        }

        var expected = savePath
            ? $"/desktop/documents/{expectedDocumentId}/versions"
            : $"/desktop/documents/{expectedDocumentId}/versions/{expectedVersionId}/content";
        return string.Equals(normalized, expected, StringComparison.Ordinal);
    }

    private static bool IsDesktopTicket(string ticket) =>
        ticket.Length == 43 && ticket.All(character =>
            character is >= 'A' and <= 'Z' ||
            character is >= 'a' and <= 'z' ||
            character is >= '0' and <= '9' ||
            character is '-' or '_');

    private static Dictionary<string, string> ParseQuery(string query)
    {
        return query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .GroupBy(parts => Uri.UnescapeDataString(parts[0].Replace('+', ' ')),
                StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => Uri.UnescapeDataString(group.Last()[1].Replace('+', ' ')),
                StringComparer.OrdinalIgnoreCase);
    }
}

public interface ITokenVault
{
    void Save(string serverUrl, string token);
    string? Read(string serverUrl);
    void Delete(string serverUrl);
}
