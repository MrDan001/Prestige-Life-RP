# PATH: git-push.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\git-push.ps1
# Optional:                   powershell -ExecutionPolicy Bypass -File .\git-push.ps1 -Message "Add roles"
# Checks that no secrets are about to be uploaded, shows what will be committed, waits for your OK, then pushes.
param([string]$Message = "")

if (-not (Test-Path .git)) { throw "Run this from the project root (the folder that contains .git)." }

# 1. Make sure private and generated files are ignored
$need = @(".env", ".env.*", "node_modules", ".next", "*.tsbuildinfo", "next-env.d.ts")
$existing = if (Test-Path .gitignore) { Get-Content .gitignore } else { @() }
$missing = @($need | Where-Object { $existing -notcontains $_ })
if ($missing.Count -gt 0) {
  Add-Content .gitignore ("`n" + ($missing -join "`n"))
  Write-Host "Added to .gitignore: $($missing -join ', ')" -ForegroundColor Yellow
}

# 2. Stop tracking files that must never be in the repo (they stay on your computer)
foreach ($f in @(".env", "tsconfig.tsbuildinfo")) {
  if (git ls-files $f) { git rm --cached -q $f; Write-Host "Stopped tracking $f" -ForegroundColor Yellow }
}

# 3. Warn about the dangerous Prisma flag
$bad = Get-ChildItem -Recurse -File -Include *.ps1,*.json,*.md -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "node_modules|\\.next|\\.git\\" } |
  Select-String -Pattern "--accept-data-loss" -SimpleMatch | Where-Object { $_.Path -notmatch "git-push.ps1" }
if ($bad) {
  Write-Host "`nWARNING: --accept-data-loss found (it lets Prisma delete tables). Remove it from:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
}

# 4. Stage everything, then scan what is about to be uploaded for secrets
git add -A
$patterns = 'postgres(ql)?://[^:\s"'']+:[^@\s"'']+@|(SESSION_SECRET|GAME_API_KEY|OWNER_PASSWORD|BLOB_READ_WRITE_TOKEN)\s*=\s*"?[A-Za-z0-9_\-]{12,}'
$hits = git diff --cached -U0 | Select-String -Pattern '^\+' | Where-Object { $_.Line -match $patterns }
if ($hits) {
  git reset -q
  Write-Host "`nSTOPPED: something that looks like a password, key or database address is about to be uploaded:" -ForegroundColor Red
  $hits | ForEach-Object { Write-Host ("  " + $_.Line.Substring(0, [Math]::Min(60, $_.Line.Length)) + " ...") -ForegroundColor Red }
  throw "Remove those lines, then run this script again. Nothing was committed or pushed."
}

# 5. Show what will be committed and wait for your OK
if (-not (git status --porcelain)) { Write-Host "Nothing new to commit." -ForegroundColor Green; exit }
Write-Host "`nFiles to be committed:" -ForegroundColor Cyan
git status -s
if (-not $Message) { $Message = Read-Host "`nCommit message (Enter for 'Update admin site')"; if (-not $Message) { $Message = "Update admin site" } }
Read-Host "Press Enter to commit and push (Ctrl+C to cancel)" | Out-Null

git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "Commit failed. Copy the message above and send it to me." }

$branch = git branch --show-current
git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
  throw "Push failed. If it says the remote has changes you don't have, run:  git pull --rebase   then run this script again."
}
Write-Host "`nPushed to origin/$branch." -ForegroundColor Green