[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
  [string]$ZipPath,

  [ValidateSet('server', 'vite')]
  [string]$Target = 'server',

  [string]$ExpectedSha256 = '27A6E96CA4D3F29B812DA794D8D525D14AB6C3E279F89E67F7D4A54B3F75E117',

  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$expectedName = 'DhyriumDesktop-0.1.4-win-x64-pilot.zip'
$source = (Resolve-Path -LiteralPath $ZipPath).Path

if ((Split-Path -Leaf $source) -ne $expectedName) {
  throw "El artefacto debe llamarse $expectedName."
}

$actualSha256 = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
if ($actualSha256 -ne $ExpectedSha256.ToUpperInvariant()) {
  throw "SHA-256 inválido. Esperado: $ExpectedSha256. Recibido: $actualSha256."
}

if ($ValidateOnly) {
  Write-Host "Artefacto validado: $source"
  return
}

$destinationDirectory = if ($Target -eq 'server') {
  Join-Path $repoRoot 'artifacts/dhyrium-desktop'
} else {
  Join-Path $repoRoot 'quisvar_proyect_ft-main/public/desktop'
}

New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
$destination = Join-Path $destinationDirectory $expectedName
Copy-Item -LiteralPath $source -Destination $destination -Force

Write-Host "Artefacto validado y copiado a $destination"
