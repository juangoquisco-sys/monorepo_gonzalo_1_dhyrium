[CmdletBinding()]
param(
  [string]$ProfilePath,
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $ProfilePath) {
  $ProfilePath = Join-Path $PSScriptRoot 'word-home-profile.json'
}
if (-not $OutputPath) {
  $OutputPath = Join-Path $PSScriptRoot '../../.agent-local/evidence/h02-word-home/word-home-command-state.json'
}

function Invoke-CommandBarsQuery {
  param(
    [Parameter(Mandatory)]$CommandBars,
    [Parameter(Mandatory)][string]$Method,
    [Parameter(Mandatory)][string]$ControlId
  )

  try {
    return $CommandBars.$Method($ControlId)
  }
  catch {
    return $null
  }
}

function Release-ComObject {
  param($Value)

  if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
  }
}

$resolvedProfilePath = (Resolve-Path -LiteralPath $ProfilePath).Path
$profile = Get-Content -LiteralPath $resolvedProfilePath -Raw -Encoding UTF8 |
  ConvertFrom-Json

$word = $null
$documents = $null
$document = $null
$styles = $null
$normalStyle = $null
$normalFont = $null
$commandBars = $null
$languageSettings = $null
[uint32]$wordProcessId = 0
$wordProcessIdsBefore = @(
  Get-Process WINWORD -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Id
)

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  $processDeadline = (Get-Date).AddSeconds(2)
  do {
    $newWordProcesses = @(
      Get-Process WINWORD -ErrorAction SilentlyContinue |
        Where-Object { $_.Id -notin $wordProcessIdsBefore }
    )
    if ($newWordProcesses.Count -gt 0) {
      break
    }
    Start-Sleep -Milliseconds 50
  } while ((Get-Date) -lt $processDeadline)

  if ($newWordProcesses.Count -gt 1) {
    throw 'No se pudo identificar de forma exclusiva la instancia Word de prueba.'
  }
  if ($newWordProcesses.Count -eq 1) {
    $wordProcessId = [uint32]$newWordProcesses[0].Id
  }

  try {
    # msoAutomationSecurityForceDisable. La prueba nunca ejecuta macros.
    $word.AutomationSecurity = 3
  }
  catch {
    # Algunas instalaciones administradas no permiten cambiar esta propiedad.
  }

  $documents = $word.Documents
  $document = $documents.Add()
  $styles = $document.Styles
  $normalStyle = $styles.Item(-1)
  $normalFont = $normalStyle.Font
  $commandBars = $word.CommandBars
  $languageSettings = $word.LanguageSettings

  $controls = foreach ($control in $profile.controls) {
    $label = Invoke-CommandBarsQuery $commandBars 'GetLabelMso' $control.id
    $visible = Invoke-CommandBarsQuery $commandBars 'GetVisibleMso' $control.id
    $enabled = Invoke-CommandBarsQuery $commandBars 'GetEnabledMso' $control.id
    $pressed = Invoke-CommandBarsQuery $commandBars 'GetPressedMso' $control.id
    $keyTip = Invoke-CommandBarsQuery $commandBars 'GetKeytipMso' $control.id
    $screenTip = Invoke-CommandBarsQuery $commandBars 'GetScreentipMso' $control.id
    $superTip = Invoke-CommandBarsQuery $commandBars 'GetSupertipMso' $control.id

    [ordered]@{
      group = [string]$control.group
      id = [string]$control.id
      required = [bool]$control.required
      available = $null -ne $label
      label = $label
      visible = $visible
      enabled = $enabled
      pressed = $pressed
      keyTip = $keyTip
      screenTip = $screenTip
      superTip = $superTip
    }
  }

  $winwordPath = Join-Path $word.Path 'WINWORD.EXE'
  $fileVersion = if (Test-Path -LiteralPath $winwordPath) {
    (Get-Item -LiteralPath $winwordPath).VersionInfo.FileVersion
  }
  else {
    $null
  }

  $missingRequired = @(
    $controls | Where-Object { $_.required -and -not $_.available }
  )

  $result = [ordered]@{
    schemaVersion = 1
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    profileId = [string]$profile.profileId
    word = [ordered]@{
      version = [string]$word.Version
      build = [string]$word.Build
      executable = $winwordPath
      fileVersion = $fileVersion
      processId = $wordProcessId
      uiLanguageLcid = [int]$languageSettings.LanguageID(2)
      normalStyle = [ordered]@{
        name = [string]$normalStyle.NameLocal
        font = [string]$normalFont.Name
        sizePoints = [double]$normalFont.Size
      }
    }
    context = [ordered]@{
      document = 'blank-unsaved-fixture'
      selectionLength = 0
      macrosExecuted = $false
      commandsExecuted = $false
    }
    summary = [ordered]@{
      total = @($controls).Count
      available = @($controls | Where-Object available).Count
      missingRequired = $missingRequired.Count
    }
    controls = @($controls)
  }

  $resolvedOutputPath = [IO.Path]::GetFullPath($OutputPath)
  $outputDirectory = Split-Path -Parent $resolvedOutputPath
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  $result | ConvertTo-Json -Depth 8 |
    Set-Content -LiteralPath $resolvedOutputPath -Encoding UTF8

  Write-Output "Evidencia Word Inicio: $resolvedOutputPath"
  Write-Output (
    'Controles disponibles: {0}/{1}; requeridos ausentes: {2}' -f
      $result.summary.available,
      $result.summary.total,
      $result.summary.missingRequired
  )

  if ($missingRequired.Count -gt 0) {
    $missingIds = ($missingRequired | ForEach-Object id) -join ', '
    throw "Faltan controles requeridos del perfil: $missingIds"
  }
}
finally {
  if ($null -ne $document) {
    try {
      $document.Close(0)
    }
    catch {
    }
  }
  Release-ComObject $normalFont
  Release-ComObject $normalStyle
  Release-ComObject $styles
  Release-ComObject $commandBars
  Release-ComObject $languageSettings
  Release-ComObject $document
  Release-ComObject $documents

  if ($null -ne $word) {
    try {
      $word.Quit(0)
    }
    catch {
    }
  }

  Release-ComObject $word
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()

  if ($wordProcessId -gt 0) {
    $deadline = (Get-Date).AddSeconds(5)
    do {
      $remainingWord = Get-Process -Id $wordProcessId -ErrorAction SilentlyContinue
      if ($null -eq $remainingWord) {
        break
      }
      Start-Sleep -Milliseconds 100
    } while ((Get-Date) -lt $deadline)

    if ($null -ne $remainingWord) {
      if (
        $remainingWord.ProcessName -ne 'WINWORD' -or
        $remainingWord.MainWindowHandle -ne 0
      ) {
        throw 'La instancia COM de prueba no pudo cerrarse de forma segura.'
      }
      Stop-Process -Id $wordProcessId
    }
  }
}
