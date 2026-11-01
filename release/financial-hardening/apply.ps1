param([switch]$Apply)
$ErrorActionPreference = "Stop"
$project = (Get-Location).Path
$package = Join-Path $project 'package.json'
if (!(Test-Path $package)) { throw 'Open the JaiyePass project folder first.' }
$meta = Get-Content $package -Raw | ConvertFrom-Json
if ($meta.name -ne 'jaiyepass') { throw 'This patch is for the JaiyePass repository only.' }
$src = Join-Path $project 'release/financial-hardening/patch'
if (!(Test-Path $src)) { throw 'Patch files missing. Extract the ZIP again.' }
$files = Get-ChildItem -Path $src -File -Recurse
if (!$Apply) {
  Write-Host 'DRY RUN: No files changed. Run with -Apply to copy the following files:'
  foreach ($file in $files) { Write-Host $file.FullName.Substring($src.Length + 1) }
  exit 0
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $project ('.jp-finance-backups/' + $stamp)
foreach ($file in $files) {
  $relative = $file.FullName.Substring($src.Length + 1)
  $dest = Join-Path $project $relative
  $folder = Split-Path $dest -Parent
  if (!(Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
  if (Test-Path $dest) {
    $safe = Join-Path $backup $relative
    New-Item -ItemType Directory -Path (Split-Path $safe -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $dest -Destination $safe -Force
  }
  Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
  Write-Host ('Installed: ' + $relative)
}
Write-Host ('Existing files backed up under: ' + $backup)
Write-Host 'No database migrations or deployments have been run.'
Write-Host 'Run typecheck, tests and build before committing.'
