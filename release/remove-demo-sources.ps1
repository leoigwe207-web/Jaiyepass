# Removes ONLY known prior JaiyePass demo files. Run from the linked project root.
$ErrorActionPreference = "Stop"
$pkg = Get-Content (Join-Path (Get-Location) 'package.json') -Raw | ConvertFrom-Json
if ($pkg.name -ne 'jaiyepass') { throw 'Run this from the JaiyePass project directory.' }
$old = @(
  'src/app/(auth)/demo-actions.ts',
  'src/components/demo/dashboards.tsx',
  'src/components/sample-event-detail.tsx',
  'src/lib/demo.ts',
  'src/lib/demo-fixtures.ts',
  'src/lib/sample-events.ts',
  'src/app/api/dev/complete-order/route.ts',
  'tests/demo-session.test.ts'
)
foreach ($file in $old) {
  if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force; Write-Host "Removed obsolete file: $file" }
}
if (Test-Path -LiteralPath 'public/demo') {
  Remove-Item -LiteralPath 'public/demo' -Recurse -Force
  Write-Host 'Removed sample posters from public/demo'
}
Write-Host 'Demo source cleanup finished. Run typecheck, tests and build next.'
