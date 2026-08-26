#requires -Version 5.1

<#
.SYNOPSIS
  Audita, sin modificar la estacion, los prerrequisitos para abrir un DOCX de
  Dhyrium en Microsoft Word de escritorio.

.DESCRIPTION
  Solo realiza lecturas de archivos, WMI/CIM, registro, DNS, TCP y TLS. No
  inicia Word, no abre documentos y no cambia registro, certificados,
  servicios ni politicas. No prueba metodos WebDAV ni acepta una URL firmada.
  La salida estandar contiene exclusivamente JSON. Codigos: 0=PASS, 2=WARN y
  3=FAIL.

.PARAMETER DocumentOrigin
  Origen HTTPS/HTTP del endpoint documental. Debe contener solo esquema, host y
  puerto; el script rechaza rutas, query, fragmentos y URLs firmadas.

.PARAMETER LaunchOrigin
  Origen de la pagina Dhyrium que invoca ms-word. Se evalua por separado porque
  la politica de protocolo externo de Chrome pertenece al frontend, no a WebDAV.

.PARAMETER ExpectedFileSizeBytes
  Tamano opcional del DOCX que se desea comparar con el limite de WebClient.

.EXAMPLE
  .\test-word-station-readiness.ps1 `
    -DocumentOrigin 'https://word.dhyrium.local' `
    -LaunchOrigin 'https://dhyrium.local'

.EXAMPLE
  .\test-word-station-readiness.ps1 `
    -DocumentOrigin 'http://172.16.10.177:8081' `
    -LaunchOrigin 'http://172.16.10.177:8001' `
    -ExpectedFileSizeBytes 18350080
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateScript({
      $_.IsAbsoluteUri -and
      $_.Scheme -in @('http', 'https') -and
      -not [string]::IsNullOrWhiteSpace($_.Host) -and
      $_.AbsolutePath -eq '/' -and
      [string]::IsNullOrWhiteSpace($_.Query) -and
      [string]::IsNullOrWhiteSpace($_.Fragment) -and
      [string]::IsNullOrWhiteSpace($_.UserInfo)
    })]
  [uri]$DocumentOrigin,

  [Parameter(Mandatory)]
  [ValidateScript({
      $_.IsAbsoluteUri -and
      $_.Scheme -in @('http', 'https') -and
      -not [string]::IsNullOrWhiteSpace($_.Host) -and
      $_.AbsolutePath -eq '/' -and
      [string]::IsNullOrWhiteSpace($_.Query) -and
      [string]::IsNullOrWhiteSpace($_.Fragment) -and
      [string]::IsNullOrWhiteSpace($_.UserInfo)
    })]
  [uri]$LaunchOrigin,

  [ValidateRange(0, [long]::MaxValue)]
  [long]$ExpectedFileSizeBytes = 0,

  [ValidateRange(1, 30)]
  [int]$TimeoutSeconds = 5
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$checks = New-Object 'System.Collections.Generic.List[object]'

function Add-Check {
  param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][ValidateSet('PASS', 'WARN', 'FAIL')][string]$Status,
    [Parameter(Mandatory)][string]$Summary,
    [Parameter(Mandatory)]$Evidence,
    [string]$Recommendation
  )

  $check = [ordered]@{
    id = $Id
    status = $Status
    summary = $Summary
    evidence = $Evidence
  }
  if (-not [string]::IsNullOrWhiteSpace($Recommendation)) {
    $check.recommendation = $Recommendation
  }
  [void]$checks.Add($check)
}

function Get-RegistryEntry {
  param(
    [Parameter(Mandatory)][Microsoft.Win32.RegistryHive]$Hive,
    [Parameter(Mandatory)][string]$SubKey,
    [Parameter(Mandatory)][AllowEmptyString()][string]$ValueName
  )

  foreach ($view in @(
      [Microsoft.Win32.RegistryView]::Registry64,
      [Microsoft.Win32.RegistryView]::Registry32
    )) {
    $baseKey = $null
    $key = $null
    try {
      $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Hive, $view)
      $key = $baseKey.OpenSubKey($SubKey, $false)
      if ($null -eq $key) {
        continue
      }

      $valueNames = @($key.GetValueNames())
      if ($valueNames -notcontains $ValueName) {
        continue
      }

      return [pscustomobject]@{
        found = $true
        value = $key.GetValue(
          $ValueName,
          $null,
          [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
        )
        hive = [string]$Hive
        view = [string]$view
      }
    }
    catch {
      continue
    }
    finally {
      if ($null -ne $key) {
        $key.Dispose()
      }
      if ($null -ne $baseKey) {
        $baseKey.Dispose()
      }
    }
  }

  return [pscustomobject]@{
    found = $false
    value = $null
    hive = $null
    view = $null
  }
}

function Find-RegistryEntry {
  param(
    [Parameter(Mandatory)][object[]]$Locations,
    [Parameter(Mandatory)][AllowEmptyString()][string]$ValueName
  )

  foreach ($location in $Locations) {
    $entry = Get-RegistryEntry `
      -Hive $location.hive `
      -SubKey $location.subKey `
      -ValueName $ValueName
    if ($entry.found) {
      return $entry
    }
  }

  return [pscustomobject]@{
    found = $false
    value = $null
    hive = $null
    view = $null
  }
}

function Get-RegistryKeySnapshot {
  param(
    [Parameter(Mandatory)][Microsoft.Win32.RegistryHive]$Hive,
    [Parameter(Mandatory)][string]$SubKey
  )

  $snapshots = New-Object 'System.Collections.Generic.List[object]'
  foreach ($view in @(
      [Microsoft.Win32.RegistryView]::Registry64,
      [Microsoft.Win32.RegistryView]::Registry32
    )) {
    $baseKey = $null
    $key = $null
    try {
      $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Hive, $view)
      $key = $baseKey.OpenSubKey($SubKey, $false)
      if ($null -eq $key) {
        continue
      }

      $values = [ordered]@{}
      foreach ($name in @($key.GetValueNames())) {
        $values[$name] = $key.GetValue(
          $name,
          $null,
          [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
        )
      }
      [void]$snapshots.Add([pscustomobject]@{
          hive = [string]$Hive
          view = [string]$view
          values = $values
        })
    }
    catch {
      continue
    }
    finally {
      if ($null -ne $key) {
        $key.Dispose()
      }
      if ($null -ne $baseKey) {
        $baseKey.Dispose()
      }
    }
  }
  return $snapshots.ToArray()
}

function Get-ExecutableFromCommand {
  param([AllowNull()][string]$Command)

  if ([string]::IsNullOrWhiteSpace($Command)) {
    return $null
  }

  $match = [regex]::Match($Command, '^\s*"?(.+?\.exe)"?(?:\s|$)', 'IgnoreCase')
  if (-not $match.Success) {
    return $null
  }
  return [Environment]::ExpandEnvironmentVariables($match.Groups[1].Value.Trim('"'))
}

function Get-PeArchitecture {
  param([Parameter(Mandatory)][string]$Path)

  $stream = $null
  $reader = $null
  try {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    $reader = New-Object IO.BinaryReader($stream)
    [void]$stream.Seek(0x3c, [IO.SeekOrigin]::Begin)
    $peOffset = $reader.ReadInt32()
    [void]$stream.Seek($peOffset + 4, [IO.SeekOrigin]::Begin)
    $machine = $reader.ReadUInt16()
    switch ($machine) {
      0x014c { return 'x86' }
      0x8664 { return 'x64' }
      0xaa64 { return 'arm64' }
      default { return ('unknown-0x{0:x4}' -f $machine) }
    }
  }
  catch {
    return 'unknown'
  }
  finally {
    if ($null -ne $reader) {
      $reader.Dispose()
    }
    elseif ($null -ne $stream) {
      $stream.Dispose()
    }
  }
}

function Get-LicenseStatusName {
  param([int]$Status)

  switch ($Status) {
    0 { return 'Unlicensed' }
    1 { return 'Licensed' }
    2 { return 'OOBGrace' }
    3 { return 'OOTGrace' }
    4 { return 'NonGenuineGrace' }
    5 { return 'Notification' }
    6 { return 'ExtendedGrace' }
    default { return 'Unknown' }
  }
}

function Test-TcpEndpoint {
  param(
    [Parameter(Mandatory)][string]$HostName,
    [Parameter(Mandatory)][int]$Port,
    [Parameter(Mandatory)][int]$TimeoutMilliseconds
  )

  $client = $null
  $waitHandle = $null
  try {
    $client = New-Object Net.Sockets.TcpClient
    $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
    $waitHandle = $asyncResult.AsyncWaitHandle
    if (-not $waitHandle.WaitOne($TimeoutMilliseconds, $false)) {
      return $false
    }
    $client.EndConnect($asyncResult)
    return $client.Connected
  }
  catch {
    return $false
  }
  finally {
    if ($null -ne $waitHandle) {
      $waitHandle.Dispose()
    }
    if ($null -ne $client) {
      $client.Dispose()
    }
  }
}

function Test-TlsEndpoint {
  param(
    [Parameter(Mandatory)][string]$HostName,
    [Parameter(Mandatory)][int]$Port,
    [Parameter(Mandatory)][int]$TimeoutMilliseconds
  )

  $client = $null
  $stream = $null
  $certificate = $null
  try {
    $client = New-Object Net.Sockets.TcpClient
    $asyncResult = $client.BeginConnect($HostName, $Port, $null, $null)
    $waitHandle = $asyncResult.AsyncWaitHandle
    try {
      if (-not $waitHandle.WaitOne($TimeoutMilliseconds, $false)) {
        throw 'TCP timeout'
      }
      $client.EndConnect($asyncResult)
    }
    finally {
      $waitHandle.Dispose()
    }

    $stream = New-Object Net.Security.SslStream($client.GetStream(), $false)
    $stream.ReadTimeout = $TimeoutMilliseconds
    $stream.WriteTimeout = $TimeoutMilliseconds
    $clientCertificates = New-Object Security.Cryptography.X509Certificates.X509CertificateCollection
    $stream.AuthenticateAsClient(
      $HostName,
      $clientCertificates,
      [Security.Authentication.SslProtocols]::None,
      $true
    )
    $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($stream.RemoteCertificate)
    return [pscustomobject]@{
      trusted = $true
      revocationChecked = $true
      protocol = [string]$stream.SslProtocol
      expiresAtUtc = $certificate.NotAfter.ToUniversalTime().ToString('o')
      daysRemaining = [math]::Floor(
        ($certificate.NotAfter.ToUniversalTime() - [DateTime]::UtcNow).TotalDays
      )
    }
  }
  catch {
    return [pscustomobject]@{
      trusted = $false
      revocationChecked = $true
      protocol = $null
      expiresAtUtc = $null
      daysRemaining = $null
    }
  }
  finally {
    if ($null -ne $certificate) {
      $certificate.Dispose()
    }
    if ($null -ne $stream) {
      $stream.Dispose()
    }
    if ($null -ne $client) {
      $client.Dispose()
    }
  }
}

function Get-UrlSecurityZone {
  param([Parameter(Mandatory)][string]$TargetUrl)

  try {
    if (-not ('DhyriumUrlZoneMapper' -as [type])) {
      Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("79EAC9EE-BAF9-11CE-8C82-00AA004BA90B")]
interface IDhyriumInternetSecurityManager {
    [PreserveSig] int SetSecuritySite(IntPtr pSite);
    [PreserveSig] int GetSecuritySite(out IntPtr ppSite);
    [PreserveSig] int MapUrlToZone([MarshalAs(UnmanagedType.LPWStr)] string url, out int zone, int flags);
    [PreserveSig] int GetSecurityId([MarshalAs(UnmanagedType.LPWStr)] string url, IntPtr securityId, ref int securityIdSize, int reserved);
    [PreserveSig] int ProcessUrlAction([MarshalAs(UnmanagedType.LPWStr)] string url, int action, IntPtr policy, int policySize, IntPtr context, int contextSize, int flags, int reserved);
    [PreserveSig] int QueryCustomPolicy([MarshalAs(UnmanagedType.LPWStr)] string url, ref Guid key, out IntPtr policy, out int policySize, IntPtr context, int contextSize, int reserved);
    [PreserveSig] int SetZoneMapping(int zone, [MarshalAs(UnmanagedType.LPWStr)] string pattern, int flags);
    [PreserveSig] int GetZoneMappings(int zone, out IntPtr enumString, int flags);
}

public static class DhyriumUrlZoneMapper {
    [DllImport("urlmon.dll")]
    private static extern int CoInternetCreateSecurityManager(IntPtr serviceProvider, out IDhyriumInternetSecurityManager manager, int reserved);

    public static int Map(string url) {
        IDhyriumInternetSecurityManager manager;
        int result = CoInternetCreateSecurityManager(IntPtr.Zero, out manager, 0);
        if (result != 0) Marshal.ThrowExceptionForHR(result);
        try {
            int zone;
            result = manager.MapUrlToZone(url, out zone, 0);
            if (result != 0) Marshal.ThrowExceptionForHR(result);
            return zone;
        }
        finally {
            if (manager != null) Marshal.FinalReleaseComObject(manager);
        }
    }
}
'@
    }
    return [DhyriumUrlZoneMapper]::Map($TargetUrl)
  }
  catch {
    return -1
  }
}

function Test-OriginPattern {
  param(
    [AllowNull()][string]$Pattern,
    [Parameter(Mandatory)][string]$Origin
  )

  if ([string]::IsNullOrWhiteSpace($Pattern)) {
    return $false
  }
  if ($Pattern -eq '*') {
    return $true
  }
  return $Origin.TrimEnd('/') -like $Pattern.TrimEnd('/')
}

function Get-ChromePolicySummary {
  param(
    [Parameter(Mandatory)][string]$Origin,
    [Parameter(Mandatory)][string]$HostName
  )

  $policyRootsFound = New-Object 'System.Collections.Generic.HashSet[string]'
  $autoLaunchRules = 0
  $msWordRules = 0
  $msWordOriginAllowed = $false
  $alwaysOpenCheckbox = $false
  $urlAllowlistEntries = 0
  $urlAllowlistMatchesHost = $false

  foreach ($hive in @(
      [Microsoft.Win32.RegistryHive]::LocalMachine,
      [Microsoft.Win32.RegistryHive]::CurrentUser
    )) {
    $rootSnapshots = @(Get-RegistryKeySnapshot -Hive $hive -SubKey 'SOFTWARE\Policies\Google\Chrome')
    foreach ($snapshot in $rootSnapshots) {
      [void]$policyRootsFound.Add(('{0}:{1}' -f $snapshot.hive, $snapshot.view))
      if ($snapshot.values.Contains('ExternalProtocolDialogShowAlwaysOpenCheckbox')) {
        $alwaysOpenCheckbox = $alwaysOpenCheckbox -or (
          [int]$snapshot.values['ExternalProtocolDialogShowAlwaysOpenCheckbox'] -eq 1
        )
      }

      if ($snapshot.values.Contains('AutoLaunchProtocolsFromOrigins')) {
        $rawPolicyValues = @($snapshot.values['AutoLaunchProtocolsFromOrigins'])
        foreach ($rawPolicyValue in $rawPolicyValues) {
          try {
            $rules = @(([string]$rawPolicyValue | ConvertFrom-Json))
            foreach ($rule in $rules) {
              $autoLaunchRules++
              if ([string]$rule.protocol -ne 'ms-word') {
                continue
              }
              $msWordRules++
              foreach ($allowedOrigin in @($rule.allowed_origins)) {
                if (Test-OriginPattern -Pattern ([string]$allowedOrigin) -Origin $Origin) {
                  $msWordOriginAllowed = $true
                }
              }
            }
          }
          catch {
          }
        }
      }
    }

    $autoLaunchSnapshots = @(
      Get-RegistryKeySnapshot `
        -Hive $hive `
        -SubKey 'SOFTWARE\Policies\Google\Chrome\AutoLaunchProtocolsFromOrigins'
    )
    foreach ($snapshot in $autoLaunchSnapshots) {
      [void]$policyRootsFound.Add(('{0}:{1}' -f $snapshot.hive, $snapshot.view))
      foreach ($rawPolicyValue in @($snapshot.values.Values)) {
        try {
          $rule = [string]$rawPolicyValue | ConvertFrom-Json
          $autoLaunchRules++
          if ([string]$rule.protocol -ne 'ms-word') {
            continue
          }
          $msWordRules++
          foreach ($allowedOrigin in @($rule.allowed_origins)) {
            if (Test-OriginPattern -Pattern ([string]$allowedOrigin) -Origin $Origin) {
              $msWordOriginAllowed = $true
            }
          }
        }
        catch {
        }
      }
    }

    $allowlistSnapshots = @(
      Get-RegistryKeySnapshot `
        -Hive $hive `
        -SubKey 'SOFTWARE\Policies\Google\Chrome\URLAllowlist'
    )
    foreach ($snapshot in $allowlistSnapshots) {
      [void]$policyRootsFound.Add(('{0}:{1}' -f $snapshot.hive, $snapshot.view))
      foreach ($allowlistValue in @($snapshot.values.Values)) {
        $urlAllowlistEntries++
        if ([string]$allowlistValue -like ('*{0}*' -f $HostName)) {
          $urlAllowlistMatchesHost = $true
        }
      }
    }
  }

  return [pscustomobject]@{
    configuredScopes = $policyRootsFound.Count
    autoLaunchRules = $autoLaunchRules
    msWordRules = $msWordRules
    msWordOriginAllowed = $msWordOriginAllowed
    alwaysOpenCheckbox = $alwaysOpenCheckbox
    urlAllowlistEntries = $urlAllowlistEntries
    urlAllowlistMatchesHost = $urlAllowlistMatchesHost
  }
}

$targetScheme = $DocumentOrigin.Scheme.ToLowerInvariant()
$targetHost = $DocumentOrigin.DnsSafeHost
$targetPort = $DocumentOrigin.Port
$targetOriginBuilder = New-Object UriBuilder($targetScheme, $targetHost, $targetPort)
$targetOrigin = $targetOriginBuilder.Uri.GetLeftPart([UriPartial]::Authority)
$launchOriginValue = $LaunchOrigin.GetLeftPart([UriPartial]::Authority)
$timeoutMilliseconds = $TimeoutSeconds * 1000

$appPathLocations = @(
  [pscustomobject]@{
    hive = [Microsoft.Win32.RegistryHive]::LocalMachine
    subKey = 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE'
  },
  [pscustomobject]@{
    hive = [Microsoft.Win32.RegistryHive]::CurrentUser
    subKey = 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\WINWORD.EXE'
  }
)
$wordAppEntry = Find-RegistryEntry -Locations $appPathLocations -ValueName ''
$wordPath = $null
if ($wordAppEntry.found) {
  $wordPath = [Environment]::ExpandEnvironmentVariables(
    ([string]$wordAppEntry.value).Trim('"')
  )
}

$clickToRunLocations = @(
  [pscustomobject]@{
    hive = [Microsoft.Win32.RegistryHive]::LocalMachine
    subKey = 'SOFTWARE\Microsoft\Office\ClickToRun\Configuration'
  }
)
$officePlatform = Find-RegistryEntry -Locations $clickToRunLocations -ValueName 'Platform'
$officeVersion = Find-RegistryEntry -Locations $clickToRunLocations -ValueName 'VersionToReport'
$officeCulture = Find-RegistryEntry -Locations $clickToRunLocations -ValueName 'ClientCulture'
$officeProducts = Find-RegistryEntry -Locations $clickToRunLocations -ValueName 'ProductReleaseIds'
$wordReleaseIds = @()
if ($officeProducts.found) {
  $wordReleaseIds = @(
    ([string]$officeProducts.value).Split(',') |
      Where-Object { $_ -like 'Word*' }
  )
}

$wordExists = -not [string]::IsNullOrWhiteSpace($wordPath) -and
  (Test-Path -LiteralPath $wordPath -PathType Leaf)
$wordFileVersion = $null
$wordArchitecture = $null
if ($wordExists) {
  $wordFileVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($wordPath).FileVersion
  $wordArchitecture = Get-PeArchitecture -Path $wordPath
}

$wordInstallStatus = 'FAIL'
$wordInstallSummary = 'Microsoft Word no fue encontrado en App Paths.'
if ($wordExists) {
  if ($wordArchitecture -eq 'x64') {
    $wordInstallStatus = 'PASS'
    $wordInstallSummary = 'Microsoft Word x64 esta instalado y su ejecutable es legible.'
  }
  else {
    $wordInstallStatus = 'WARN'
    $wordInstallSummary = 'Microsoft Word esta instalado, pero no se confirmo una instalacion x64.'
  }
}
Add-Check `
  -Id 'word.installation' `
  -Status $wordInstallStatus `
  -Summary $wordInstallSummary `
  -Evidence ([ordered]@{
      executable = $wordPath
      fileVersion = $wordFileVersion
      architecture = $wordArchitecture
      clickToRunPlatform = if ($officePlatform.found) { [string]$officePlatform.value } else { $null }
      clickToRunVersion = if ($officeVersion.found) { [string]$officeVersion.value } else { $null }
      culture = if ($officeCulture.found) { [string]$officeCulture.value } else { $null }
      wordReleaseIds = @($wordReleaseIds)
    }) `
  -Recommendation 'Instalar o reparar Microsoft Word de escritorio x64 si este control no aprueba.'

$licenseEvidence = [ordered]@{
  queryAvailable = $false
  matchingWordProducts = 0
  licensedWordProducts = 0
  observedStatuses = @()
}
$licenseStatus = 'WARN'
$licenseSummary = 'No se pudo confirmar el estado de licencia de Word.'
try {
  $officeApplicationId = '0ff1ce15-a989-479d-af46-f275c6370663'
  $licenseRows = @(
    Get-CimInstance `
      -ClassName SoftwareLicensingProduct `
      -Filter "ApplicationID='$officeApplicationId' AND PartialProductKey IS NOT NULL" |
      Where-Object {
        $_.Name -match '(?i)(Word|Office.*(ProPlus|Professional|Standard|LTSC))'
      }
  )
  $licensedRows = @($licenseRows | Where-Object { [int]$_.LicenseStatus -eq 1 })
  $statusNames = @(
    $licenseRows |
      ForEach-Object { Get-LicenseStatusName -Status ([int]$_.LicenseStatus) } |
      Sort-Object -Unique
  )
  $licenseEvidence.queryAvailable = $true
  $licenseEvidence.matchingWordProducts = $licenseRows.Count
  $licenseEvidence.licensedWordProducts = $licensedRows.Count
  $licenseEvidence.observedStatuses = @($statusNames)
  if ($licensedRows.Count -gt 0) {
    $licenseStatus = 'PASS'
    $licenseSummary = 'Windows informa al menos una licencia de Word activa.'
  }
  elseif ($licenseRows.Count -gt 0) {
    $licenseStatus = 'FAIL'
    $licenseSummary = 'Windows encontro Word, pero ninguna licencia activa.'
  }
  else {
    $licenseSummary = 'Windows no devolvio un producto Word verificable.'
  }
}
catch {
  $licenseSummary = 'La consulta local de licencia no estuvo disponible.'
}
Add-Check `
  -Id 'word.license' `
  -Status $licenseStatus `
  -Summary $licenseSummary `
  -Evidence $licenseEvidence `
  -Recommendation 'Revisar activacion desde Word > Cuenta sin compartir claves ni identificadores de licencia.'

$userDocxChoice = Get-RegistryEntry `
  -Hive ([Microsoft.Win32.RegistryHive]::CurrentUser) `
  -SubKey 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.docx\UserChoice' `
  -ValueName 'ProgId'
$machineDocxChoice = Get-RegistryEntry `
  -Hive ([Microsoft.Win32.RegistryHive]::ClassesRoot) `
  -SubKey '.docx' `
  -ValueName ''
$docxProgId = if ($userDocxChoice.found) {
  [string]$userDocxChoice.value
}
elseif ($machineDocxChoice.found) {
  [string]$machineDocxChoice.value
}
else {
  $null
}
$docxCommandEntry = if (-not [string]::IsNullOrWhiteSpace($docxProgId)) {
  Get-RegistryEntry `
    -Hive ([Microsoft.Win32.RegistryHive]::ClassesRoot) `
    -SubKey (('{0}\shell\Open\command' -f $docxProgId)) `
    -ValueName ''
}
else {
  [pscustomobject]@{ found = $false; value = $null }
}
$docxHandler = if ($docxCommandEntry.found) {
  Get-ExecutableFromCommand -Command ([string]$docxCommandEntry.value)
}
else {
  $null
}
$docxUsesWord = -not [string]::IsNullOrWhiteSpace($docxHandler) -and
  ([IO.Path]::GetFileName($docxHandler) -eq 'WINWORD.EXE') -and
  (Test-Path -LiteralPath $docxHandler -PathType Leaf)
Add-Check `
  -Id 'association.docx' `
  -Status $(if ($docxUsesWord) { 'PASS' } else { 'WARN' }) `
  -Summary $(if ($docxUsesWord) {
      'La extension .docx esta asociada con Microsoft Word.'
    }
    else {
      'La extension .docx no usa Word por defecto; ms-word puede seguir funcionando.'
    }) `
  -Evidence ([ordered]@{
      source = if ($userDocxChoice.found) { 'CurrentUser' } else { 'ClassesRoot' }
      progId = $docxProgId
      handlerExecutable = $docxHandler
    }) `
  -Recommendation 'Restablecer Microsoft Word como aplicacion predeterminada para .docx desde Configuracion de Windows.'

$msWordProtocol = Get-RegistryEntry `
  -Hive ([Microsoft.Win32.RegistryHive]::ClassesRoot) `
  -SubKey 'ms-word' `
  -ValueName 'URL Protocol'
$msWordCommand = Get-RegistryEntry `
  -Hive ([Microsoft.Win32.RegistryHive]::ClassesRoot) `
  -SubKey 'ms-word\shell\open\command' `
  -ValueName ''
$msWordHandler = if ($msWordCommand.found) {
  Get-ExecutableFromCommand -Command ([string]$msWordCommand.value)
}
else {
  $null
}
$msWordReady = $msWordProtocol.found -and
  -not [string]::IsNullOrWhiteSpace($msWordHandler) -and
  (Test-Path -LiteralPath $msWordHandler -PathType Leaf)
Add-Check `
  -Id 'association.ms-word' `
  -Status $(if ($msWordReady) { 'PASS' } else { 'FAIL' }) `
  -Summary $(if ($msWordReady) {
      'El esquema ms-word esta registrado con un controlador local valido.'
    }
    else {
      'El esquema ms-word no tiene un controlador local valido.'
    }) `
  -Evidence ([ordered]@{
      urlProtocolRegistered = $msWordProtocol.found
      handlerExecutable = $msWordHandler
    }) `
  -Recommendation 'Reparar Microsoft Office si Windows no registra el esquema ms-word.'

$webClientService = $null
try {
  $webClientService = Get-CimInstance -ClassName Win32_Service -Filter "Name='WebClient'"
}
catch {
}
$webClientStatus = 'FAIL'
$webClientSummary = 'El servicio WebClient no fue encontrado.'
if ($null -ne $webClientService) {
  if ([string]$webClientService.StartMode -eq 'Disabled') {
    $webClientStatus = 'FAIL'
    $webClientSummary = 'WebClient esta deshabilitado y no puede iniciar autoria WebDAV.'
  }
  elseif ([string]$webClientService.State -eq 'Running') {
    $webClientStatus = 'PASS'
    $webClientSummary = 'El servicio WebClient esta en ejecucion.'
  }
  else {
    $webClientStatus = 'WARN'
    $webClientSummary = 'WebClient existe, pero no esta ejecutandose en este momento.'
  }
}
Add-Check `
  -Id 'webclient.service' `
  -Status $webClientStatus `
  -Summary $webClientSummary `
  -Evidence ([ordered]@{
      installed = $null -ne $webClientService
      state = if ($null -ne $webClientService) { [string]$webClientService.State } else { $null }
      startMode = if ($null -ne $webClientService) { [string]$webClientService.StartMode } else { $null }
    }) `
  -Recommendation 'La administracion de la estacion debe habilitar WebClient; este diagnostico no cambia el servicio.'

$webClientLocation = @(
  [pscustomobject]@{
    hive = [Microsoft.Win32.RegistryHive]::LocalMachine
    subKey = 'SYSTEM\CurrentControlSet\Services\WebClient\Parameters'
  }
)
$webClientParameterNames = @(
  'AcceptOfficeAndTahoeServers',
  'BasicAuthLevel',
  'FileSizeLimitInBytes',
  'FileAttributesLimitInBytes',
  'SendReceiveTimeoutInSec',
  'ServerNotFoundCacheLifeTimeInSec',
  'SupportLocking',
  'AuthForwardServerList'
)
$webClientParameters = [ordered]@{}
foreach ($parameterName in $webClientParameterNames) {
  $parameterEntry = Find-RegistryEntry `
    -Locations $webClientLocation `
    -ValueName $parameterName
  $webClientParameters[$parameterName] = if ($parameterEntry.found) {
    $parameterEntry.value
  }
  else {
    $null
  }
}
$authForwardEntries = @($webClientParameters.AuthForwardServerList)
$authForwardConfiguredEntries = @(
  $authForwardEntries |
    Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
)
$authForwardMatchesTarget = @(
  $authForwardConfiguredEntries |
    Where-Object { [string]$_ -like ('*{0}*' -f $targetHost) }
).Count -gt 0
$supportLockingConfigured = $webClientParameters.SupportLocking
$supportLockingEffective = if ($null -eq $supportLockingConfigured) {
  1
}
else {
  [int]$supportLockingConfigured
}
$acceptOfficeConfigured = $webClientParameters.AcceptOfficeAndTahoeServers
$acceptOfficeEffective = if ($null -eq $acceptOfficeConfigured) {
  1
}
else {
  [int]$acceptOfficeConfigured
}
$webClientParameterStatus = if (
  $supportLockingEffective -ne 1 -or $acceptOfficeEffective -ne 1
) {
  'FAIL'
}
else {
  'PASS'
}
Add-Check `
  -Id 'webclient.parameters' `
  -Status $webClientParameterStatus `
  -Summary $(if ($webClientParameterStatus -eq 'PASS') {
      'WebClient admite servidores Office y bloqueo para autoria WebDAV.'
    }
    elseif ($webClientParameterStatus -eq 'FAIL') {
      'WebClient tiene deshabilitado el soporte de bloqueo WebDAV.'
    }
    else {
      'No se pudo confirmar la configuracion efectiva de WebDAV.'
    }) `
  -Evidence ([ordered]@{
      basicAuthLevel = $webClientParameters.BasicAuthLevel
      acceptOfficeAndTahoeServers = $acceptOfficeEffective
      acceptOfficeAndTahoeServersSource = if ($null -eq $acceptOfficeConfigured) {
        'windows-default'
      }
      else {
        'registry'
      }
      supportLocking = $supportLockingEffective
      supportLockingSource = if ($null -eq $supportLockingConfigured) {
        'windows-default'
      }
      else {
        'registry'
      }
      fileAttributesLimitInBytes = $webClientParameters.FileAttributesLimitInBytes
      sendReceiveTimeoutInSec = $webClientParameters.SendReceiveTimeoutInSec
      serverNotFoundCacheLifeTimeInSec = $webClientParameters.ServerNotFoundCacheLifeTimeInSec
      authForwardServerEntries = $authForwardConfiguredEntries.Count
      authForwardMatchesTarget = $authForwardMatchesTarget
    }) `
  -Recommendation 'Mantener SupportLocking=1 para LOCK/PUT/UNLOCK; cualquier cambio debe aplicarlo un administrador fuera de este script.'

$fileSizeLimitConfigured = $webClientParameters.FileSizeLimitInBytes
$fileSizeLimitEffective = if ($null -eq $fileSizeLimitConfigured) {
  50000000L
}
else {
  [long]$fileSizeLimitConfigured
}
$fileLimitStatus = 'WARN'
$fileLimitSummary = 'No se proporciono el tamano del DOCX; el limite no acredita compatibilidad.'
if ($ExpectedFileSizeBytes -gt 0) {
  if ($fileSizeLimitEffective -lt $ExpectedFileSizeBytes) {
    $fileLimitStatus = 'FAIL'
    $fileLimitSummary = 'El DOCX esperado supera el limite configurado de WebClient.'
  }
  else {
    $fileLimitStatus = 'PASS'
    $fileLimitSummary = 'El DOCX esperado cabe dentro del limite efectivo de WebClient.'
  }
}
Add-Check `
  -Id 'webclient.file-limit' `
  -Status $fileLimitStatus `
  -Summary $fileLimitSummary `
  -Evidence ([ordered]@{
      limitBytes = $fileSizeLimitEffective
      limitMiB = [math]::Round(([double]$fileSizeLimitEffective / 1MB), 2)
      limitSource = if ($null -eq $fileSizeLimitConfigured) {
        'windows-default'
      }
      else {
        'registry'
      }
      expectedFileSizeBytes = if ($ExpectedFileSizeBytes -gt 0) {
        $ExpectedFileSizeBytes
      }
      else {
        $null
      }
    }) `
  -Recommendation 'Comparar siempre el DOCX real con FileSizeLimitInBytes antes de crear una sesion Word.'

$httpsReady = $targetScheme -eq 'https'
Add-Check `
  -Id 'target.https' `
  -Status $(if ($httpsReady) { 'PASS' } else { 'FAIL' }) `
  -Summary $(if ($httpsReady) {
      'La URL externa utiliza HTTPS.'
    }
    else {
      'La URL externa no utiliza HTTPS.'
    }) `
  -Evidence ([ordered]@{
      scheme = $targetScheme
      port = $targetPort
    }) `
  -Recommendation 'Usar un nombre HTTPS estable con certificado confiable para la integracion con Word.'

$parsedIp = $null
$isLiteralIp = [Net.IPAddress]::TryParse($targetHost, [ref]$parsedIp)
$isLoopback = $targetHost -in @('localhost', 'localhost.localdomain')
if ($isLiteralIp) {
  $isLoopback = [Net.IPAddress]::IsLoopback($parsedIp)
}
Add-Check `
  -Id 'target.external-host' `
  -Status $(if ($isLoopback) { 'FAIL' } else { 'PASS' }) `
  -Summary $(if ($isLoopback) {
      'La URL usa loopback y no es una direccion externa utilizable por otra estacion.'
    }
    else {
      'La URL usa un host externo a loopback.'
    }) `
  -Evidence ([ordered]@{
      literalIp = $isLiteralIp
      loopback = $isLoopback
    }) `
  -Recommendation 'Publicar la ruta Word en un nombre accesible desde las estaciones cliente.'

$dnsStatus = 'FAIL'
$dnsSummary = 'El host no pudo resolverse.'
$dnsEvidence = [ordered]@{
  literalIp = $isLiteralIp
  addressCount = 0
  addressFamilies = @()
}
try {
  $addresses = @([Net.Dns]::GetHostAddresses($targetHost))
  $dnsEvidence.addressCount = $addresses.Count
  $dnsEvidence.addressFamilies = @(
    $addresses |
      ForEach-Object { [string]$_.AddressFamily } |
      Sort-Object -Unique
  )
  if ($addresses.Count -gt 0) {
    $dnsStatus = 'PASS'
    $dnsSummary = if ($isLiteralIp) {
      'El host es una direccion IP valida.'
    }
    else {
      'El nombre externo se resolvio correctamente.'
    }
  }
}
catch {
}
Add-Check `
  -Id 'target.dns' `
  -Status $dnsStatus `
  -Summary $dnsSummary `
  -Evidence $dnsEvidence `
  -Recommendation 'Corregir DNS o la URL antes de entregar el enlace a Word.'

$tcpReady = Test-TcpEndpoint `
  -HostName $targetHost `
  -Port $targetPort `
  -TimeoutMilliseconds $timeoutMilliseconds
Add-Check `
  -Id 'target.tcp' `
  -Status $(if ($tcpReady) { 'PASS' } else { 'FAIL' }) `
  -Summary $(if ($tcpReady) {
      'La estacion alcanzo el host y puerto configurados.'
    }
    else {
      'La estacion no pudo conectar con el host y puerto configurados.'
    }) `
  -Evidence ([ordered]@{
      port = $targetPort
      timeoutSeconds = $TimeoutSeconds
    }) `
  -Recommendation 'Revisar servicio, proxy y firewall de red sin desactivar controles de seguridad globales.'

$tlsEvidence = [ordered]@{
  evaluated = $false
  trusted = $false
  revocationChecked = $false
  protocol = $null
  expiresAtUtc = $null
  daysRemaining = $null
}
$tlsStatus = 'FAIL'
$tlsSummary = 'No se puede validar un certificado porque la URL no utiliza HTTPS.'
if ($httpsReady -and $tcpReady) {
  $tlsResult = Test-TlsEndpoint `
    -HostName $targetHost `
    -Port $targetPort `
    -TimeoutMilliseconds $timeoutMilliseconds
  $tlsEvidence.evaluated = $true
  $tlsEvidence.trusted = $tlsResult.trusted
  $tlsEvidence.revocationChecked = $tlsResult.revocationChecked
  $tlsEvidence.protocol = $tlsResult.protocol
  $tlsEvidence.expiresAtUtc = $tlsResult.expiresAtUtc
  $tlsEvidence.daysRemaining = $tlsResult.daysRemaining
  if ($tlsResult.trusted) {
    if ($tlsResult.daysRemaining -lt 30) {
      $tlsStatus = 'WARN'
      $tlsSummary = 'El certificado es confiable, pero expira en menos de 30 dias.'
    }
    else {
      $tlsStatus = 'PASS'
      $tlsSummary = 'Cadena, nombre y revocacion del certificado HTTPS fueron validados.'
    }
  }
  else {
    $tlsSummary = 'La estacion no confia en el certificado HTTPS o el nombre no coincide.'
  }
}
elseif ($httpsReady) {
  $tlsSummary = 'No se pudo evaluar TLS porque el host HTTPS no fue alcanzable.'
}
Add-Check `
  -Id 'target.certificate' `
  -Status $tlsStatus `
  -Summary $tlsSummary `
  -Evidence $tlsEvidence `
  -Recommendation 'Instalar un certificado emitido por una CA confiable y cuyo SAN contenga el nombre externo.'

$zoneId = Get-UrlSecurityZone -TargetUrl $DocumentOrigin.AbsoluteUri
$zoneNames = @{
  0 = 'LocalMachine'
  1 = 'LocalIntranet'
  2 = 'TrustedSites'
  3 = 'Internet'
  4 = 'RestrictedSites'
}
$zoneName = if ($zoneNames.ContainsKey($zoneId)) {
  $zoneNames[$zoneId]
}
else {
  'Unknown'
}
$zoneStatus = if ($zoneId -in @(1, 2)) {
  'PASS'
}
elseif ($zoneId -eq 4 -or $zoneId -lt 0) {
  'FAIL'
}
else {
  'WARN'
}
$zoneSummary = switch ($zoneId) {
  1 { 'Windows clasifica la URL como Intranet local.' }
  2 { 'Windows clasifica la URL como Sitio de confianza.' }
  3 { 'Windows clasifica la URL como Internet; Word puede aplicar Vista protegida.' }
  4 { 'Windows clasifica la URL como Sitio restringido.' }
  0 { 'Windows clasifica la URL como Equipo local.' }
  default { 'No se pudo determinar la zona de seguridad de Windows.' }
}
Add-Check `
  -Id 'target.security-zone' `
  -Status $zoneStatus `
  -Summary $zoneSummary `
  -Evidence ([ordered]@{
      zoneId = $zoneId
      zoneName = $zoneName
    }) `
  -Recommendation 'Administrar solo el dominio Dhyrium en Intranet o Sitios de confianza; no desactivar Vista protegida globalmente.'

$chromePolicy = Get-ChromePolicySummary `
  -Origin $launchOriginValue `
  -HostName $LaunchOrigin.DnsSafeHost
$chromeStatus = if ($chromePolicy.msWordOriginAllowed) {
  'PASS'
}
else {
  'WARN'
}
$chromeSummary = if ($chromePolicy.msWordOriginAllowed) {
  'Chrome permite iniciar ms-word automaticamente desde el origen evaluado.'
}
elseif ($chromePolicy.alwaysOpenCheckbox) {
  'Chrome permite recordar la eleccion, pero no hay una regla automatica ms-word para este origen.'
}
else {
  'No hay una politica Chrome que evite la confirmacion del protocolo externo ms-word.'
}
Add-Check `
  -Id 'chrome.external-protocol' `
  -Status $chromeStatus `
  -Summary $chromeSummary `
  -Evidence ([ordered]@{
      policyScopesFound = $chromePolicy.configuredScopes
      launchOrigin = $launchOriginValue
      autoLaunchRules = $chromePolicy.autoLaunchRules
      msWordRules = $chromePolicy.msWordRules
      msWordOriginAllowed = $chromePolicy.msWordOriginAllowed
      alwaysOpenCheckbox = $chromePolicy.alwaysOpenCheckbox
      urlAllowlistEntries = $chromePolicy.urlAllowlistEntries
      urlAllowlistMatchesHost = $chromePolicy.urlAllowlistMatchesHost
    }) `
  -Recommendation 'Si se administra Chrome, autorizar ms-word solo para el origen HTTPS de Dhyrium; no usar comodines globales.'

$failCount = @($checks | Where-Object { $_.status -eq 'FAIL' }).Count
$warnCount = @($checks | Where-Object { $_.status -eq 'WARN' }).Count
$passCount = @($checks | Where-Object { $_.status -eq 'PASS' }).Count
$overallStatus = if ($failCount -gt 0) {
  'FAIL'
}
elseif ($warnCount -gt 0) {
  'WARN'
}
else {
  'PASS'
}

$stationBlockingIds = @(
  'word.installation',
  'word.license',
  'association.ms-word',
  'webclient.service',
  'webclient.parameters',
  'webclient.file-limit',
  'target.dns',
  'target.tcp'
)
$stationCompatible = @(
  $checks |
    Where-Object {
      $_.id -in $stationBlockingIds -and $_.status -eq 'FAIL'
    }
).Count -eq 0
$requiresUserEnableEditing = $zoneId -notin @(1, 2)
$seamlessBlockingIds = @(
  $stationBlockingIds + @(
    'target.https',
    'target.certificate',
    'target.security-zone',
    'chrome.external-protocol'
  )
)
$seamlessEditingReady = @(
  $checks |
    Where-Object {
      $_.id -in $seamlessBlockingIds -and $_.status -ne 'PASS'
    }
).Count -eq 0

$result = [ordered]@{
  schemaVersion = 1
  scope = 'WORKSTATION_ONLY'
  generatedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  readOnly = $true
  target = [ordered]@{
    documentOrigin = $targetOrigin
    launchOrigin = $launchOriginValue
    webDavEndpointChecked = $false
  }
  overallStatus = $overallStatus
  readiness = [ordered]@{
    stationCompatible = $stationCompatible
    requiresUserEnableEditing = $requiresUserEnableEditing
    seamlessEditingReady = $seamlessEditingReady
  }
  summary = [ordered]@{
    total = $checks.Count
    pass = $passCount
    warn = $warnCount
    fail = $failCount
  }
  checks = $checks.ToArray()
}

$json = $result | ConvertTo-Json -Depth 10
[Console]::Out.WriteLine($json)

if ($overallStatus -eq 'FAIL') {
  exit 3
}
if ($overallStatus -eq 'WARN') {
  exit 2
}
exit 0
