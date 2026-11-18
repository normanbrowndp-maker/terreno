$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
$ProjectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$LocalDirectory = Join-Path $ProjectDirectory '.local'
$TargetDirectory = [IO.Path]::GetFullPath((Join-Path $LocalDirectory 'postgresql'))
if (-not $TargetDirectory.StartsWith($ProjectDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe installation path' }
if (Test-Path -LiteralPath (Join-Path $LocalDirectory 'postgres-data\postmaster.pid')) { throw 'Project cluster may be running. Stop it before changing portable binaries.' }
if ((Test-Path -LiteralPath (Join-Path $LocalDirectory 'postgres-data\PG_VERSION')) -and -not (Test-Path -LiteralPath (Join-Path $LocalDirectory 'database-state.json'))) { throw 'Refusing an unrecognised existing data directory' }
New-Item -ItemType Directory -Path (Join-Path $LocalDirectory 'downloads') -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Archives = @(
  @{Name='postgresql-17.12.zip';Url='https://get.enterprisedb.com/postgresql/postgresql-17.12-1-windows-x64-binaries.zip';Prefix='pgsql/';SHA256='a2cd8a774389347b70be7748ac4a37ef43cb6ee539c5fc3e85ae264b15e4a04c'},
  @{Name='postgis-pg17-3.7.0.zip';Url='https://download.osgeo.org/postgis/windows/pg17/postgis-bundle-pg17-3.7.0x64.zip';Prefix='postgis-bundle-pg17-3.7.0x64/';SHA256='eceb7ed45276db6c9f8757e65ccf8d0ceedaebdcd0c401d442371ce8def61450'}
)
foreach ($Archive in $Archives) {
  $ArchivePath = Join-Path (Join-Path $LocalDirectory 'downloads') $Archive.Name
  if (-not (Test-Path -LiteralPath $ArchivePath)) { Invoke-WebRequest -Uri $Archive.Url -OutFile $ArchivePath -UseBasicParsing -TimeoutSec 600 }
  if ((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Archive.SHA256) { throw 'Archive checksum mismatch; installation stopped' }
  $Zip = [IO.Compression.ZipFile]::OpenRead($ArchivePath)
  try {
    foreach ($Entry in $Zip.Entries) {
      if (-not $Entry.FullName.StartsWith($Archive.Prefix)) { continue }
      $Relative = $Entry.FullName.Substring($Archive.Prefix.Length)
      if ($Relative -notmatch '^(bin|lib|share)/') { continue }
      $Destination = [IO.Path]::GetFullPath((Join-Path $TargetDirectory $Relative))
      if (-not $Destination.StartsWith($TargetDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive entry' }
      if ($Entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Path $Destination -Force | Out-Null }
      else {
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($Destination)) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($Entry, $Destination, $true)
      }
    }
  } finally { $Zip.Dispose() }
}
# The PG17 PostGIS bundle's top-level libcurl requires an unbundled nghttp2 DLL.
# Its GUI libcurl and Brotli dependencies form a complete set in the SAME archive.
foreach ($Library in @('libcurl.dll','libbrotlicommon.dll','libbrotlidec.dll','libbrotlienc.dll')) {
  Copy-Item -LiteralPath (Join-Path $TargetDirectory "bin\postgisgui\$Library") -Destination (Join-Path $TargetDirectory "bin\$Library") -Force
}
Write-Output 'Verified portable PostgreSQL 17.12 / PostGIS 3.7.0 files prepared under .local only. No service installed.'
