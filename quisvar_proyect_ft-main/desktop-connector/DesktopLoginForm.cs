using System.Net;
using System.Windows.Forms;

namespace Dhyrium.Desktop.Connector;

public sealed class DesktopLoginForm : Form
{
    private readonly TextBox _serverUrl = new()
    {
        Dock = DockStyle.Fill,
        PlaceholderText = "https://dhyrium.empresa.pe",
    };
    private readonly TextBox _dni = new()
    {
        Dock = DockStyle.Fill,
        PlaceholderText = "DNI o usuario de Dhyrium",
    };
    private readonly TextBox _password = new()
    {
        Dock = DockStyle.Fill,
        PlaceholderText = "Contraseña",
        UseSystemPasswordChar = true,
    };
    private readonly Label _status = new()
    {
        AutoSize = false,
        BackColor = Color.FromArgb(240, 247, 255),
        BorderStyle = BorderStyle.FixedSingle,
        Dock = DockStyle.Fill,
        ForeColor = Color.DimGray,
        Padding = new Padding(12, 8, 12, 8),
        Text = "Inicie sesión con la misma cuenta que usa en Dhyrium Web.",
    };
    private readonly Button _signIn = new()
    {
        AutoSize = false,
        BackColor = Color.FromArgb(22, 109, 189),
        FlatStyle = FlatStyle.Flat,
        ForeColor = Color.White,
        Size = new Size(132, 34),
        Text = "Iniciar sesión",
    };
    private readonly Button _registerBrowser = new()
    {
        AutoSize = false,
        Size = new Size(184, 34),
        Text = "Conectar con el navegador",
    };

    public DesktopLoginForm()
    {
        Text = "Dhyrium Desktop";
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        // The initial pilot window was too short at 150–200% Windows display
        // scaling, leaving the sign-in controls below the visible area.
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(680, 500);

        var layout = new TableLayoutPanel
        {
            ColumnCount = 1,
            Dock = DockStyle.Fill,
            Padding = new Padding(28),
            RowCount = 9,
        };
        for (var row = 0; row < 8; row++)
        {
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        }
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 72));

        var title = new Label
        {
            AutoSize = true,
            Font = new Font(Font.FontFamily, 14, FontStyle.Bold),
            Text = "Dhyrium Desktop",
        };
        layout.Controls.Add(title, 0, 0);
        layout.Controls.Add(new Label { AutoSize = true, Text = "Servidor de Dhyrium" }, 0, 1);
        layout.Controls.Add(_serverUrl, 0, 2);
        layout.Controls.Add(new Label { AutoSize = true, Text = "Usuario" }, 0, 3);
        layout.Controls.Add(_dni, 0, 4);
        layout.Controls.Add(new Label { AutoSize = true, Text = "Contraseña" }, 0, 5);
        layout.Controls.Add(_password, 0, 6);

        var actions = new FlowLayoutPanel
        {
            AutoSize = false,
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.LeftToRight,
            Height = 40,
            Padding = new Padding(0, 4, 0, 2),
        };
        _signIn.FlatAppearance.BorderSize = 0;
        actions.Controls.Add(_signIn);
        actions.Controls.Add(_registerBrowser);
        layout.Controls.Add(actions, 0, 7);
        layout.Controls.Add(_status, 0, 8);

        Controls.Add(layout);

        var existingSettings = new ConnectorSettingsStore().Load();
        if (existingSettings is not null)
        {
            _serverUrl.Text = existingSettings.ServerUrl;
        }

        _signIn.Click += SignInAsync;
        _registerBrowser.Click += RegisterBrowser;
        AcceptButton = _signIn;
    }

    private async void SignInAsync(object? sender, EventArgs eventArgs)
    {
        var password = _password.Text;
        try
        {
            _signIn.Enabled = false;
            _registerBrowser.Enabled = false;
            _status.Text = "Validando su cuenta con Dhyrium...";

            var settings = ConnectorSettings.Create(_serverUrl.Text);
            using var httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromMinutes(4),
            };
            var apiClient = new DhyriumApiClient(httpClient, settings.ServerUrl);
            var token = await apiClient.LoginAsync(_dni.Text, password);

            new ConnectorSettingsStore().Save(settings);
            new WindowsCredentialVault().Save(settings.ServerUrl, token);
            RegisterBrowser(sender, eventArgs);
            _status.Text =
                "Sesión iniciada correctamente. Cierre esta ventana y abra un archivo desde Dhyrium Web.";
        }
        catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.Unauthorized)
        {
            _status.Text = "Dhyrium no reconoció el usuario o la contraseña.";
            MessageBox.Show(
                "No se pudo iniciar sesión. Verifique su DNI o usuario y su contraseña de Dhyrium.",
                "Dhyrium Desktop",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
        catch (Exception exception)
        {
            _status.Text = "No se pudo iniciar sesión.";
            MessageBox.Show(
                exception.Message,
                "Dhyrium Desktop",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        finally
        {
            password = string.Empty;
            _password.Clear();
            _signIn.Enabled = true;
            _registerBrowser.Enabled = true;
        }
    }

    private void RegisterBrowser(object? sender, EventArgs eventArgs)
    {
        try
        {
            var executablePath = Environment.ProcessPath;
            if (string.IsNullOrWhiteSpace(executablePath))
            {
                throw new InvalidOperationException(
                    "No se pudo encontrar Dhyrium Desktop en esta computadora.");
            }

            ProtocolRegistrar.RegisterForCurrentUser(executablePath);
            _status.Text = "El navegador ya puede enviar archivos a Dhyrium Desktop.";
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                exception.Message,
                "Dhyrium Desktop",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}
