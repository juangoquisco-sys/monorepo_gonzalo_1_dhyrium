using Microsoft.Win32;

namespace Dhyrium.Desktop.Connector;

public static class ProtocolRegistrar
{
    private const string ProtocolKey = @"Software\Classes\dhyrium";

    public static void RegisterForCurrentUser(string executablePath)
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException(
                "El protocolo de Dhyrium Desktop solo se registra en Windows.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(executablePath);
        var fullExecutablePath = Path.GetFullPath(executablePath);
        if (!File.Exists(fullExecutablePath))
        {
            throw new FileNotFoundException(
                "No se encontró el ejecutable de Dhyrium Desktop.",
                fullExecutablePath);
        }

        using var protocol = Registry.CurrentUser.CreateSubKey(ProtocolKey, writable: true);
        protocol.SetValue(string.Empty, "URL:Dhyrium Desktop Protocol");
        protocol.SetValue("URL Protocol", string.Empty);

        using var openCommand = protocol.CreateSubKey(@"shell\open\command", writable: true);
        openCommand.SetValue(
            string.Empty,
            $"\"{fullExecutablePath}\" uri \"%1\"");
    }
}
