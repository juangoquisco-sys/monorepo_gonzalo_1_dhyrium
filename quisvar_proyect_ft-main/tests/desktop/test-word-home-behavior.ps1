[CmdletBinding()]
param(
  [string]$EvidenceDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $EvidenceDirectory) {
  $EvidenceDirectory = Join-Path $PSScriptRoot '../../.agent-local/evidence/h02-word-home/behavior'
}
$resolvedEvidenceDirectory = [IO.Path]::GetFullPath($EvidenceDirectory)
New-Item -ItemType Directory -Path $resolvedEvidenceDirectory -Force |
  Out-Null

function Release-ComObject {
  param($Value)

  if ($null -ne $Value -and [Runtime.InteropServices.Marshal]::IsComObject($Value)) {
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Value)
  }
}

function Assert-WordCondition {
  param(
    [Parameter(Mandatory)][bool]$Condition,
    [Parameter(Mandatory)][string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

$wordProcessIdsBefore = @(
  Get-Process WINWORD -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Id
)
$word = $null
$documents = $null
$document = $null
$selection = $null
$selectedFont = $null
$selectedParagraph = $null
$persistedRange = $null
$persistedFont = $null
$persistedParagraph = $null
[uint32]$wordProcessId = 0
$fixturePath = Join-Path $resolvedEvidenceDirectory 'word-home-behavior.docx'
$evidencePath = Join-Path $resolvedEvidenceDirectory 'word-home-behavior.json'

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
    # msoAutomationSecurityForceDisable. Esta prueba nunca ejecuta macros.
    $word.AutomationSecurity = 3
  }
  catch {
  }

  $documents = $word.Documents
  $document = $documents.Add()
  $selection = $word.Selection
  $selection.TypeText("Dhyrium Writer H02`rSegundo parrafo")

  $selection.SetRange(0, 7)
  $selectedFont = $selection.Font
  $selectedParagraph = $selection.ParagraphFormat
  $initialFontSize = [double]$selectedFont.Size

  $word.CommandBars.ExecuteMso('Bold')
  $boldAfterExecute = [int]$selectedFont.Bold
  Assert-WordCondition ($boldAfterExecute -ne 0) 'Negrita no se aplicó.'

  [void]$document.Undo(1)
  $boldAfterUndo = [int]$selectedFont.Bold
  Assert-WordCondition ($boldAfterUndo -eq 0) 'Deshacer no retiró Negrita.'

  [void]$document.Redo(1)
  $boldAfterRedo = [int]$selectedFont.Bold
  Assert-WordCondition ($boldAfterRedo -ne 0) 'Rehacer no restauró Negrita.'

  $word.CommandBars.ExecuteMso('FontSizeIncreaseWord')
  $fontSizeAfterGrow = [double]$selectedFont.Size
  Assert-WordCondition (
    $fontSizeAfterGrow -gt $initialFontSize
  ) 'Aumentar tamaño no modificó la selección.'

  $word.CommandBars.ExecuteMso('FontSizeDecreaseWord')
  $fontSizeAfterShrink = [double]$selectedFont.Size
  Assert-WordCondition (
    $fontSizeAfterShrink -eq $initialFontSize
  ) 'Disminuir tamaño no restauró el tamaño inicial.'

  $word.CommandBars.ExecuteMso('AlignCenter')
  $alignmentAfterExecute = [int]$selectedParagraph.Alignment
  Assert-WordCondition (
    $alignmentAfterExecute -eq 1
  ) 'Centrar no actualizó la alineación del párrafo.'

  $document.SaveAs2($fixturePath, 12)
  $document.Close(0)
  Release-ComObject $selectedParagraph
  $selectedParagraph = $null
  Release-ComObject $selectedFont
  $selectedFont = $null
  Release-ComObject $selection
  $selection = $null
  Release-ComObject $document
  $document = $null

  $document = $documents.Open($fixturePath, $false, $true)
  $persistedRange = $document.Range(0, 7)
  $persistedFont = $persistedRange.Font
  $persistedParagraph = $persistedRange.ParagraphFormat
  $boldAfterReopen = [int]$persistedFont.Bold
  $fontSizeAfterReopen = [double]$persistedFont.Size
  $alignmentAfterReopen = [int]$persistedParagraph.Alignment

  Assert-WordCondition (
    $boldAfterReopen -ne 0
  ) 'Negrita no persistió al reabrir el DOCX.'
  Assert-WordCondition (
    $fontSizeAfterReopen -eq $initialFontSize
  ) 'El tamaño final no persistió al reabrir el DOCX.'
  Assert-WordCondition (
    $alignmentAfterReopen -eq 1
  ) 'La alineación centrada no persistió al reabrir el DOCX.'

  $fileHash = (Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $result = [ordered]@{
    schemaVersion = 1
    capturedAt = (Get-Date).ToUniversalTime().ToString('o')
    word = [ordered]@{
      version = [string]$word.Version
      build = [string]$word.Build
      processId = $wordProcessId
    }
    fixture = [ordered]@{
      path = $fixturePath
      sha256 = $fileHash
      synthetic = $true
      macrosExecuted = $false
    }
    cases = @(
      [ordered]@{
        id = 'home.font.bold'
        execute = $boldAfterExecute
        undo = $boldAfterUndo
        redo = $boldAfterRedo
        persisted = $boldAfterReopen
        passed = $true
      },
      [ordered]@{
        id = 'home.font.grow-shrink'
        initial = $initialFontSize
        afterGrow = $fontSizeAfterGrow
        afterShrink = $fontSizeAfterShrink
        persisted = $fontSizeAfterReopen
        passed = $true
      },
      [ordered]@{
        id = 'home.paragraph.alignCenter'
        execute = $alignmentAfterExecute
        persisted = $alignmentAfterReopen
        passed = $true
      }
    )
    summary = [ordered]@{
      total = 3
      passed = 3
      failed = 0
    }
  }

  $result | ConvertTo-Json -Depth 8 |
    Set-Content -LiteralPath $evidencePath -Encoding UTF8
  Write-Output "Evidencia funcional Word Inicio: $evidencePath"
  Write-Output 'Casos aprobados: 3/3; DOCX guardado y reabierto correctamente.'
}
finally {
  if ($null -ne $document) {
    try {
      $document.Close(0)
    }
    catch {
    }
  }

  Release-ComObject $persistedParagraph
  Release-ComObject $persistedFont
  Release-ComObject $persistedRange
  Release-ComObject $selectedParagraph
  Release-ComObject $selectedFont
  Release-ComObject $selection
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
        throw 'La instancia Word sintética no pudo cerrarse de forma segura.'
      }
      Stop-Process -Id $wordProcessId
    }
  }
}
