; Inno-Setup-Skript für Kotlana OS
; Wird von GitHub Actions gebaut: iscc /DAppVersion=1.0.x build\installer.iss

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{6F4D2C1B-8A3E-4F7B-9C5D-2E1A0B3C4D5E}
AppName=Kotlana OS
AppVersion={#AppVersion}
AppVerName=Kotlana OS {#AppVersion}
AppPublisher=anonym239
AppPublisherURL=https://github.com/anonym239/scam-with-your-friends
AppSupportURL=https://github.com/anonym239/scam-with-your-friends/issues
AppUpdatesURL=https://github.com/anonym239/scam-with-your-friends/releases
DefaultDirName={autopf}\Kotlana OS
DefaultGroupName=Kotlana OS
DisableProgramGroupPage=yes
; Ohne Administratorrechte installierbar (Installation pro Benutzer), auf Wunsch für alle
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist
OutputBaseFilename=KotlanaOS-Setup
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\KotlanaOS.exe
UninstallDisplayName=Kotlana OS
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=force

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\KotlanaOS.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Kotlana OS"; Filename: "{app}\KotlanaOS.exe"; IconFilename: "{app}\icon.ico"; Comment: "Kotlana OS starten"
Name: "{group}\Kotlana OS deinstallieren"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Kotlana OS"; Filename: "{app}\KotlanaOS.exe"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\KotlanaOS.exe"; Description: "{cm:LaunchProgram,Kotlana OS}"; Flags: nowait postinstall skipifsilent
Filename: "https://ollama.com/download"; Description: "Ollama herunterladen (für KI-Anrufer und KI-Spieler)"; Flags: shellexec postinstall skipifsilent unchecked; Check: not OllamaInstalled

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM KotlanaOS.exe"; Flags: runhidden; RunOnceId: "KillKotlana"

[Code]
function OllamaInstalled(): Boolean;
begin
  Result := FileExists(ExpandConstant('{localappdata}\Programs\Ollama\ollama.exe'))
    or FileExists(ExpandConstant('{commonpf64}\Ollama\ollama.exe'));
end;

// Laufendes Spiel vor einem Update beenden, damit die .exe ersetzt werden kann
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM KotlanaOS.exe', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;
