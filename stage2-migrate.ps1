# PATH: stage2-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage2-migrate.ps1
# Adds the LinkCode table only. No existing data is deleted.
$ErrorActionPreference = "Stop"
npx prisma db push
npx prisma generate
Write-Host "`nStage 2 database ready. Restart: npm run dev, then run .\test.ps1" -ForegroundColor Green