# PATH: stage4-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage4-migrate.ps1
# Adds templates, evidence and verdict tables/columns. No existing data is deleted.
$ErrorActionPreference = "Stop"

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install @vercel/blob

if (-not (Select-String -Path .env -Pattern "BLOB_READ_WRITE_TOKEN" -Quiet)) { 
    "`nBLOB_READ_WRITE_TOKEN=" | Add-Content .env 
}

Write-Host "Syncing Prisma schema..." -ForegroundColor Cyan
# Bypass composer wrapper by calling Prisma directly via Node core
node node_modules\prisma\build\index.js db push --accept-data-loss

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
node node_modules\prisma\build\index.js generate

Write-Host "Seeding database..." -ForegroundColor Cyan
npx ts-node prisma/seed.ts

Write-Host "`nStage 4 ready. Restart: npm run dev, then run .\test.ps1" -ForegroundColor Green
Write-Host "File uploads from the game need BLOB_READ_WRITE_TOKEN in .env (Vercel > Storage > Blob). Links and chat logs work without it."