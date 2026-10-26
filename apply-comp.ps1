# PATH: apply-comp.ps1
# Put this file and comp-and-vercel.patch in your project root, then run:
#   powershell -ExecutionPolicy Bypass -File .\apply-comp.ps1
# Safe to run more than once. It never overwrites your own changes: if the patch does not fit, it stops before changing anything.
if (-not (Test-Path .git)) { throw "Run this from the project root (the folder that contains .git)." }
if (-not (Test-Path comp-and-vercel.patch)) { throw "comp-and-vercel.patch is not in this folder." }

# Already applied? (the reverse of the patch fits exactly)
git apply --check --reverse comp-and-vercel.patch 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "`n[1/4] The patch is already applied. Skipping." -ForegroundColor Yellow
} else {
  # Copies of the new files you may have saved by hand would block the patch. Move them aside (not deleted).
  $backup = Join-Path $env:TEMP ("comp-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  foreach ($f in @("app/admin/comp/page.tsx", "app/api/admin/demo-complaints/route.ts", "vercel.json")) {
    if ((Test-Path $f) -and -not (git ls-files $f)) {
      New-Item -ItemType Directory -Force -Path (Join-Path $backup (Split-Path $f)) | Out-Null
      Move-Item $f (Join-Path $backup $f) -Force
      Write-Host "Moved your copy of $f to $backup" -ForegroundColor Yellow
    }
  }
  Write-Host "`n[1/4] Checking the patch fits your files..." -ForegroundColor Cyan
  git apply --check comp-and-vercel.patch
  if ($LASTEXITCODE -ne 0) { throw "The patch does not fit your current files. Nothing was changed. Send me the message above." }
  Write-Host "[2/4] Applying it..." -ForegroundColor Cyan
  git apply comp-and-vercel.patch
  if ($LASTEXITCODE -ne 0) { throw "Applying failed. Send me the message above." }
}

Write-Host "`n[3/4] Installing packages and adding the new database column (nothing is deleted)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed. Send me the message above." }
npx prisma db push
if ($LASTEXITCODE -ne 0) { throw "db push failed. Do NOT accept data loss. Send me the message above." }
npx prisma generate

Write-Host "`n[4/4] Checking the code for errors (the same check Vercel runs)..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "`nThere are still errors above. Copy them and send them to me before you push." -ForegroundColor Red; exit 1 }

Remove-Item comp-and-vercel.patch -ErrorAction SilentlyContinue
Write-Host "`nNo errors. Now run .\git-push.ps1 to push, and Vercel will build it." -ForegroundColor Green
Write-Host "In VS Code, if red lines remain: press Ctrl+Shift+P, type 'TypeScript: Restart TS Server' and press Enter."