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
Check "a template using {favoured} must have a verdict" (Api Post "/api/admin/templates" $owner @{ categoryId = $rb.id; name = "NoVerdict $run"; body = "Decision favours: {favoured}" }).Code 400
$t2 = Api Post "/api/admin/templates" $owner @{ categoryId = $rb.id; name = "Any $run"; verdict = "ACCUSED"; body = "Decision favours: {favoured}" }
Check "staff can list templates for the category" ((Api Get "/api/admin/templates?categoryId=$($rb.id)" $s3).Body | Where-Object { $_.id -eq $t.Body.id }).Count 1
Check "a template with its own verdict needs no extra choice" (Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t2.Body.id }).Code 200
$dr = Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t2.Body.id; verdict = "ACCUSED" }
Check "draft names who was favoured" ($dr.Body.text -match "BadGuy") $true
$dr1 = Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t.Body.id; verdict = "COMPLAINANT" }
Check "draft fills in the complainant" ($dr1.Body.text -match "TestPlayer") $true
Check "no placeholders left over" ($dr1.Body.text -notmatch "\{") $true
Check "template for another verdict is refused" (Api Post "/api/admin/complaints/$eid/draft" $s3 @{ templateId = $t.Body.id; verdict = "ACCUSED" }).Code 400
Check "admin sends the edited reply with verdict" (Api Patch "/api/admin/complaints/$eid" $s3 @{ reply = $dr1.Body.text + " (edited)"; verdict = "COMPLAINANT"; templateId = $t.Body.id }).Code 200
$gc = (Api Get "/api/game/complaints?gameId=p-$run" $null $null $game).Body | Where-Object { $_.id -eq $eid }
Check "game receives the verdict" $gc.verdict "COMPLAINANT"

Write-Host "`n-- Stage 5: staff management, suspension, audit log" -ForegroundColor Cyan
$sus = NewStaff $owner "sus" 3
$ssus = Login "sus-$run@test.local" $pw
Check "level 5 cannot suspend staff" (Api Patch "/api/admin/admins/$($sus.Body.id)" $s5 @{ suspended = $true }).Code 403
Check "level 6 cannot suspend a top-tier account" (Api Patch "/api/admin/admins/$($tech.Body.id)" $s6 @{ suspended = $true }).Code 403
Check "level 6 can suspend a level 3 admin" (Api Patch "/api/admin/admins/$($sus.Body.id)" $s6 @{ suspended = $true }).Code 200
Check "suspended admin loses access immediately" (Api Get "/api/admin/complaints" $ssus).Code 403
Check "suspended admin cannot sign in" ([bool](Login "sus-$run@test.local" $pw)) $false
Check "level 6 can restore them" (Api Patch "/api/admin/admins/$($sus.Body.id)" $s6 @{ suspended = $false }).Code 200
Check "restored admin can sign in" ([bool](Login "sus-$run@test.local" $pw)) $true
$staffList = (Api Get "/api/admin/admins" $s6).Body
Check "staff list: level 6 can manage a level 3" (($staffList | Where-Object { $_.name -eq "sus" }).canManage) $true
Check "staff list: level 6 cannot manage tech" (($staffList | Where-Object { $_.name -eq "tech" }).canManage) $false
Check "level 3 cannot read the audit log" (Api Get "/api/admin/audit" $s3).Code 403
$au = Api Get "/api/admin/audit?action=STAFF_UPDATE" $owner
Check "owner can read the audit log" ($au.Body.items.Count -ge 1) $true
Check "audit filter works" (@($au.Body.items | Where-Object { $_.action -ne "STAFF_UPDATE" }).Count) 0
Check "level 6 cannot edit categories" (Api Patch "/api/admin/categories/$($rb.id)" $s6 @{ minReplyLevel = 4 }).Code 403
Check "owner can edit categories" (Api Patch "/api/admin/categories/$($rb.id)" $owner @{ minReplyLevel = 3 }).Code 200

Write-Host "`n-- Stage 6: public home page and site settings" -ForegroundColor Cyan
$before = (Api Get "/api/admin/settings" $owner).Body
Check "level 3 cannot read site settings" (Api Get "/api/admin/settings" $s3).Code 403
Check "level 6 cannot change site settings" (Api Put "/api/admin/settings" $s6 @{ apkUrl = "https://example.com/app.apk" }).Code 403
Check "non-https link is rejected" (Api Put "/api/admin/settings" $owner @{ apkUrl = "http://example.com/app.apk" }).Code 400
Check "owner can save download links" (Api Put "/api/admin/settings" $owner @{ apkUrl = "https://example.com/test-$run.apk"; apkVersion = "9.9.9"; playStoreUrl = $null; launchStatus = "LIVE" }).Code 200
$homePage = (Invoke-WebRequest "$base/" -UseBasicParsing).Content
Check "home page is public and shows the APK link" ($homePage -match "test-$run\.apk") $true
Check "home page shows Coming soon for a missing store link" ($homePage -match "Coming soon") $true
Check "home page shows the Now Live badge" ($homePage -match "Now Live") $true
Api Put "/api/admin/settings" $owner @{ apkUrl = $before.apkUrl; apkVersion = $before.apkVersion; playStoreUrl = $before.playStoreUrl; appStoreUrl = $before.appStoreUrl; discordUrl = $before.discordUrl; launchStatus = $before.launchStatus; statSlots = $before.statSlots; statUptime = $before.statUptime; statCitizens = $before.statCitizens } | Out-Null

Write-Host "`n-- Stage 7: judgment buttons" -ForegroundColor Cyan
$list3 = (Api Get "/api/admin/templates?categoryId=$($rb.id)" $s3).Body
$appr = $list3 | Where-Object { $_.name -eq "Approved" } | Select-Object -First 1
$wrong = $list3 | Where-Object { $_.name -eq "Wrong complaint" } | Select-Object -First 1
$techJ = $list3 | Where-Object { $_.name -eq "Technical issue" } | Select-Object -First 1
Check "level 3 may use Approved" $appr.canUse $true
Check "level 3 may use Technical issue" $techJ.canUse $true
Check "level 3 may not use Wrong complaint" $wrong.canUse $false
$j1 = Complain "Rule Break" $null
Check "level 3 can fill the Approved judgment" (Api Post "/api/admin/complaints/$j1/draft" $s3 @{ templateId = $appr.id }).Code 200
Check "level 3 cannot fill a level 5 judgment" (Api Post "/api/admin/complaints/$j1/draft" $s3 @{ templateId = $wrong.id }).Code 403
Check "level 3 cannot send a level 5 judgment" (Api Patch "/api/admin/complaints/$j1" $s3 @{ reply = "x"; templateId = $wrong.id }).Code 403
Check "level 3 sends Approved" (Api Patch "/api/admin/complaints/$j1" $s3 @{ reply = "Approved text"; templateId = $appr.id }).Code 200
$d1 = (Api Get "/api/admin/complaints/$j1" $s3).Body
Check "the judgment closed the complaint" $d1.status "RESOLVED"
Check "the verdict came from the judgment" $d1.verdict "COMPLAINANT"
Check "responded date is filled in" ([bool]$d1.respondedAt) $true
$j2 = Complain "Rule Break" $null
Check "level 5 can send a level 5 judgment" (Api Patch "/api/admin/complaints/$j2" $s5 @{ reply = "Wrong complaint"; templateId = $wrong.id }).Code 200
Check "that judgment dismissed the complaint" (Api Get "/api/admin/complaints/$j2" $s5).Body.status "DISMISSED"
$hk = Complain "Hacking" $null
Check "category rule still applies: level 5 cannot judge Hacking" (Api Patch "/api/admin/complaints/$hk" $s5 @{ reply = "x"; templateId = $appr.id }).Code 403
Check "level 3 cannot create judgments" (Api Post "/api/admin/templates" $s3 @{ name = "X $run"; body = "Hello {complainant}" }).Code 403
$g = Api Post "/api/admin/templates" $owner @{ name = "Global $run"; minLevel = 5; closesAs = "DISMISSED"; body = "Hello {complainant}, regarding {accused}." }
Check "owner can add a judgment for every category" $g.Code 201
Check "level 3 does not get that level 5 judgment" (((Api Get "/api/admin/templates?categoryId=$($rb.id)" $s3).Body | Where-Object { $_.id -eq $g.Body.id }).canUse) $false

Write-Host "`n-- Stage 8: roles" -ForegroundColor Cyan
$roles = (Api Get "/api/admin/roles" $owner).Body
function RoleId($n) { ($roles | Where-Object { $_.name -eq $n }).id }
Check "built-in roles exist" (@($roles | Where-Object { $_.system }).Count -ge 8) $true
$cur = Api Post "/api/admin/admins" $owner @{ email = "cur-$run@test.local"; name = "cur"; password = $pw; roleId = (RoleId "Curator"); level = 3 }
Check "owner can create a Curator at level 3" $cur.Code 201
Check "Curator cannot be level 5" (Api Patch "/api/admin/admins/$($cur.Body.id)" $owner @{ level = 5 }).Code 400
Check "Curator cannot be level 1" (Api Patch "/api/admin/admins/$($cur.Body.id)" $owner @{ level = 1 }).Code 400
Check "Curator can move to level 4" (Api Patch "/api/admin/admins/$($cur.Body.id)" $owner @{ level = 4 }).Code 200
$sa = NewStaff $owner "sa" 4
Check "owner can give the Senior admin role at level 5" (Api Patch "/api/admin/admins/$($sa.Body.id)" $owner @{ roleId = (RoleId "Senior admin"); level = 5 }).Code 200
Check "Senior admin role refuses level 4" (Api Patch "/api/admin/admins/$($sa.Body.id)" $owner @{ roleId = (RoleId "Senior admin"); level = 4 }).Code 400
Check "level 6 can give Curator at level 3" (Api Patch "/api/admin/admins/$($sa.Body.id)" $s6 @{ roleId = (RoleId "Curator"); level = 3 }).Code 200
Check "level 6 cannot give the Chief admin role" (Api Patch "/api/admin/admins/$($cur.Body.id)" $s6 @{ roleId = (RoleId "Chief admin"); level = 6 }).Code 403
Check "level 6 cannot give the Tech role" (Api Patch "/api/admin/admins/$($cur.Body.id)" $s6 @{ roleId = (RoleId "Tech") }).Code 403
Check "owner can give the Developer role" (Api Patch "/api/admin/admins/$($cur.Body.id)" $owner @{ roleId = (RoleId "Developer") }).Code 200
$scur = Login "cur-$run@test.local" $pw
Check "the Developer role has full rights" (Api Get "/api/admin/me" $scur).Body.canManageSite $true
Check "owner can move them back to Curator" (Api Patch "/api/admin/admins/$($cur.Body.id)" $owner @{ roleId = (RoleId "Curator"); level = 3 }).Code 200
Check "full rights are gone again" (Api Get "/api/admin/me" $scur).Body.canManageSite $false
$cr = @{ name = "Appeals $run"; minLevel = 3; maxLevel = 4; extraRights = @("MANAGE_TEMPLATES") }
Check "level 6 cannot create roles" (Api Post "/api/admin/roles" $s6 $cr).Code 403
$crole = Api Post "/api/admin/roles" $owner $cr
Check "owner can create a custom role" $crole.Code 201
Check "level 6 cannot give a role with extra rights" (Api Patch "/api/admin/admins/$($sa.Body.id)" $s6 @{ roleId = $crole.Body.id; level = 3 }).Code 403
Check "owner gives the custom role" (Api Patch "/api/admin/admins/$($sa.Body.id)" $owner @{ roleId = $crole.Body.id; level = 4 }).Code 200
$ssa = Login "sa-$run@test.local" $pw
Check "the role's extra right applies" (Api Get "/api/admin/me" $ssa).Body.canManageTemplates $true
Check "a role's range cannot shrink under someone holding it" (Api Patch "/api/admin/roles/$($crole.Body.id)" $owner @{ maxLevel = 3 }).Code 409
Check "built-in roles cannot be edited" (Api Patch "/api/admin/roles/$(RoleId 'Curator')" $owner @{ name = "Renamed" }).Code 403
Check "level 6 sees Chief admin as not assignable" (((Api Get "/api/admin/roles" $s6).Body | Where-Object { $_.name -eq "Chief admin" }).assignable) $false

Write-Host "`n$pass passed, $fail failed" -ForegroundColor $(if ($fail) { "Red" } else { "Green" })