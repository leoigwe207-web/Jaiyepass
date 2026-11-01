param([switch]$Apply, [switch]$UIOnly)
$ErrorActionPreference = "Stop"
$patchRoot = Join-Path $PSScriptRoot "patch"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not ($Apply -or $UIOnly)) {
  Write-Host "Review README.md and STAGED-GUEST-DATES.sql. Use -UIOnly for safe maps/artwork, or -Apply only after schema is applied."
  exit 0
}
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) { throw "JaiyePass project root was not found." }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $projectRoot (".jp-guest-map-backups\" + $stamp)
$changed = 0
$uiFiles = @("src\components\host\event-cover-uploader.tsx", "src\components\event-venue-map.tsx", "src\app\events\[slug]\page.tsx", "src\app\globals.css", "supabase\migrations\20261030204452_repair_inventory_hold_timestamp.sql")
Get-ChildItem -LiteralPath $patchRoot -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($patchRoot.Length).TrimStart([char]'\',[char]'/')
  if ($UIOnly -and $relative -notin $uiFiles) { return }
  $destination = Join-Path $projectRoot $relative
  $backup = Join-Path $backupRoot $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  if (Test-Path -LiteralPath $destination) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
    Copy-Item -LiteralPath $destination -Destination $backup -Force
  }
  Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
  Write-Host ("Installed: " + $relative)
  $changed++
}
Write-Host "Installed $changed files. Backups: $backupRoot"
Write-Host "No guest SQL was executed. Guest purchases require staged schema and full source install."
if ($UIOnly) { Write-Host "UI-only mode: maps and artwork installed; guest checkout/date editor unchanged." }
Write-Host "Run: npm.cmd run typecheck; npm.cmd test; npm.cmd run build"
