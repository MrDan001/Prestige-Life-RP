# PATH: stage3-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage3-migrate.ps1
# Adds the Note table and claim columns. No existing data is deleted.
$ErrorActionPreference = "Stop"
npx prisma db push
npx prisma generate
Write-Host "`nStage 3 database ready. Restart: npm run dev, then run .\test.ps1" -ForegroundColor Green