using System.Text.Json;

namespace Dhyrium.Desktop.Connector;

public sealed class ConnectorSettingsStore
{
    private const string SettingsFileName = "settings.json";
    private readonly string _settingsDirectory;

    public ConnectorSettingsStore(string? settingsDirectory = null)
    {
        _settingsDirectory = settingsDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Dhyrium",
            "DesktopConnector");
    }

    public string SettingsPath => Path.Combine(_settingsDirectory, SettingsFileName);

    public ConnectorSettings? Load()
    {
        if (!File.Exists(SettingsPath))
        {
            return null;
        }

        var content = File.ReadAllText(SettingsPath);
        var settings = JsonSerializer.Deserialize<ConnectorSettings>(content);
        if (settings is null)
        {
            throw new InvalidOperationException("La configuración de Dhyrium Desktop no es válida.");
        }

        return new ConnectorSettings(
            ServerEndpoint.NormalizeServerUrl(settings.ServerUrl),
            Path.GetFullPath(settings.CacheRoot));
    }

    public void Save(ConnectorSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        Directory.CreateDirectory(_settingsDirectory);

        var temporaryPath = $"{SettingsPath}.{Guid.NewGuid():N}.tmp";
        var serialized = JsonSerializer.Serialize(
            new ConnectorSettings(
                ServerEndpoint.NormalizeServerUrl(settings.ServerUrl),
                Path.GetFullPath(settings.CacheRoot)),
            new JsonSerializerOptions { WriteIndented = true });

        try
        {
            File.WriteAllText(temporaryPath, serialized);
            File.Move(temporaryPath, SettingsPath, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }
    }
}
