# PATH: stage8-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage8-migrate.ps1
# Adds roles. Creates the built-in roles and attaches existing staff to a matching role.
# Nothing is deleted and titles are not changed. NEVER add --accept-data-loss.
$ErrorActionPreference = "Stop"
npx prisma db push
if ($LASTEXITCODE -ne 0) { throw "db push failed. Copy the message above and send it to me." }
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "generate failed. Copy the message above and send it to me." }
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw "seed failed. Copy the message above and send it to me." }
Write-Host "`nStage 8 ready. Restart: npm run dev, then run .\test.ps1" -ForegroundColor Green