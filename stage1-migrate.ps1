# PATH: stage1-migrate.ps1
# Run from the project root:  powershell -ExecutionPolicy Bypass -File .\stage1-migrate.ps1
$ErrorActionPreference = "Stop"
Write-Warning "This moves your database to the Stage 1 structure."
Write-Warning "It DELETES the Response, Complaint, Player and Admin tables (test data only) and recreates them."
Write-Warning "Only continue if this database belongs to the Prestige Life website and nothing else."
if ((Read-Host "Type YES to continue") -ne "YES") { Write-Host "Cancelled."; exit }

$sql = 'DROP TABLE IF EXISTS "Response","Complaint","Player","Admin" CASCADE; DROP TYPE IF EXISTS "Role","ComplaintStatus" CASCADE;'
$sql | npx prisma db execute --stdin --schema prisma/schema.prisma
npx prisma db push
npx prisma generate
npx prisma db seed
Write-Host "`nStage 1 database ready. Start with: npm run dev, then run .\test.ps1" -ForegroundColor Green