[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourceCachePath,

  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,

  [string]$Origin = 'http://172.16.10.250:8001',

  [int]$ExpectedEntryCount = 590
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:SharedRead = [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Open-SharedReadStream {
  param([Parameter(Mandatory = $true)][string]$Path)

  return [System.IO.File]::Open(
    $Path,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    $script:SharedRead
  )
}

function Read-ExactBytes {
  param(
    [Parameter(Mandatory = $true)][System.IO.Stream]$Stream,
    [Parameter(Mandatory = $true)][long]$Offset,
    [Parameter(Mandatory = $true)][int]$Length
  )

  $buffer = New-Object byte[] $Length
  $Stream.Position = $Offset
  $readTotal = 0
  while ($readTotal -lt $Length) {
    $read = $Stream.Read($buffer, $readTotal, $Length - $readTotal)
    if ($read -le 0) {
      throw "Lectura incompleta en offset ${Offset}: $readTotal de $Length bytes."
    }
    $readTotal += $read
  }

  return ,$buffer
}

function Convert-BytesToHex {
  param([Parameter(Mandatory = $true)][byte[]]$Bytes)

  return ([System.BitConverter]::ToString($Bytes).Replace('-', '').ToLowerInvariant())
}

function Get-Sha256Text {
  param([Parameter(Mandatory = $true)][string]$Text)

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return Convert-BytesToHex ($sha.ComputeHash($script:Utf8NoBom.GetBytes($Text)))
  }
  finally {
    $sha.Dispose()
  }
}

function Test-ExactOrigin {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][uri]$ExpectedOrigin
  )

  $parsed = $null
  if (-not [System.Uri]::TryCreate($Url, [System.UriKind]::Absolute, [ref]$parsed)) {
    return $false
  }

  return (
    $parsed.Scheme -eq $ExpectedOrigin.Scheme -and
    $parsed.Host -eq $ExpectedOrigin.Host -and
    $parsed.Port -eq $ExpectedOrigin.Port -and
    [string]::IsNullOrEmpty($parsed.UserInfo)
  )
}

function Read-OriginEntries {
  param(
    [Parameter(Mandatory = $true)][string]$CachePath,
    [Parameter(Mandatory = $true)][string]$ExpectedOrigin
  )

  $originUri = [uri]$ExpectedOrigin
  $data1Path = Join-Path $CachePath 'data_1'
  if (-not (Test-Path -LiteralPath $data1Path -PathType Leaf)) {
    throw "No existe el indice blockfile requerido: $data1Path"
  }

  $urlMarker = "$ExpectedOrigin/"
  $entries = New-Object System.Collections.Generic.List[object]
  $stream = Open-SharedReadStream $data1Path
  try {
    $block = New-Object byte[] 256
    for ($position = 8192L; $position + 256L -le $stream.Length; $position += 256L) {
      $stream.Position = $position
      $read = $stream.Read($block, 0, $block.Length)
      if ($read -ne $block.Length) {
        throw "No se pudo leer el bloque completo en $position."
      }

      $state = [System.BitConverter]::ToInt32($block, 20)
      $keyLength = [System.BitConverter]::ToInt32($block, 32)
      if ($state -ne 0 -or $keyLength -le 0 -or $keyLength -gt 4096) {
        continue
      }

      $sampleLength = [System.Math]::Min(160, $keyLength)
      $keySample = $script:Utf8NoBom.GetString($block, 96, $sampleLength)
      if (-not $keySample.Contains($urlMarker)) {
        continue
      }

      $keyBytes = Read-ExactBytes -Stream $stream -Offset ($position + 96L) -Length $keyLength
      $cacheKey = $script:Utf8NoBom.GetString($keyBytes)
      $urlOffset = $cacheKey.LastIndexOf($urlMarker, [System.StringComparison]::Ordinal)
      if ($urlOffset -lt 0) {
        continue
      }

      $url = $cacheKey.Substring($urlOffset)
      if (-not (Test-ExactOrigin -Url $url -ExpectedOrigin $originUri)) {
        continue
      }

      $bodySize = [System.BitConverter]::ToInt32($block, 44)
      $bodyAddress = [System.BitConverter]::ToUInt32($block, 60)
      $creationTimeMicros = [System.BitConverter]::ToInt64($block, 24)
      if ($bodySize -lt 0) {
        throw "Tamano de cuerpo negativo para $url"
      }
      if ($bodySize -gt 0 -and $bodyAddress -eq 0) {
        throw "Direccion de cuerpo vacia para $url"
      }

      $entries.Add([pscustomobject]@{
          Url          = $url
          BodySize     = $bodySize
          BodyAddress  = $bodyAddress
          EntryOffset  = $position
          CreatedMicros = $creationTimeMicros
        })
    }
  }
  finally {
    $stream.Dispose()
  }

  $duplicates = @($entries | Group-Object Url | Where-Object Count -gt 1)
  if ($duplicates.Count -gt 0) {
    throw "Se encontraron URLs duplicadas: $($duplicates.Name -join ', ')"
  }

  return @($entries | Sort-Object Url)
}

function Select-SnapshotEntries {
  param(
    [Parameter(Mandatory = $true)][object[]]$Entries,
    [Parameter(Mandatory = $true)][int]$Count
  )

  if ($Entries.Count -lt $Count) {
    throw "La cache solo contiene $($Entries.Count) entradas; se requieren $Count."
  }
  if ($Entries.Count -eq $Count) {
    return @($Entries | Sort-Object Url)
  }

  $orderedByCreation = @($Entries | Sort-Object CreatedMicros, Url)
  $selected = @($orderedByCreation | Select-Object -First $Count)
  $excluded = @($orderedByCreation | Select-Object -Skip $Count)
  $latestSelected = [int64](($selected | Measure-Object CreatedMicros -Maximum).Maximum)
  $earliestExcluded = [int64](($excluded | Measure-Object CreatedMicros -Minimum).Minimum)
  if ($latestSelected -ge $earliestExcluded) {
    throw 'No existe una frontera temporal no ambigua entre las entradas originales y las nuevas.'
  }

  return @($selected | Sort-Object Url)
}

function Get-EntrySetFingerprint {
  param([Parameter(Mandatory = $true)][object[]]$Entries)

  $lines = foreach ($entry in $Entries) {
    '{0}`t{1}`t{2:X8}' -f $entry.Url, $entry.BodySize, $entry.BodyAddress
  }
  return Get-Sha256Text (($lines -join "`n") + "`n")
}

function Resolve-BodyLocation {
  param(
    [Parameter(Mandatory = $true)][string]$CachePath,
    [Parameter(Mandatory = $true)][uint32]$Address,
    [Parameter(Mandatory = $true)][int]$BodySize
  )

  if ($BodySize -eq 0) {
    return [pscustomobject]@{
      Path       = $null
      Offset     = 0L
      Capacity   = 0L
      Storage    = 'empty'
    }
  }

  $address64 = [uint64]$Address
  $initializedBit = [uint64]2147483648
  if (($address64 -band $initializedBit) -ne $initializedBit) {
    throw ('Direccion de cache no inicializada: 0x{0:X8}' -f $Address)
  }

  $fileType = [int](($address64 -shr 28) -band [uint64]7)
  if ($fileType -eq 0) {
    $externalNumber = $address64 -band [uint64]268435455
    $externalName = 'f_{0:x6}' -f $externalNumber
    return [pscustomobject]@{
      Path       = Join-Path $CachePath $externalName
      Offset     = 0L
      Capacity   = [long]$BodySize
      Storage    = $externalName
    }
  }

  $blockSize = switch ($fileType) {
    1 { 36 }
    2 { 256 }
    3 { 1024 }
    4 { 4096 }
    default { throw "Tipo de archivo blockfile no soportado: $fileType" }
  }
  $fileNumber = [int](($address64 -shr 16) -band [uint64]255)
  $startBlock = [int]($address64 -band [uint64]65535)
  $blockCount = [int](($address64 -shr 24) -band [uint64]3) + 1

  return [pscustomobject]@{
    Path       = Join-Path $CachePath "data_$fileNumber"
    Offset     = 8192L + ([long]$startBlock * [long]$blockSize)
    Capacity   = [long]$blockCount * [long]$blockSize
    Storage    = "data_$fileNumber@$startBlock/$blockCount"
  }
}

function Export-Body {
  param(
    [Parameter(Mandatory = $true)][string]$CachePath,
    [Parameter(Mandatory = $true)][uint32]$Address,
    [Parameter(Mandatory = $true)][int]$BodySize,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (Test-Path -LiteralPath $Destination) {
    throw "El archivo destino ya existe: $Destination"
  }

  if ($BodySize -eq 0) {
    $destinationStream = [System.IO.File]::Open(
      $Destination,
      [System.IO.FileMode]::CreateNew,
      [System.IO.FileAccess]::Write,
      [System.IO.FileShare]::None
    )
    $destinationStream.Dispose()
    return [pscustomobject]@{
      Sha256  = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      Storage = 'empty'
    }
  }

  $location = Resolve-BodyLocation -CachePath $CachePath -Address $Address -BodySize $BodySize
  if (-not (Test-Path -LiteralPath $location.Path -PathType Leaf)) {
    throw "No existe el archivo de cuerpo: $($location.Path)"
  }
  if ([long]$BodySize -gt [long]$location.Capacity) {
    throw "El cuerpo excede su capacidad asignada: $Destination"
  }

  $sourceStream = Open-SharedReadStream $location.Path
  try {
    if ($location.Offset + [long]$BodySize -gt $sourceStream.Length) {
      throw "El cuerpo excede el archivo fuente: $($location.Path)"
    }
    $body = Read-ExactBytes -Stream $sourceStream -Offset $location.Offset -Length $BodySize
  }
  finally {
    $sourceStream.Dispose()
  }

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = Convert-BytesToHex ($sha.ComputeHash($body))
  }
  finally {
    $sha.Dispose()
  }

  $destinationStream = [System.IO.File]::Open(
    $Destination,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::None
  )
  try {
    $destinationStream.Write($body, 0, $body.Length)
    $destinationStream.Flush($true)
  }
  finally {
    $destinationStream.Dispose()
  }

  return [pscustomobject]@{
    Sha256  = $hash
    Storage = $location.Storage
  }
}

$sourceFullPath = [System.IO.Path]::GetFullPath($SourceCachePath)
$outputFullPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$originUri = [uri]$Origin

if ($originUri.Scheme -ne 'http' -or $originUri.Host -ne '172.16.10.250' -or $originUri.Port -ne 8001) {
  throw "Este extractor esta limitado deliberadamente al origen http://172.16.10.250:8001"
}
if (-not (Test-Path -LiteralPath $sourceFullPath -PathType Container)) {
  throw "No existe la cache fuente: $sourceFullPath"
}
if (Test-Path -LiteralPath $outputFullPath) {
  throw "La carpeta de salida debe ser nueva: $outputFullPath"
}

$allEntriesBefore = @(Read-OriginEntries -CachePath $sourceFullPath -ExpectedOrigin $Origin)
$entriesBefore = @(Select-SnapshotEntries -Entries $allEntriesBefore -Count $ExpectedEntryCount)
$entrySetFingerprintBefore = Get-EntrySetFingerprint $entriesBefore
$latestSelectedMicros = [int64](($entriesBefore | Measure-Object CreatedMicros -Maximum).Maximum)
$latestSelectedUtc = [DateTime]::FromFileTimeUtc($latestSelectedMicros * 10L).ToString('o')
$excludedNewerCount = $allEntriesBefore.Count - $entriesBefore.Count
$earliestExcludedUtc = $null
if ($excludedNewerCount -gt 0) {
  $selectedUrls = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
  foreach ($entry in $entriesBefore) {
    [void]$selectedUrls.Add([string]$entry.Url)
  }
  $excludedEntries = @($allEntriesBefore | Where-Object { -not $selectedUrls.Contains([string]$_.Url) })
  $earliestExcludedMicros = [int64](($excludedEntries | Measure-Object CreatedMicros -Minimum).Minimum)
  $earliestExcludedUtc = [DateTime]::FromFileTimeUtc($earliestExcludedMicros * 10L).ToString('o')
}

[void](New-Item -ItemType Directory -Path $outputFullPath)
$responsesDirectory = Join-Path $outputFullPath 'responses'
[void](New-Item -ItemType Directory -Path $responsesDirectory)

$capturedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
$manifestEntries = New-Object System.Collections.Generic.List[object]
$totalBytes = [int64]0
$index = 0
foreach ($entry in $entriesBefore) {
  $index++
  $relativeFile = 'responses/{0:D6}.body' -f $index
  $destination = Join-Path $outputFullPath ($relativeFile.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
  $exportArguments = @{
    CachePath   = $sourceFullPath
    Address     = $entry.BodyAddress
    BodySize    = $entry.BodySize
    Destination = $destination
  }
  $exported = Export-Body @exportArguments

  $totalBytes += [int64]$entry.BodySize
  $manifestEntries.Add([pscustomobject][ordered]@{
      index   = $index
      url     = $entry.Url
      file    = $relativeFile
      size    = [int64]$entry.BodySize
      sha256  = $exported.Sha256
    })
}

$allEntriesAfter = @(Read-OriginEntries -CachePath $sourceFullPath -ExpectedOrigin $Origin)
$entriesAfter = @(Select-SnapshotEntries -Entries $allEntriesAfter -Count $ExpectedEntryCount)
$entrySetFingerprintAfter = Get-EntrySetFingerprint $entriesAfter
if ($entrySetFingerprintAfter -ne $entrySetFingerprintBefore) {
  throw 'La metadata de las entradas cambio durante la extraccion; la instantanea se considera inconsistente.'
}

$manifest = [pscustomobject][ordered]@{
  schemaVersion             = 1
  capturedAtUtc             = $capturedAtUtc
  sourceOrigin              = $Origin
  sourceKind                = 'Chromium HTTP Cache blockfile response bodies only'
  exclusions                = @(
    'Local Storage',
    'Session Storage',
    'Cookies',
    'History',
    'Service Worker CacheStorage',
    'resources from ports 8095 and 8082'
  )
  entryCount                = $manifestEntries.Count
  totalBodyBytes            = $totalBytes
  cacheEntriesObserved      = $allEntriesBefore.Count
  selection                 = 'oldest entries by Chromium cache creation time, with a strict temporal boundary'
  latestSelectedCreatedUtc  = $latestSelectedUtc
  excludedNewerEntries      = $excludedNewerCount
  earliestExcludedCreatedUtc = $earliestExcludedUtc
  cacheEntrySetSha256       = $entrySetFingerprintBefore
  entries                   = $manifestEntries.ToArray()
}

$manifestJsonPath = Join-Path $outputFullPath 'manifest.json'
$manifestCsvPath = Join-Path $outputFullPath 'manifest.csv'
$manifestJson = $manifest | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($manifestJsonPath, $manifestJson + "`n", $script:Utf8NoBom)
$csvLines = @($manifestEntries | Select-Object index, url, file, size, sha256 | ConvertTo-Csv -NoTypeInformation)
[System.IO.File]::WriteAllLines($manifestCsvPath, $csvLines, $script:Utf8NoBom)

$loadedManifest = Get-Content -LiteralPath $manifestJsonPath -Raw | ConvertFrom-Json
$verificationErrors = New-Object System.Collections.Generic.List[string]
$seenUrls = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
$verifiedBytes = [int64]0

foreach ($record in @($loadedManifest.entries)) {
  if (-not (Test-ExactOrigin -Url $record.url -ExpectedOrigin $originUri)) {
    $verificationErrors.Add("Origen inesperado: $($record.url)")
  }
  if (-not $seenUrls.Add([string]$record.url)) {
    $verificationErrors.Add("URL duplicada: $($record.url)")
  }

  $bodyPath = [System.IO.Path]::GetFullPath((Join-Path $outputFullPath ([string]$record.file)))
  $responseRoot = [System.IO.Path]::GetFullPath($responsesDirectory) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $bodyPath.StartsWith($responseRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    $verificationErrors.Add("Ruta fuera de responses: $($record.file)")
    continue
  }
  if (-not (Test-Path -LiteralPath $bodyPath -PathType Leaf)) {
    $verificationErrors.Add("Falta archivo: $($record.file)")
    continue
  }

  $fileInfo = Get-Item -LiteralPath $bodyPath
  if ([int64]$fileInfo.Length -ne [int64]$record.size) {
    $verificationErrors.Add("Tamano incorrecto: $($record.file)")
  }
  $actualHash = (Get-FileHash -LiteralPath $bodyPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne [string]$record.sha256) {
    $verificationErrors.Add("SHA256 incorrecto: $($record.file)")
  }
  $verifiedBytes += [int64]$fileInfo.Length
}

$bodyFiles = @(Get-ChildItem -LiteralPath $responsesDirectory -File -Filter '*.body')
if ($bodyFiles.Count -ne $ExpectedEntryCount) {
  $verificationErrors.Add("Cantidad de archivos body incorrecta: $($bodyFiles.Count)")
}
if (@($loadedManifest.entries).Count -ne $ExpectedEntryCount) {
  $verificationErrors.Add("Cantidad de entradas del manifest incorrecta: $(@($loadedManifest.entries).Count)")
}
if ($verifiedBytes -ne $totalBytes) {
  $verificationErrors.Add("Total de bytes incorrecto: $verifiedBytes versus $totalBytes")
}

$manifestJsonSha256 = (Get-FileHash -LiteralPath $manifestJsonPath -Algorithm SHA256).Hash.ToLowerInvariant()
$manifestCsvSha256 = (Get-FileHash -LiteralPath $manifestCsvPath -Algorithm SHA256).Hash.ToLowerInvariant()
$verification = [pscustomobject][ordered]@{
  verifiedAtUtc               = [DateTimeOffset]::UtcNow.ToString('o')
  success                     = ($verificationErrors.Count -eq 0)
  expectedEntries             = $ExpectedEntryCount
  manifestEntries             = @($loadedManifest.entries).Count
  uniqueUrls                  = $seenUrls.Count
  bodyFiles                   = $bodyFiles.Count
  totalBodyBytes              = $verifiedBytes
  allUrlsMatchExactOrigin     = @($verificationErrors | Where-Object { $_ -like 'Origen inesperado:*' }).Count -eq 0
  allSizesMatch               = @($verificationErrors | Where-Object { $_ -like 'Tamano incorrecto:*' }).Count -eq 0
  allSha256Match              = @($verificationErrors | Where-Object { $_ -like 'SHA256 incorrecto:*' }).Count -eq 0
  cacheMetadataStable         = ($entrySetFingerprintBefore -eq $entrySetFingerprintAfter)
  cacheEntrySetSha256         = $entrySetFingerprintBefore
  manifestJsonSha256          = $manifestJsonSha256
  manifestCsvSha256           = $manifestCsvSha256
  errors                      = $verificationErrors.ToArray()
}

$verificationPath = Join-Path $outputFullPath 'verification.json'
$verificationJson = $verification | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($verificationPath, $verificationJson + "`n", $script:Utf8NoBom)

if (-not $verification.success) {
  throw "La verificacion fallo: $($verificationErrors -join '; ')"
}

[pscustomobject]@{
  OutputDirectory       = $outputFullPath
  EntryCount            = $verification.manifestEntries
  UniqueUrls            = $verification.uniqueUrls
  BodyFiles             = $verification.bodyFiles
  TotalBodyBytes        = $verification.totalBodyBytes
  CacheMetadataStable   = $verification.cacheMetadataStable
  AllSizesMatch         = $verification.allSizesMatch
  AllSha256Match        = $verification.allSha256Match
  ManifestJsonSha256    = $verification.manifestJsonSha256
  VerificationFile     = $verificationPath
} | Format-List
