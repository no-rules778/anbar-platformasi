$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repo 'web\.env.sandbox.local'
$expectedUrl = 'https://alkjjbaawmsirsfvqljm.supabase.co'

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'Test environment file is missing.'
}

$settings = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $settings[$Matches[1].Trim()] = $Matches[2].Trim() }
}

if ($settings['VITE_SUPABASE_URL'] -ne $expectedUrl) {
  throw 'Safety stop: this launcher accepts only the anbar-test project.'
}
if ($settings['VITE_ALLOW_LOCAL_WRITES'] -ne 'true') {
  throw 'Safety stop: sandbox writes are not explicitly enabled.'
}

Write-Host 'ANBAR test environment: alkjjbaawmsirsfvqljm (port 5175)'
Push-Location (Join-Path $repo 'web')
try {
  npm run dev -- --mode sandbox --port 5175
} finally {
  Pop-Location
}
