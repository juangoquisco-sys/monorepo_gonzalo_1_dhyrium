using Dhyrium.Desktop.Connector;
using System.Windows.Forms;

if (args.Length == 0)
{
    ApplicationConfiguration.Initialize();
    Application.Run(new DesktopLoginForm());
    return 0;
}

return await CommandLine.RunAsync(args);
