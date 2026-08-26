[CmdletBinding()]
param(
  [string]$SourceHost = '172.16.10.250',
  [string]$SourceDriveShare = 'E$',
  [string]$BackendRelativePath = 'New folder\2026 dhyrium\Dhyrium_project\dhyrium-workspace\quisvar_proyect_bk',

  [Parameter(Mandatory = $true)]
  [string]$DumpOutputFile,

  [Parameter(Mandatory = $true)]
  [string]$FilesOutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pgDump = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
$pgRestore = 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe'
$driveName = 'SRC250'
$shareRoot = "\\$SourceHost\$SourceDriveShare"
$backendUncPath = Join-Path $shareRoot $BackendRelativePath
$dumpFullPath = [System.IO.Path]::GetFullPath($DumpOutputFile)
$filesFullPath = [System.IO.Path]::GetFullPath($FilesOutputDirectory)
$statusFile = "$filesFullPath.status.json"
$runtimeDirectories = @('uploads', 'public', 'index', 'storage', 'resource')
$mapped = $false
$previousPgPassword = $env:PGPASSWORD

function Write-StatusFile {
  param(
    [bool]$Success,
    [string]$Message,
    [object[]]$CopiedDirectories = @()
  )

  $status = [pscustomobject][ordered]@{
    completedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
    success = $Success
    message = $Message
    sourceHost = $SourceHost
    sourceBackendPath = $backendUncPath
    dumpFile = $dumpFullPath
    filesDirectory = $filesFullPath
    copiedDirectories = @($CopiedDirectories)
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText(
    $statusFile,
    (($status | ConvertTo-Json -Depth 6) + "`n"),
    $utf8NoBom
  )
}

try {
  foreach ($requiredTool in @($pgDump, $pgRestore)) {
    if (-not (Test-Path -LiteralPath $requiredTool -PathType Leaf)) {
      throw "No se encontro la herramienta requerida: $requiredTool"
    }
  }
  if (Test-Path -LiteralPath $dumpFullPath) {
    throw "El dump de destino ya existe: $dumpFullPath"
  }
  if (Test-Path -LiteralPath $filesFullPath) {
    throw "El directorio de archivos de destino ya existe: $filesFullPath"
  }
  if (Get-PSDrive -Name $driveName -ErrorAction SilentlyContinue) {
    throw "Ya existe una unidad PowerShell llamada $driveName."
  }
  $existingConnections = @(
    Get-SmbConnection -ServerName $SourceHost -ErrorAction SilentlyContinue
  )
  if ($existingConnections.Count -gt 0) {
    throw "Ya existe una conexion SMB a $SourceHost; no se desconectara ni reutilizara automaticamente."
  }

  Write-Host ''
  Write-Host 'COPIA DE SOLO LECTURA DEL SERVIDOR ORIGINAL' -ForegroundColor Cyan
  Write-Host "Servidor: $SourceHost" -ForegroundColor Yellow
  Write-Host 'Ingrese una cuenta Windows con permiso de lectura sobre E$.' -ForegroundColor Yellow
  Write-Host 'La contrasena no se mostrara ni se escribira en archivos.' -ForegroundColor Green
  Write-Host ''

  $credential = Get-Credential -Message "Credenciales Windows de $SourceHost para lectura SMB"
  if ($null -eq $credential) {
    throw 'La solicitud de credenciales fue cancelada.'
  }

  New-PSDrive `
    -Name $driveName `
    -PSProvider FileSystem `
    -Root $shareRoot `
    -Credential $credential `
    -Scope Script `
    -ErrorAction Stop | Out-Null
  $mapped = $true

  $backendDrivePath = "$driveName`:\$BackendRelativePath"
  if (-not (Test-Path -LiteralPath $backendDrivePath -PathType Container)) {
    throw "No se encontro el backend esperado en $backendUncPath"
  }

  $envPath = Join-Path $backendDrivePath '.env'
  if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    throw "No se encontro el archivo .env del backend en $backendUncPath"
  }

  $envText = Get-Content -LiteralPath $envPath -Raw
  $databaseMatch = [regex]::Match(
    $envText,
    '(?m)^\s*DATABASE_URL\s*=\s*["'']?(?<url>[^"''\r\n]+)["'']?\s*$'
  )
  $envText = $null
  if (-not $databaseMatch.Success) {
    throw 'El .env original no contiene una DATABASE_URL valida.'
  }

  $databaseUrl = $databaseMatch.Groups['url'].Value.Trim()
  $databaseUri = [Uri]$databaseUrl
  $userInfo = $databaseUri.UserInfo
  $separator = $userInfo.IndexOf(':')
  if ($separator -lt 1) {
    throw 'DATABASE_URL no contiene usuario y contrasena.'
  }
  $databaseUser = [Uri]::UnescapeDataString($userInfo.Substring(0, $separator))
  $databasePassword = [Uri]::UnescapeDataString($userInfo.Substring($separator + 1))
  $databaseName = $databaseUri.AbsolutePath.Trim('/')
  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw 'DATABASE_URL no contiene el nombre de la base.'
  }
  $databaseUrl = $null
  $userInfo = $null

  $dumpDirectory = Split-Path -Parent $dumpFullPath
  if (-not (Test-Path -LiteralPath $dumpDirectory -PathType Container)) {
    throw "No existe el directorio para el dump: $dumpDirectory"
  }

  Write-Host ''
  Write-Host "Generando pg_dump consistente de $databaseName..." -ForegroundColor Cyan
  $env:PGPASSWORD = $databasePassword
  $databasePassword = $null
  $dumpArguments = @(
    "--host=$SourceHost"
    '--port=5432'
    "--username=$databaseUser"
    "--dbname=$databaseName"
    '--no-password'
    '--format=custom'
    '--no-owner'
    '--no-privileges'
    '--lock-wait-timeout=10s'
    "--file=$dumpFullPath"
  )
  & $pgDump @dumpArguments
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump termino con codigo $LASTEXITCODE"
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

  $dumpFile = Get-Item -LiteralPath $dumpFullPath
  if ($dumpFile.Length -le 0) {
    throw 'pg_dump produjo un archivo vacio.'
  }
  & $pgRestore --list $dumpFullPath | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'pg_restore no pudo validar el catalogo del dump.'
  }

  New-Item -ItemType Directory -Path $filesFullPath -ErrorAction Stop | Out-Null
  $copied = New-Object System.Collections.Generic.List[object]

  foreach ($directoryName in $runtimeDirectories) {
    $sourceDirectory = Join-Path $backendUncPath $directoryName
    if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
      $copied.Add([pscustomobject]@{
        name = $directoryName
        present = $false
        fileCount = 0
        totalBytes = 0
      })
      continue
    }

    $destinationDirectory = Join-Path $filesFullPath $directoryName
    Write-Host "Copiando $directoryName..." -ForegroundColor Cyan
    & robocopy.exe `
      $sourceDirectory `
      $destinationDirectory `
      /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /XJ /NP /NFL /NDL
    $robocopyExitCode = $LASTEXITCODE
    if ($robocopyExitCode -gt 7) {
      throw "robocopy fallo para $directoryName con codigo $robocopyExitCode"
    }

    $destinationFiles = @(Get-ChildItem -LiteralPath $destinationDirectory -Recurse -File)
    $totalBytes = ($destinationFiles | Measure-Object -Property Length -Sum).Sum
    if ($null -eq $totalBytes) { $totalBytes = 0 }
    $copied.Add([pscustomobject]@{
      name = $directoryName
      present = $true
      fileCount = $destinationFiles.Count
      totalBytes = [int64]$totalBytes
      robocopyExitCode = $robocopyExitCode
    })
  }

  $dumpHash = (Get-FileHash -LiteralPath $dumpFullPath -Algorithm SHA256).Hash
  Write-StatusFile -Success $true -Message 'Copia terminada' -CopiedDirectories $copied

  Write-Host ''
  Write-Host 'EXTRACCION TERMINADA' -ForegroundColor Green
  Write-Host "Dump: $dumpFullPath"
  Write-Host "Bytes: $($dumpFile.Length)"
  Write-Host "SHA256: $dumpHash"
  Write-Host "Archivos: $filesFullPath"
}
catch {
  $safeMessage = $_.Exception.Message
  Write-Host ''
  Write-Host "ERROR: $safeMessage" -ForegroundColor Red
  try {
    Write-StatusFile -Success $false -Message $safeMessage
  }
  catch {
    # No ocultar el error original si tampoco se pudo escribir el estado.
  }
  if (Test-Path -LiteralPath $dumpFullPath) {
    Remove-Item -LiteralPath $dumpFullPath -Force
  }
  exit 1
}
finally {
  if ($null -eq $previousPgPassword) {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
  else {
    $env:PGPASSWORD = $previousPgPassword
  }
  if ($mapped -and (Get-PSDrive -Name $driveName -ErrorAction SilentlyContinue)) {
    Remove-PSDrive -Name $driveName -Force -ErrorAction SilentlyContinue
  }
  $credential = $null
  [GC]::Collect()
}
