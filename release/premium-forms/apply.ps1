param([string]$ProjectRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$packageFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$patchRoot = Join-Path $packageFolder "patch"
$project = (Resolve-Path $ProjectRoot).Path
if (-not (Test-Path (Join-Path $project "package.json"))) {
    throw "Run this script with -ProjectRoot pointing to your JaiyePass folder (which contains package.json)."
}
$files = @(
    "src/app/account/actions.ts",
    "src/app/account/profile/page.tsx",
    "src/components/profile-form.tsx",
    "src/components/host/event-form.tsx",
    "src/app/host/events/new/page.tsx",
    "src/components/host/org-form.tsx",
    "src/components/host/host-forms.tsx",
    "src/lib/category-labels.ts",
    "src/app/page.tsx",
    "src/components/browse-filters.tsx",
    "src/app/globals.css"
)
foreach ($relative in $files) {
    if (-not (Test-Path (Join-Path $patchRoot $relative))) { throw "Patch missing: $relative" }
}
$backup = Join-Path $project ("release/backups/premium-forms-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($relative in $files) {
    $source = Join-Path $patchRoot $relative
    $destination = Join-Path $project $relative
    $backupDestination = Join-Path $backup $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    if (Test-Path $destination) {
        New-Item -ItemType Directory -Path (Split-Path -Parent $backupDestination) -Force | Out-Null
        Copy-Item $destination $backupDestination -Force
    }
    Copy-Item $source $destination -Force
    Write-Host "Updated $relative"
}
Write-Host "Finished. Backups: $backup"
Write-Host "Next: npm.cmd run typecheck; npm.cmd run build; npm.cmd test"
