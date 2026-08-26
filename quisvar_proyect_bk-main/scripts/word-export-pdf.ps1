[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$InputPath,
  [Parameter(Mandatory)][string]$OutputPath,
  [Parameter(Mandatory)][string]$MetadataPath
)

$ErrorActionPreference = 'Stop'
$word = $null
$document = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  # Impide la ejecución de macros del documento durante la conversión.
  $word.AutomationSecurity = 3

  $document = $word.Documents.Open(
    [System.IO.Path]::GetFullPath($InputPath),
    $false,
    $true
  )
  $pageCount = $document.ComputeStatistics(2)
  $document.ExportAsFixedFormat(
    [System.IO.Path]::GetFullPath($OutputPath),
    17,
    $false,
    0,
    0,
    1,
    $pageCount,
    0,
    $true,
    $true,
    0,
    $true,
    $true,
    $false
  )
  [System.IO.File]::WriteAllText(
    [System.IO.Path]::GetFullPath($MetadataPath),
    [string]$pageCount,
    [System.Text.Encoding]::ASCII
  )
} finally {
  if ($null -ne $document) {
    $document.Close($false)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
  }
  if ($null -ne $word) {
    $word.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
