[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$rootPath = Split-Path -Parent $PSCommandPath
Set-Location -LiteralPath $rootPath

& (Join-Path $rootPath 'start-local-docx-renderer.ps1')

function Invoke-Docker {
  param([Parameter(Mandatory)][string[]]$DockerArguments)

  & $script:dockerPath @DockerArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker failed: docker $($DockerArguments -join ' ')"
  }
}

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if ($null -eq $dockerCommand) {
  throw 'Docker CLI was not found. Install Docker Desktop and run this command again.'
}

$script:dockerPath = $dockerCommand.Source
try {
  Invoke-Docker -DockerArguments @('info', '--format', '{{.ServerVersion}}') | Out-Null
} catch {
  throw 'Docker Desktop is not running or is not accessible. Start Docker Desktop and run this command again.'
}

$envPath = Join-Path $rootPath '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
  throw 'Missing .env at the repository root. Copy .env.example and provide the required values.'
}

$limaTime = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId(
  (Get-Date).ToUniversalTime(),
  'SA Pacific Standard Time'
)
$versionTag = "production-$($limaTime.ToString('yyyyMMdd-HHmmss'))"

$backendRepository = 'diegoromani560/dhyrium_software_v1'
$frontendRepository = 'diegoromani560/dhyrium_software_v1_frontend'
$backendVersionImage = "${backendRepository}:$versionTag"
$frontendVersionImage = "${frontendRepository}:$versionTag"
$backendLatestImage = "${backendRepository}:production-latest"
$frontendLatestImage = "${frontendRepository}:production-latest"

Write-Host "Building version $versionTag (America/Lima)..." -ForegroundColor Cyan
$backendBuildArguments = @(
  'build', '--tag', $backendVersionImage, '--tag', $backendLatestImage,
  (Join-Path $rootPath 'quisvar_proyect_bk-main')
)
$frontendBuildArguments = @(
  'build', '--build-arg', 'VITE_API_URL=', '--tag', $frontendVersionImage,
  '--tag', $frontendLatestImage, (Join-Path $rootPath 'quisvar_proyect_ft-main')
)
Invoke-Docker -DockerArguments $backendBuildArguments
Invoke-Docker -DockerArguments $frontendBuildArguments

Write-Host 'Publishing images to Docker Hub...' -ForegroundColor Cyan
try {
  Invoke-Docker -DockerArguments @('push', $backendVersionImage)
  Invoke-Docker -DockerArguments @('push', $backendLatestImage)
  Invoke-Docker -DockerArguments @('push', $frontendVersionImage)
  Invoke-Docker -DockerArguments @('push', $frontendLatestImage)
} catch {
  throw "Could not publish the images. Run 'docker login' with an account allowed to publish to diegoromani560, then try again. $($_.Exception.Message)"
}

Write-Host 'Restarting local services...' -ForegroundColor Cyan
Invoke-Docker -DockerArguments @('compose', 'up', '-d', '--force-recreate', 'backend', 'frontend')

Write-Host ''
Write-Host 'Publication completed.' -ForegroundColor Green
Write-Host "Backend:  $backendVersionImage"
Write-Host "Frontend: $frontendVersionImage"
Write-Host 'Local application: http://localhost:8088/#/home'
