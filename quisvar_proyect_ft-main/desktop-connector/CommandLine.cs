namespace Dhyrium.Desktop.Connector;

public static class CommandLine
{
    public static async Task<int> RunAsync(string[] args)
    {
        try
        {
            if (args.Length == 1 && args[0] == "--self-test")
            {
                await SelfTest.RunAsync();
                return 0;
            }

            if (args.Length == 2 && args[0].Equals("configure", StringComparison.OrdinalIgnoreCase))
            {
                Configure(args[1]);
                return 0;
            }

            if (args.Length == 2 && args[0].Equals("login", StringComparison.OrdinalIgnoreCase))
            {
                await LoginAsync(args[1]);
                return 0;
            }

            if (args.Length == 1 && args[0].Equals("status", StringComparison.OrdinalIgnoreCase))
            {
                ShowStatus();
                return 0;
            }

            if (args.Length == 1 &&
                args[0].Equals("register-protocol", StringComparison.OrdinalIgnoreCase))
            {
                RegisterProtocol();
                return 0;
            }

            if (args.Length == 2 && args[0].Equals("uri", StringComparison.OrdinalIgnoreCase))
            {
                await OpenDocumentFromUriAsync(args[1]);
                return 0;
            }

            ShowUsage();
            return 2;
        }
        catch (Exception exception)
        {
            ShowFailure(exception.Message);
            return 1;
        }
    }

    private static void Configure(string serverUrl)
    {
        var settings = ConnectorSettings.Create(serverUrl);
        new ConnectorSettingsStore().Save(settings);
        Console.WriteLine("Dhyrium Desktop fue configurado en esta computadora.");
    }

    private static async Task LoginAsync(string dni)
    {
        var settings = LoadSettingsOrThrow();
        Console.Write("Contraseña: ");
        var password = ReadPassword();
        Console.WriteLine();

        try
        {
            using var httpClient = CreateHttpClient();
            var apiClient = new DhyriumApiClient(httpClient, settings.ServerUrl);
            var token = await apiClient.LoginAsync(dni, password);
            new WindowsCredentialVault().Save(settings.ServerUrl, token);
            Console.WriteLine("Inicio de sesión correcto. La contraseña no se guardó.");
        }
        finally
        {
            password = string.Empty;
        }
    }

    private static void ShowStatus()
    {
        var settings = new ConnectorSettingsStore().Load();
        if (settings is null)
        {
            Console.WriteLine("Dhyrium Desktop todavía no está configurado.");
            return;
        }

        var hasSession = new WindowsCredentialVault().Read(settings.ServerUrl) is not null;
        Console.WriteLine(hasSession
            ? "Dhyrium Desktop está configurado y tiene una sesión activa."
            : "Dhyrium Desktop está configurado. Falta iniciar sesión.");
    }

    private static void RegisterProtocol()
    {
        var executablePath = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(executablePath))
        {
            throw new InvalidOperationException(
                "No se pudo localizar el ejecutable de Dhyrium Desktop.");
        }

        ProtocolRegistrar.RegisterForCurrentUser(executablePath);
        Console.WriteLine("El navegador ya puede abrir enlaces de Dhyrium Desktop.");
    }

    private static async Task OpenDocumentFromUriAsync(string rawUri)
    {
        var settings = LoadSettingsOrThrow();
        var request = DhyriumProtocol.ParseDesktopLaunchRequest(rawUri);
        using var httpClient = CreateHttpClient();
        var service = new ConnectorService(
            settings,
            new DhyriumApiClient(httpClient, settings.ServerUrl),
            new WindowsCredentialVault(),
            new WindowsShellFileLauncher());

        await using var session = await service.OpenDocumentAsync(request);
        Console.WriteLine("El archivo se abrió en la aplicación instalada en Windows.");
        await WaitUntilEditorClosesAsync(session);
    }

    private static async Task WaitUntilEditorClosesAsync(OpenedDocumentSession session)
    {
        using var cancellation = new CancellationTokenSource();
        ConsoleCancelEventHandler handler = (_, eventArgs) =>
        {
            eventArgs.Cancel = true;
            cancellation.Cancel();
        };

        Console.CancelKeyPress += handler;
        try
        {
            await session.WaitForEditorSessionEndAsync(cancellation.Token);
        }
        catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
        {
            // DisposeAsync performs one last upload check before the connector exits.
        }
        finally
        {
            Console.CancelKeyPress -= handler;
        }
    }

    private static ConnectorSettings LoadSettingsOrThrow() =>
        new ConnectorSettingsStore().Load() ??
        throw new InvalidOperationException(
            "Abra Dhyrium Desktop e inicie sesión antes de abrir archivos desde la web.");

    private static HttpClient CreateHttpClient() => new()
    {
        Timeout = TimeSpan.FromMinutes(4),
    };

    private static string ReadPassword()
    {
        if (Console.IsInputRedirected)
        {
            throw new InvalidOperationException(
                "El inicio de sesión debe realizarse desde la ventana de Dhyrium Desktop.");
        }

        var characters = new List<char>();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter)
            {
                break;
            }

            if (key.Key == ConsoleKey.Backspace)
            {
                if (characters.Count > 0)
                {
                    characters.RemoveAt(characters.Count - 1);
                }

                continue;
            }

            if (!char.IsControl(key.KeyChar))
            {
                characters.Add(key.KeyChar);
            }
        }

        return new string(characters.ToArray());
    }

    private static void ShowUsage()
    {
        Console.WriteLine(
            """
            Uso de Dhyrium Desktop Connector:
              configure <servidor>
              login <dni>
              status
              register-protocol
              uri <enlace-dhyrium>
              --self-test
            """);
    }

    private static void ShowFailure(string message)
    {
        if (OperatingSystem.IsWindows() && Environment.UserInteractive)
        {
            System.Windows.Forms.MessageBox.Show(
                message,
                "Dhyrium Desktop",
                System.Windows.Forms.MessageBoxButtons.OK,
                System.Windows.Forms.MessageBoxIcon.Error);
            return;
        }

        Console.Error.WriteLine($"Dhyrium Desktop: {message}");
    }
}
