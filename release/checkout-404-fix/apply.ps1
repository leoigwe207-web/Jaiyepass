$ErrorActionPreference = 'Stop'
$projectRoot = (Get-Location).Path
$target = Join-Path $projectRoot 'src\app\checkout\[orderId]\page.tsx'
if (-not (Test-Path -LiteralPath $target)) {
  throw "Checkout source file not found. Run from the JaiyePass project directory: $target"
}

$old = 'hold:inventory_holds(expires_at, status)'
$new = 'hold:inventory_holds!orders_hold_id_fkey(expires_at, status)'
$content = [System.IO.File]::ReadAllText($target)
if ($content.Contains($new)) {
  Write-Host 'Checkout foreign-key fix is already installed. No changes made.' -ForegroundColor Green
  exit 0
}
if (-not $content.Contains($old)) {
  throw 'Expected checkout query not found. Nothing was modified. Inspect the existing code before applying another fix.'
}

$backupDir = Join-Path $projectRoot '.jp-checkout-backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $backupDir "checkout-page-$timestamp.tsx"
Copy-Item -LiteralPath $target -Destination $backupPath -Force
$updated = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($target, $updated)
Write-Host 'Installed: src\app\checkout\[orderId]\page.tsx' -ForegroundColor Green
Write-Host "Backup: $backupPath"
Write-Host 'No database migration, deployment, payment or ticket changes were made.'
Write-Host 'Run npm.cmd run typecheck, then npm.cmd run build.'
