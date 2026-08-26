[CmdletBinding()]
param(
  [string]$SourceHost = '172.16.10.250',
  [int]$SourcePort = 5432,
  [string]$Database = 'dhyrium_db',
  [string]$Username = 'postgres',

  [Parameter(Mandatory = $true)]
  [string]$OutputFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pgDump = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
if (-not (Test-Path -LiteralPath $pgDump -PathType Leaf)) {
  throw "No se encontro pg_dump en $pgDump"
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputFile)
$outputDirectory = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
  throw "No existe el directorio de destino: $outputDirectory"
}
if (Test-Path -LiteralPath $outputFullPath) {
  throw "El archivo de destino ya existe: $outputFullPath"
}

Write-Host ''
Write-Host 'COPIA DE SOLO LECTURA DE POSTGRESQL' -ForegroundColor Cyan
Write-Host "Origen: $SourceHost`:$SourcePort / $Database" -ForegroundColor Yellow
Write-Host "Usuario: $Username" -ForegroundColor Yellow
Write-Host 'pg_dump solicitara la contrasena sin mostrarla.' -ForegroundColor Green
Write-Host 'No se ejecutaran escrituras en el servidor original.' -ForegroundColor Green
Write-Host ''

$dumpArguments = @(
  "--host=$SourceHost"
  "--port=$SourcePort"
  "--username=$Username"
  "--dbname=$Database"
  '--password'
  '--format=custom'
  '--no-owner'
  '--no-privileges'
  '--lock-wait-timeout=10s'
  "--file=$outputFullPath"
)

& $pgDump @dumpArguments

if ($LASTEXITCODE -ne 0) {
  if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
  }
  throw "pg_dump termino con codigo $LASTEXITCODE"
}

$dumpFile = Get-Item -LiteralPath $outputFullPath
if ($dumpFile.Length -le 0) {
  Remove-Item -LiteralPath $outputFullPath -Force
  throw 'pg_dump produjo un archivo vacio.'
}

$hash = (Get-FileHash -LiteralPath $outputFullPath -Algorithm SHA256).Hash
Write-Host ''
Write-Host 'Dump generado correctamente.' -ForegroundColor Green
Write-Host "Archivo: $outputFullPath"
Write-Host "Bytes: $($dumpFile.Length)"
Write-Host "SHA256: $hash"
