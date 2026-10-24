<!-- PATH: README.md -->
# Prestige Life RP

1. Open PowerShell in this folder.
2. `powershell -ExecutionPolicy Bypass -File .\setup.ps1`
3. `npm run dev`
4. In a second window: `powershell -ExecutionPolicy Bypass -File .\test.ps1`
5. Open http://localhost:3000/auth and sign in with the Owner email and password.

Every file starts with a PATH line showing where it belongs in the project.

<!-- PATH: README.md -->
Prestige Life RP

First time:        .\setup.ps1
Upgrading to Stage 1 (existing database):  .\stage1-migrate.ps1
Start:             npm run dev
Check everything:  .\test.ps1   (in a second window)
Sign in at:        http://localhost:3000/auth

Every file starts with a PATH line showing where it belongs.