# PATH: test.ps1
# Run while `npm run dev` is running in another window.
$base = "http://localhost:3000"
$cfg = @{}
Get-Content .env | ForEach-Object { if ($_ -match '^([A-Z_]+)="?(.*?)"?$') { $cfg[$Matches[1]] = $Matches[2] } }
$game = @{ "x-game-key" = $cfg["GAME_API_KEY"] }
$run = Get-Random -Maximum 99999
$pw = "TestPassw0rd!"
$pass = 0; $fail = 0

function Api($method, $path, $session, $body, $headers) {
  $p = @{ Uri = "$base$path"; Method = $method; ContentType = "application/json"; UseBasicParsing = $true }
  if ($body) { $p.Body = ($body | ConvertTo-Json -Depth 5) }
  if ($session) { $p.WebSession = $session }
  if ($headers) { $p.Headers = $headers }
  try {
    $r = Invoke-WebRequest @p
    return @{ Code = [int]$r.StatusCode; Body = ($r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue) }
  } catch { return @{ Code = [int]$_.Exception.Response.StatusCode; Body = $null } }
}
function Login($email, $password) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  try { Invoke-WebRequest "$base/api/admin/login" -Method Post -ContentType "application/json" -UseBasicParsing -WebSession $s -Body (@{ email = $email; password = $password } | ConvertTo-Json) | Out-Null; return $s } catch { return $null }
}
function Check($label, $actual, $expected) {
  if ($actual -eq $expected) { Write-Host "PASS  $label" -ForegroundColor Green; $script:pass++ }
  else { Write-Host "FAIL  $label (got $actual, expected $expected)" -ForegroundColor Red; $script:fail++ }
}
function NewStaff($owner, $tag, $level, $kind = "ADMIN") {
  $r = Api Post "/api/admin/admins" $owner @{ email = "$tag-$run@test.local"; name = $tag; password = $pw; level = $level; kind = $kind; gameId = "g-$tag-$run" }
  return $r
}
function Complain($category, $accusedGameId) {
  $b = @{ gameId = "p-$run"; username = "TestPlayer"; category = $category; message = "Test complaint for $category" }
  if ($accusedGameId) { $b.accusedGameId = $accusedGameId; $b.accusedName = "Accused" }
  return (Api Post "/api/game/complaints" $null $b $game).Body.id
}
function Reply($s, $id) { (Api Patch "/api/admin/complaints/$id" $s @{ reply = "ok" }).Code }
function Close($s, $id) { (Api Patch "/api/admin/complaints/$id" $s @{ status = "RESOLVED" }).Code }

$owner = Login $cfg["OWNER_EMAIL"] $cfg["OWNER_PASSWORD"]
Check "owner can log in" ([bool]$owner) $true

Write-Host "`n-- Creating test staff" -ForegroundColor Cyan
$l1 = NewStaff $owner "l1" 1; $l3 = NewStaff $owner "l3" 3; $l5 = NewStaff $owner "l5" 5; $l6 = NewStaff $owner "l6" 6; $tech = NewStaff $owner "tech" 1 "TECH"
Check "owner creates level 6" $l6.Code 201
$s1 = Login "l1-$run@test.local" $pw; $s3 = Login "l3-$run@test.local" $pw; $s5 = Login "l5-$run@test.local" $pw; $s6 = Login "l6-$run@test.local" $pw

Write-Host "`n-- Website access" -ForegroundColor Cyan
Check "level 1 is blocked at login" ([bool]$s1) $false
Check "level 3 can log in" ([bool]$s3) $true

Write-Host "`n-- Normal complaint (Rule Break: reply 3, close 4)" -ForegroundColor Cyan
$c = Complain "Rule Break" $null
Check "game sees category list" (Api Get "/api/game/categories" $null $null $game).Code 200
Check "level 3 can see all complaints" (Api Get "/api/admin/complaints" $s3).Code 200
Check "level 3 can reply" (Reply $s3 $c) 200
Check "level 3 cannot close" (Close $s3 $c) 403
Check "level 5 can close" (Close $s5 $c) 200

Write-Host "`n-- Hacking (level 6 only)" -ForegroundColor Cyan
$h = Complain "Hacking" $null
Check "level 5 cannot reply" (Reply $s5 $h) 403
Check "level 6 can reply" (Reply $s6 $h) 200

Write-Host "`n-- Complaint against a level 3 admin (needs level 5+)" -ForegroundColor Cyan
$a = Complain "Rule Break" "g-l3-$run"
Check "level 3 cannot act on complaint about themselves" (Reply $s3 $a) 403
Check "level 5 can act" (Reply $s5 $a) 200

Write-Host "`n-- Complaint against tech (top tier only)" -ForegroundColor Cyan
$t = Complain "Rule Break" "g-tech-$run"
Check "level 6 can see it" (Api Get "/api/admin/complaints/$t" $s6).Code 200
Check "level 6 cannot reply" (Reply $s6 $t) 403
Check "owner can reply" (Reply $owner $t) 200
Check "owner can close" (Close $owner $t) 200

Write-Host "`n-- Awarding levels" -ForegroundColor Cyan
Check "level 5 cannot award levels" (Api Patch "/api/admin/admins/$($l1.Body.id)" $s5 @{ level = 2 }).Code 403
Check "level 6 can award level 2" (Api Patch "/api/admin/admins/$($l1.Body.id)" $s6 @{ level = 2 }).Code 200
Check "level 6 cannot award level 6" (Api Patch "/api/admin/admins/$($l1.Body.id)" $s6 @{ level = 6 }).Code 403
Check "owner can award level 6" (Api Patch "/api/admin/admins/$($l1.Body.id)" $owner @{ level = 6 }).Code 200

Write-Host "`n-- Categories" -ForegroundColor Cyan
$cat = @{ name = "Test-$run"; minReplyLevel = 4; minCloseLevel = 5 }
Check "level 6 cannot add categories" (Api Post "/api/admin/categories" $s6 $cat).Code 403
Check "owner can add categories" (Api Post "/api/admin/categories" $owner $cat).Code 201

Write-Host "`n-- Game needs its key" -ForegroundColor Cyan
Check "no key = 401" (Api Get "/api/game/categories").Code 401

Write-Host "`n-- Stage 2: linking game accounts" -ForegroundColor Cyan
$lg = "link-$run"
$pre = Complain "Rule Break" $lg
Api Post "/api/admin/admins" $owner @{ email = "l4-$run@test.local"; name = "l4"; password = $pw; level = 4 } | Out-Null
$s4 = Login "l4-$run@test.local" $pw
$code = (Api Post "/api/game/link-codes" $null @{ gameId = $lg; username = "Linker" } $game).Body.code
Check "game issues a link code" ([bool]$code) $true
Check "wrong code is rejected" (Api Post "/api/admin/link" $s4 @{ code = "ZZZZ-ZZZZ" }).Code 400
Check "staff can link with the real code" (Api Post "/api/admin/link" $s4 @{ code = $code }).Code 200
Check "code cannot be reused" (Api Post "/api/admin/link" $s5 @{ code = $code }).Code 400
Check "game can tell they are staff" (Api Get "/api/game/staff?gameId=$lg" $null $null $game).Body.level 4
Check "earlier complaint now points at the staff member" (Api Get "/api/admin/complaints/$pre" $s6).Body.accusedAdmin.name "l4"
Check "linked staff cannot act on complaint about themselves" (Reply $s4 $pre) 403
Check "level 5 can act on it" (Reply $s5 $pre) 200
Check "staff can unlink themselves" (Api Delete "/api/admin/link" $s4).Code 200
Check "game no longer sees them as staff" (Api Get "/api/game/staff?gameId=$lg" $null $null $game).Body.isStaff $false

Write-Host "`n-- Stage 3: claiming, notes, history" -ForegroundColor Cyan
Api Post "/api/admin/admins" $owner @{ email = "l3b-$run@test.local"; name = "l3b"; password = $pw; level = 3 } | Out-Null
$s3b = Login "l3b-$run@test.local" $pw
$n = Complain "Rule Break" $null
Check "level 3 can claim" (Api Post "/api/admin/complaints/$n/claim" $s3).Code 200
Check "another level 3 cannot reply to a claimed complaint" (Reply $s3b $n) 409
Check "another level 3 cannot claim it" (Api Post "/api/admin/complaints/$n/claim" $s3b).Code 409
Check "claimer can reply" (Reply $s3 $n) 200
Check "other staff can still add private notes" (Api Post "/api/admin/complaints/$n/notes" $s3b @{ message = "Checked the logs" }).Code 201
Check "level 6 can take over" (Api Post "/api/admin/complaints/$n/claim" $s6).Code 200
Check "old claimer is now locked out" (Reply $s3 $n) 409
Check "level 6 can release" (Api Delete "/api/admin/complaints/$n/claim" $s6).Code 200
$g = Invoke-WebRequest "$base/api/game/complaints?gameId=p-$run" -Headers $game -UseBasicParsing
Check "private notes never reach the game" ($g.Content -notmatch "Checked the logs") $true
$auto = Complain "Rule Break" $null
Check "first reply auto-claims" (Reply $s3 $auto) 200
$d = (Api Get "/api/admin/complaints/$auto" $s3b).Body
Check "detail shows who claimed it" $d.claimedBy.name "l3"
Check "timeline holds the reply and the claim" ($d.timeline.Count -ge 2) $true
Check "filter: claimed by me" ((Api Get "/api/admin/complaints?claimed=me" $s3).Body | Where-Object { $_.id -eq $auto }).Count 1

Write-Host "`n-- Stage 4: evidence, verdicts, templates" -ForegroundColor Cyan
$rb = (Api Get "/api/admin/categories" $owner).Body | Where-Object { $_.name -eq "Rule Break" }
$ev = Api Post "/api/game/complaints" $null @{ gameId = "p-$run"; username = "TestPlayer"; category = "Rule Break"; accusedName = "BadGuy"; message = "Evidence test complaint"; evidence = @(@{ kind = "LINK"; url = "https://example.com/clip1" }, @{ kind = "TEXT"; text = "[12:01] BadGuy: freeze or I shoot" }) } $game
$eid = $ev.Body.id
Check "complaint with evidence is accepted" $ev.Code 201
Check "game can add more evidence" (Api Post "/api/game/complaints/$eid/evidence" $null @{ kind = "IMAGE"; url = "https://example.com/shot.png"; caption = "Screenshot" } $game).Code 201
Check "non-https evidence link is rejected" (Api Post "/api/game/complaints/$eid/evidence" $null @{ kind = "LINK"; url = "http://example.com/x" } $game).Code 400
Check "staff see all 3 pieces of evidence" (Api Get "/api/admin/complaints/$eid" $s3).Body.evidence.Count 3

$tpl = @{ categoryId = $rb.id; name = "Test $run"; verdict = "COMPLAINANT"; body = "Hello {complainant}, regarding {accused}: the result is {verdict}. {admin}" }
Check "level 3 cannot create templates" (Api Post "/api/admin/templates" $s3 $tpl).Code 403
Check "unknown placeholder is rejected" (Api Post "/api/admin/templates" $owner @{ categoryId = $rb.id; name = "Bad $run"; body = "Hi {nope}" }).Code 400
$t = Api Post "/api/admin/templates" $owner $tpl
Check "owner can create a template" $t.Code 201
$t2 = Api Post "/api/admin/templates" $owner @{ categoryId = $rb.id; name = "Any $run"; body = "Decision favours: {favoured}" }
Check "staff can list templates for the category" ((Api Get "/api/admin/templates?categoryId=$($rb.id)" $s3).Body | Where-Object { $_.id -eq $t.Body.id }).Count 1
Check "verdict needed for a template that uses it" (Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t2.Body.id }).Code 400
$dr = Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t2.Body.id; verdict = "ACCUSED" }
Check "draft names who was favoured" ($dr.Body.text -match "BadGuy") $true
$dr1 = Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t.Body.id; verdict = "COMPLAINANT" }
Check "draft fills in the complainant" ($dr1.Body.text -match "TestPlayer") $true
Check "no placeholders left over" ($dr1.Body.text -notmatch "\{") $true
Check "template for another verdict is refused" (Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t.Body.id; verdict = "ACCUSED" }).Code 400
Check "admin sends the edited reply with verdict" (Api Patch "/api/admin/complaints/$eid" $s3 @{ reply = $dr1.Body.text + " (edited)"; verdict = "COMPLAINANT"; templateId = $t.Body.id }).Code 200
$gc = (Api Get "/api/game/complaints?gameId=p-$run" $null $null $game).Body | Where-Object { $_.id -eq $eid }
Check "game receives the verdict" $gc.verdict "COMPLAINANT"

Write-Host "`n$pass passed, $fail failed" -ForegroundColor $(if ($fail) { "Red" } else { "Green" })