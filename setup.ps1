# PATH: setup.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"

function New-Secret($bytes) {
  $b = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return [Convert]::ToBase64String($b).Replace("+","-").Replace("/","_").TrimEnd("=")
}

if (-not (Test-Path package.json)) { throw "Run this from the project root (where package.json is)." }

Write-Host "`n[1/5] Installing packages..." -ForegroundColor Cyan
npm install
npm install @prisma/client bcryptjs jose zod
npm install -D prisma tsx @types/bcryptjs
npm pkg set prisma.seed="tsx prisma/seed.ts"

if (-not (Test-Path .env)) {
  Write-Host "`n[2/5] Creating .env" -ForegroundColor Cyan
  $db    = Read-Host "Paste your PostgreSQL DATABASE_URL (Supabase: use the direct or session connection string)"
  $email = Read-Host "Owner (super admin) email"
  $pw    = Read-Host "Owner password (10+ characters)"
  $envText = @"
DATABASE_URL="$db"
SESSION_SECRET="$(New-Secret 48)"
GAME_API_KEY="$(New-Secret 32)"
OWNER_EMAIL="$email"
OWNER_PASSWORD="$pw"
"@
  [System.IO.File]::WriteAllText("$PWD\.env", $envText, (New-Object System.Text.UTF8Encoding $false))
} else {
  Write-Host "`n[2/5] .env already exists, keeping it." -ForegroundColor Yellow
}

if (-not (Test-Path .gitignore)) { "node_modules`n.next`n.env`nnext-env.d.ts" | Set-Content .gitignore }
elseif (-not (Select-String -Path .gitignore -Pattern "^\.env$" -Quiet)) { Add-Content .gitignore "`n.env" }

Write-Host "`n[3/5] Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "`n[4/5] Creating database tables..." -ForegroundColor Cyan
npx prisma db push

Write-Host "`n[5/5] Creating owner account..." -ForegroundColor Cyan
npx prisma db seed

Write-Host "`nDone. Start the site with: npm run dev" -ForegroundColor Green
Write-Host "Then test everything with: powershell -ExecutionPolicy Bypass -File .\test.ps1"
