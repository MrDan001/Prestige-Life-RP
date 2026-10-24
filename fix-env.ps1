# PATH: fix-env.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\fix-env.ps1
# Rewrites .env as plain UTF-8 without the hidden BOM character. Your values are not changed.
$ErrorActionPreference = "Stop"
if (-not (Test-Path .env)) { throw ".env not found. Run this from the project root." }
$text = Get-Content .env -Raw
[System.IO.File]::WriteAllText("$PWD\.env", $text, (New-Object System.Text.UTF8Encoding $false))
Write-Host ".env rewritten without BOM. Now run: node diagnose.mjs" -ForegroundColor Green
