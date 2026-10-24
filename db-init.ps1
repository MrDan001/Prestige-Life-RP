# PATH: db-init.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\db-init.ps1
# Creates the tables in your database, then creates the owner account and starter data.
# Safe on an empty database. NEVER add --accept-data-loss to any command.
$ErrorActionPreference = "Stop"
if (-not (Test-Path .env)) { throw ".env not found. Run this from the project root." }

Write-Host "`n[1/3] Creating tables..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) { throw "Creating tables failed. Copy the red message above and send it to me." }

Write-Host "`n[2/3] Generating the database client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "Generate failed. Copy the red message above and send it to me." }

Write-Host "`n[3/3] Creating the owner account and starter data..." -ForegroundColor Cyan
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw "Seeding failed. Copy the red message above and send it to me." }

Write-Host "`nDone. Run: node diagnose.mjs  (everything should say OK), then: npm run dev" -ForegroundColor Green
