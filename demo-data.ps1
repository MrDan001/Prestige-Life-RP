# PATH: demo-data.ps1
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File .\demo-data.ps1 add       (create demo staff and 12 demo complaints)
#   powershell -ExecutionPolicy Bypass -File .\demo-data.ps1 remove    (delete all demo staff and demo complaints)
# The demo staff accounts are real logins in your database. Run "remove" before going live.
param([ValidateSet("add", "remove")][string]$Action = "add")

if (-not (Test-Path .env)) { throw ".env not found. Run this from the project root." }

if ($Action -eq "add") {
  Write-Host "`nThis adds 9 demo staff accounts (levels 1 to 6, tech and developer) and 12 demo complaints" -ForegroundColor Yellow
  Write-Host "to the database in your .env. They all share one password, which is shown once at the end." -ForegroundColor Yellow
} else {
  Write-Host "`nThis deletes every demo staff account and demo complaint. Real data is not touched." -ForegroundColor Yellow
}
if ((Read-Host "Type YES to continue") -ne "YES") { Write-Host "Cancelled."; exit }

npx tsx prisma/seed-demo.ts $Action
if ($LASTEXITCODE -ne 0) { throw "Failed. Copy the red message above and send it to me." }