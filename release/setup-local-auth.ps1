# Run from the JaiyePass project root: powershell -ExecutionPolicy Bypass -File .\release\setup-local-auth.ps1
# Secrets are never printed; .env.local is ignored by git. Keep this file private.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$path = Join-Path $root '.env.local'
$lines = @()
if (Test-Path $path) { $lines = @(Get-Content $path) }
function Set-EnvValue([string]$key, [string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { throw "Missing required value for $key" }
  $script:lines = @($script:lines | Where-Object { $_ -notmatch ('^\s*' + [regex]::Escape($key) + '\s*=') })
  $script:lines += "$key=$value"
}
function Read-SecretText([string]$label) {
  $secure = Read-Host $label -AsSecureString
  return [System.Net.NetworkCredential]::new('', $secure).Password.Trim()
}
Write-Host 'JaiyePass local Supabase setup (never paste credentials into chat)' -ForegroundColor Cyan
Write-Host 'Open Supabase project Settings > API Keys to copy the publishable/anon and service-role keys.'
$url = Read-Host 'Supabase project URL (https://...supabase.co)'
if ($url -notmatch '^https://[a-z0-9-]+\.supabase\.co/?$') { throw 'Invalid Supabase URL; copy it from your own project settings.' }
$key = Read-SecretText 'Supabase anon/public key (hidden)'
$service = Read-SecretText 'Supabase service_role key (hidden, server only)'
Set-EnvValue 'NEXT_PUBLIC_SUPABASE_URL' ($url.TrimEnd('/'))
Set-EnvValue 'NEXT_PUBLIC_SUPABASE_ANON_KEY' $key
Set-EnvValue 'SUPABASE_SERVICE_ROLE_KEY' $service
Set-EnvValue 'NEXT_PUBLIC_APP_URL' 'http://localhost:3000'
[System.IO.File]::WriteAllLines($path, $script:lines, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Saved local Supabase configuration to .env.local (credentials hidden).' -ForegroundColor Green
Write-Host 'Close and restart npm run dev, then test /login, /signup and /admin.'
