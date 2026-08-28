; Build with Inno Setup after publishing the connector for win-x64.
; The release pipeline must sign both the published executable and this installer.

#define AppName "Dhyrium Desktop"
#define AppVersion "0.1.3"
#define AppExecutable "Dhyrium.Desktop.Connector.exe"

[Setup]
AppId={{E66FB4A8-7556-4EC2-A3B9-DBAFD3A8D4DC}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Dhyrium
DefaultDirName={localappdata}\Dhyrium\Desktop
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=DhyriumDesktopSetup
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "..\publish\win-x64\{#AppExecutable}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\THIRD-PARTY-NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LEGAL-AND-NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Software\Classes\dhyrium"; ValueType: string; ValueName: ""; ValueData: "URL:Dhyrium Desktop Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\dhyrium"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\dhyrium\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExecutable}"" uri ""%1"""

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExecutable}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExecutable}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Opciones adicionales:"
