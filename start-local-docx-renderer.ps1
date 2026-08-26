[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$rootPath = Split-Path -Parent $PSCommandPath
$rendererScript = Join-Path $rootPath 'quisvar_proyect_bk-main\scripts\local-docx-renderer.cjs'
$logDirectory = Join-Path $rootPath 'quisvar_proyect_ft-main\.agent-local\docx-renderer'
$stdoutPath = Join-Path $logDirectory 'renderer.stdout.log'
$stderrPath = Join-Path $logDirectory 'renderer.stderr.log'
$healthUrl = 'http://172.16.10.177:8092/health'

try {
  $health = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
  if ($health.StatusCode -eq 200) {
    Write-Host 'Renderizador DOCX local ya está activo.' -ForegroundColor Green
    return
  }
} catch {
  # El servicio todavía no está iniciado.
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$node = (Get-Command node -ErrorAction Stop).Source
$previousToken = $env:DOCX_RENDERER_TOKEN
$previousHost = $env:DOCX_RENDERER_HOST
$previousPort = $env:DOCX_RENDERER_PORT
try {
  $env:DOCX_RENDERER_TOKEN = 'dhyrium-local-word-renderer-v1'
  $env:DOCX_RENDERER_HOST = '0.0.0.0'
  $env:DOCX_RENDERER_PORT = '8092'
  Start-Process -FilePath $node `
    -ArgumentList @("`"$rendererScript`"") `
    -WorkingDirectory (Split-Path -Parent $rendererScript) `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath | Out-Null
} finally {
  $env:DOCX_RENDERER_TOKEN = $previousToken
  $env:DOCX_RENDERER_HOST = $previousHost
  $env:DOCX_RENDERER_PORT = $previousPort
}

$deadline = (Get-Date).AddSeconds(15)
do {
  Start-Sleep -Milliseconds 350
  try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
    if ($health.StatusCode -eq 200) {
      Write-Host 'Renderizador DOCX local iniciado en esta PC.' -ForegroundColor Green
      return
    }
  } catch {
    # Esperar hasta el plazo establecido.
  }
} while ((Get-Date) -lt $deadline)

throw "No se pudo iniciar el renderizador DOCX. Revise $stderrPath"
