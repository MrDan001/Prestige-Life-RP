# PATH: stage7-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage7-migrate.ps1
# Updates the templates table (levels, outcomes) and adds the 14 judgment buttons.
# The three old per-category starter templates are switched off, not deleted. NEVER add --accept-data-loss.
$ErrorActionPreference = "Stop"
npx prisma db push
if ($LASTEXITCODE -ne 0) { throw "db push failed. Copy the message above and send it to me." }
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "generate failed. Copy the message above and send it to me." }
npx tsx prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw "seed failed. Copy the message above and send it to me." }
Write-Host "`nStage 7 ready. Restart: npm run dev, then run .\test.ps1" -ForegroundColor Green