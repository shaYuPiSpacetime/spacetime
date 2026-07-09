param(
    [string]$ApiUrl = "http://127.0.0.1:8080",
    [string]$AdminAccount = "peter",
    [string]$AdminPassword = "000000",
    [string]$OutputJson = "docs/test-artifacts/prd01-unified-audit-l1-results.json"
)

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$ErrorActionPreference = "Stop"

$script:Results = New-Object System.Collections.Generic.List[object]
$script:AdminToken = $null
$script:MiniToken = $null
$script:MiniUserId = $null
$script:SeededReviewingId = $null
$ApiUrl = $ApiUrl.TrimEnd("/")

function Load-DotEnv {
    param([string]$Path)
    if (-not (Test-Path -Path $Path)) { return }
    foreach ($rawLine in Get-Content -Path $Path -Encoding UTF8) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) { continue }
        $index = $line.IndexOf("=")
        if ($index -le 0) { continue }
        $key = $line.Substring(0, $index).Trim()
        $value = $line.Substring($index + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

function Add-Result {
    param([string]$Id, [string]$Layer, [string]$Scene, [string]$Result, [string]$Detail, [int]$HttpStatus = 0, $Code = $null)
    $script:Results.Add([pscustomobject]@{
        id = $Id
        layer = $Layer
        scene = $Scene
        result = $Result
        httpStatus = $HttpStatus
        code = $Code
        detail = $Detail
    })
    Write-Host "[$Result] $Id $Scene - $Detail"
}

function Convert-Response {
    param([int]$Status, [string]$Content)
    $json = $null
    if (-not [string]::IsNullOrWhiteSpace($Content)) {
        try { $json = $Content | ConvertFrom-Json -ErrorAction Stop } catch { $json = $null }
    }
    return [pscustomobject]@{
        status = $Status
        code = if ($json -and $null -ne $json.code) { [int]$json.code } else { $null }
        msg = if ($json -and $null -ne $json.msg) { [string]$json.msg } else { $null }
        data = if ($json) { $json.data } else { $null }
        body = $Content
    }
}

function Get-ResponseText {
    param($Response)
    if ($Response -and $Response.RawContentStream) {
        $Response.RawContentStream.Position = 0
        $reader = New-Object System.IO.StreamReader($Response.RawContentStream, [System.Text.Encoding]::UTF8)
        return $reader.ReadToEnd()
    }
    return [string]$Response.Content
}

function Invoke-Api {
    param([string]$Method, [string]$Path, [object]$Body = $null, [string]$Token = $null)
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) { $headers["X-Auth-Token"] = $Token }
    $params = @{
        Method = $Method
        Uri = "$ApiUrl$Path"
        Headers = $headers
        UseBasicParsing = $true
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params["ContentType"] = "application/json; charset=utf-8"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 20)
    }
    try {
        $response = Invoke-WebRequest @params
        return Convert-Response $response.StatusCode (Get-ResponseText $response)
    } catch {
        $status = 0
        $content = $_.ErrorDetails.Message
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            if ([string]::IsNullOrWhiteSpace($content)) {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
                    $content = $reader.ReadToEnd()
                }
            }
        }
        return Convert-Response $status $content
    }
}

function Expect-Code {
    param([string]$Id, [string]$Layer, [string]$Scene, [object]$Resp, [int]$Expected)
    if ($Resp.code -eq $Expected) {
        Add-Result $Id $Layer $Scene "PASS" "code=$Expected" $Resp.status $Resp.code
    } else {
        Add-Result $Id $Layer $Scene "FAIL" "expected code=$Expected actual http=$($Resp.status) code=$($Resp.code) msg=$($Resp.msg)" $Resp.status $Resp.code
    }
}

function Expect-True {
    param([string]$Id, [string]$Layer, [string]$Scene, [bool]$Condition, [string]$PassDetail, [string]$FailDetail)
    if ($Condition) {
        Add-Result $Id $Layer $Scene "PASS" $PassDetail
    } else {
        Add-Result $Id $Layer $Scene "FAIL" $FailDetail
    }
}

function Find-JdbcJar {
    $candidates = @(
        "$env:USERPROFILE\.m2\repository\com\mysql\mysql-connector-j\8.3.0\mysql-connector-j-8.3.0.jar",
        "$env:USERPROFILE\.m2\repository\com\mysql\mysql-connector-j\8.0.33\mysql-connector-j-8.0.33.jar",
        "$env:USERPROFILE\.m2\repository\com\mysql\mysql-connector-j\9.1.0\mysql-connector-j-9.1.0.jar"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -Path $candidate) { return $candidate }
    }
    throw "mysql-connector-j jar not found in local Maven repository"
}

function Ensure-Java {
    $java21 = Join-Path $env:USERPROFILE ".jdks\ms-21.0.11"
    if ((Test-Path -Path (Join-Path $java21 "bin\jshell.exe")) -and [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $env:JAVA_HOME = $java21
    }
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $env:Path = (Join-Path $env:JAVA_HOME "bin") + ";$env:Path"
    }
}

function Invoke-DbFixture {
    param([long]$UserId, [string]$Mode)
    Ensure-Java
    $runtimeDir = ".runtime"
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
    $runner = Join-Path $runtimeDir "prd01-unified-audit-db.jsh"
    $env:PRD01_TEST_USER_ID = [string]$UserId
    $env:PRD01_DB_MODE = $Mode
    @'
import java.sql.*;
String host = System.getenv("DEV_DB_HOST");
String port = System.getenv("DEV_DB_PORT");
String db = System.getenv("DEV_DB_NAME");
String user = System.getenv("DEV_DB_USER");
String password = System.getenv("DEV_DB_PASSWORD");
long appUserId = Long.parseLong(System.getenv("PRD01_TEST_USER_ID"));
String mode = System.getenv("PRD01_DB_MODE");
String url = "jdbc:mysql://" + host + ":" + port + "/" + db + "?useUnicode=true&characterEncoding=utf8&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai";
Class.forName("com.mysql.cj.jdbc.Driver");
try (Connection conn = DriverManager.getConnection(url, user, password)) {
    if ("seedReviewing".equals(mode)) {
        String insert = "INSERT INTO app_user_audit_record (user_id,audit_group,audit_type,object_key,status,audit_source,current_effective,content_text,submit_payload_json,masked_payload_json,submit_time,create_time,update_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),NOW(),0)";
        try (PreparedStatement ps = conn.prepareStatement(insert, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, appUserId);
            ps.setString(2, "TEXT");
            ps.setString(3, "PROFILE_QA");
            ps.setString(4, "PROFILE_QA");
            ps.setString(5, "REVIEWING");
            ps.setString(6, "MANUAL");
            ps.setInt(7, 0);
            ps.setString(8, "L1 reviewing seed text");
            ps.setString(9, "{\"fieldName\":\"PROFILE_QA\",\"contentText\":\"L1 reviewing seed text\"}");
            ps.setString(10, "{\"fieldName\":\"PROFILE_QA\",\"contentText\":\"L1 reviewing seed text\"}");
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                rs.next();
                long id = rs.getLong(1);
                try (PreparedStatement hs = conn.prepareStatement("INSERT INTO app_user_audit_history (audit_record_id,user_id,audit_type,from_status,to_status,audit_source,action,reason,operator_type,operator_id,operator_name,snapshot_json,create_time,update_time,deleted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0)")) {
                    hs.setLong(1, id);
                    hs.setLong(2, appUserId);
                    hs.setString(3, "PROFILE_QA");
                    hs.setString(4, "PENDING");
                    hs.setString(5, "REVIEWING");
                    hs.setString(6, "MANUAL");
                    hs.setString(7, "MANUAL_REVIEW_START");
                    hs.setString(8, "L1 seed");
                    hs.setString(9, "ADMIN");
                    hs.setLong(10, 1L);
                    hs.setString(11, "peter");
                    hs.setString(12, "{\"fieldName\":\"PROFILE_QA\"}");
                    hs.executeUpdate();
                }
                System.out.println("SEEDED_REVIEWING_ID=" + id);
            }
        }
    }
    if ("summary".equals(mode)) {
        String[] oldTables = {"app_user_verification","app_user_verification_record","app_user_profile_media","app_user_open_text_audit","app_user_voice_intro_record"};
        try (Statement st = conn.createStatement()) {
            for (String name : oldTables) {
                try (ResultSet rs = st.executeQuery("SHOW TABLES LIKE '" + name + "'")) {
                    System.out.println("OLD_TABLE:" + name + "=" + (rs.next() ? "EXISTS" : "MISSING"));
                }
            }
            try (ResultSet rs = st.executeQuery("SELECT status, COUNT(*) c FROM app_user_audit_record WHERE user_id=" + appUserId + " AND deleted=0 GROUP BY status")) {
                while (rs.next()) System.out.println("STATUS:" + rs.getString(1) + "=" + rs.getLong(2));
            }
            try (ResultSet rs = st.executeQuery("SELECT audit_source, COUNT(*) c FROM app_user_audit_record WHERE user_id=" + appUserId + " AND deleted=0 GROUP BY audit_source")) {
                while (rs.next()) System.out.println("SOURCE:" + rs.getString(1) + "=" + rs.getLong(2));
            }
            try (ResultSet rs = st.executeQuery("SELECT audit_type, COUNT(*) c FROM app_user_audit_record WHERE user_id=" + appUserId + " AND deleted=0 GROUP BY audit_type")) {
                while (rs.next()) System.out.println("TYPE:" + rs.getString(1) + "=" + rs.getLong(2));
            }
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM app_user_audit_history WHERE user_id=" + appUserId + " AND deleted=0")) {
                rs.next();
                System.out.println("HISTORY_TOTAL=" + rs.getLong(1));
            }
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM app_user_audit_history WHERE user_id=" + appUserId + " AND deleted=0 AND audit_source='MACHINE'")) {
                rs.next();
                System.out.println("HISTORY_MACHINE=" + rs.getLong(1));
            }
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM app_user_audit_history WHERE user_id=" + appUserId + " AND deleted=0 AND operator_type='ADMIN'")) {
                rs.next();
                System.out.println("HISTORY_ADMIN=" + rs.getLong(1));
            }
        }
    }
}
/exit
'@ | Set-Content -Path $runner -Encoding ASCII
    jshell --class-path (Find-JdbcJar) $runner
}

function Get-Records {
    param([string]$Path)
    $sep = if ($Path.Contains("?")) { "&" } else { "?" }
    $resp = Invoke-Api "GET" "$Path${sep}page=1&size=100&userId=$script:MiniUserId" $null $script:AdminToken
    Expect-Code "L1-LIST-$($Path.GetHashCode())" "admin" "list $Path by userId" $resp 200
    if ($resp.code -eq 200 -and $resp.data -and $resp.data.records) {
        return @($resp.data.records)
    }
    return @()
}

function Latest-Record {
    param([string]$Path, [string]$Status = $null)
    $records = @(Get-Records $Path)
    if (-not [string]::IsNullOrWhiteSpace($Status)) {
        $records = @($records | Where-Object { $_.status -eq $Status })
    }
    if ($records.Count -gt 0) { return $records[0] }
    return $null
}

function Audit-Record {
    param([string]$Path, [long]$Id, [string]$Action, [string]$Reason = $null)
    $body = @{ action = $Action }
    if (-not [string]::IsNullOrWhiteSpace($Reason)) { $body.rejectReason = $Reason }
    $resp = Invoke-Api "POST" "$Path/$Id/audit" $body $script:AdminToken
    Expect-Code "L1-AUDIT-$Action-$Id" "admin" "$Path audit $Action" $resp 200
}

Load-DotEnv ".env"
Load-DotEnv "backend/.env.local"

Expect-Code "L1-SVC-001" "backend" "health" (Invoke-Api "GET" "/health") 200

$adminLogin = Invoke-Api "POST" "/admin/login" @{ account = $AdminAccount; password = $AdminPassword }
if ($adminLogin.code -eq 200 -and $adminLogin.data.token) {
    $script:AdminToken = [string]$adminLogin.data.token
    Add-Result "L1-ADMIN-LOGIN" "admin" "peter-login" "PASS" "token obtained; permissions=$(@($adminLogin.data.permissions).Count)" $adminLogin.status $adminLogin.code
} else {
    Add-Result "L1-ADMIN-LOGIN" "admin" "peter-login" "FAIL" "login failed http=$($adminLogin.status) code=$($adminLogin.code) msg=$($adminLogin.msg)" $adminLogin.status $adminLogin.code
}

$phone = "139" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$miniLogin = Invoke-Api "POST" "/miniapp/auth/phone-login" @{ phone = $phone; smsCode = "000000"; agreeProtocol = $true }
if ($miniLogin.code -eq 200 -and $miniLogin.data.token -and $miniLogin.data.userId) {
    $script:MiniToken = [string]$miniLogin.data.token
    $script:MiniUserId = [long]$miniLogin.data.userId
    Add-Result "L1-MINI-LOGIN" "miniapp" "phone-login-create-user" "PASS" "userId=$script:MiniUserId token obtained" $miniLogin.status $miniLogin.code
} else {
    Add-Result "L1-MINI-LOGIN" "miniapp" "phone-login-create-user" "FAIL" "login failed http=$($miniLogin.status) code=$($miniLogin.code) msg=$($miniLogin.msg)" $miniLogin.status $miniLogin.code
}

if ($script:AdminToken -and $script:MiniToken) {
    Expect-Code "L1-PROFILE-001" "miniapp" "init step1" (Invoke-Api "POST" "/miniapp/profile/init-save" @{ step = 1; nickname = "AuditL1User"; gender = "MALE"; birthday = "1998-01-01" } $script:MiniToken) 200
    Expect-Code "L1-PROFILE-002" "miniapp" "init step2" (Invoke-Api "POST" "/miniapp/profile/init-save" @{ step = 2; height = 178; weight = 70 } $script:MiniToken) 200
    Expect-Code "L1-PROFILE-003" "miniapp" "init step3" (Invoke-Api "POST" "/miniapp/profile/init-save" @{ step = 3; identity = "WORKER"; datingGoal = "SERIOUS_RELATIONSHIP"; emotionalStatus = "SINGLE" } $script:MiniToken) 200
    Expect-Code "L1-PROFILE-004" "miniapp" "init step4" (Invoke-Api "POST" "/miniapp/profile/init-save" @{ step = 4; educationLevel = "BACHELOR"; school = "StarRiverUniversity"; major = "ComputerScience" } $script:MiniToken) 200
    Expect-Code "L1-PROFILE-005" "miniapp" "init complete" (Invoke-Api "POST" "/miniapp/profile/init-complete" @{ step = 5; locationProvince = "Shanghai"; locationCity = "Shanghai"; locationDistrict = "Pudong"; hometownProvince = "Jiangsu"; hometownCity = "Nanjing"; hometownDistrict = "Gulou" } $script:MiniToken) 200

    $idTail = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
    Expect-Code "L1-VERIFY-REAL-001" "miniapp" "submit real-name machine approved" (Invoke-Api "POST" "/miniapp/verify/real-name" @{ realName = "AuditUser"; idCard = "11010119900101$idTail"; singlePromise = $true } $script:MiniToken) 200
    $realName = Latest-Record "/admin/verify/real-name/list" "APPROVED"
    Expect-True "L1-ADM-REAL-001" "admin" "real-name list approved" ($null -ne $realName) "real-name approved record visible" "real-name approved record not found"

    Expect-Code "L1-MEDIA-AVATAR-001" "miniapp" "upload avatar pending" (Invoke-Api "POST" "/miniapp/profile/media" @{ mediaType = "AVATAR"; mediaUrl = "https://example.test/prd01/avatar-a.jpg"; thumbUrl = "https://example.test/prd01/avatar-a-thumb.jpg"; sortOrder = 1 } $script:MiniToken) 200
    $avatarPending = Latest-Record "/admin/verify/avatar/list" "PENDING"
    Expect-True "L1-ADM-AVATAR-001" "admin" "avatar pending visible" ($null -ne $avatarPending) "avatar pending id=$($avatarPending.id)" "avatar pending not found"
    if ($avatarPending) {
        Expect-Code "L1-VERIFY-AVATAR-001" "miniapp" "verify same avatar media machine approved" (Invoke-Api "POST" "/miniapp/verify/avatar" @{ mediaId = [long]$avatarPending.id } $script:MiniToken) 200
    }

    foreach ($schoolSuffix in @("A","B","C","D")) {
        Expect-Code "L1-VERIFY-EDU-SUBMIT-$schoolSuffix" "miniapp" "submit education $schoolSuffix" (Invoke-Api "POST" "/miniapp/verify/education" @{ educationMethod = "CHSI"; school = "StarRiverUniversity$schoolSuffix"; studentStatus = "GRADUATED"; verificationCode = "VCODE$schoolSuffix" } $script:MiniToken) 200
        $eduPending = Latest-Record "/admin/verify/education/list" "PENDING"
        Expect-True "L1-ADM-EDU-PENDING-$schoolSuffix" "admin" "education pending $schoolSuffix" ($null -ne $eduPending) "education pending id=$($eduPending.id)" "education pending missing"
        if ($eduPending) {
            if ($schoolSuffix -eq "A") { Audit-Record "/admin/verify/education" ([long]$eduPending.id) "APPROVE" }
            if ($schoolSuffix -eq "B") { Audit-Record "/admin/verify/education" ([long]$eduPending.id) "REJECT" "L1 education rejected" }
            if ($schoolSuffix -eq "C") { Audit-Record "/admin/verify/education" ([long]$eduPending.id) "EXPIRE" "L1 education expired" }
        }
    }

    foreach ($albumSuffix in @("A","B","C","D")) {
        Expect-Code "L1-MEDIA-ALBUM-SUBMIT-$albumSuffix" "miniapp" "submit album $albumSuffix" (Invoke-Api "POST" "/miniapp/profile/media" @{ mediaType = "ALBUM"; mediaUrl = "https://example.test/prd01/album-$albumSuffix.jpg"; thumbUrl = "https://example.test/prd01/album-$albumSuffix-thumb.jpg"; sortOrder = 1 } $script:MiniToken) 200
        $photoPending = Latest-Record "/admin/moderation/photos/list" "PENDING"
        Expect-True "L1-ADM-PHOTO-PENDING-$albumSuffix" "admin" "photo pending $albumSuffix" ($null -ne $photoPending) "photo pending id=$($photoPending.id)" "photo pending missing"
        if ($photoPending) {
            if ($albumSuffix -eq "A") { Audit-Record "/admin/moderation/photos" ([long]$photoPending.id) "APPROVE" }
            if ($albumSuffix -eq "C") { Audit-Record "/admin/moderation/photos" ([long]$photoPending.id) "REJECT" "L1 photo rejected" }
            if ($albumSuffix -eq "D") { Audit-Record "/admin/moderation/photos" ([long]$photoPending.id) "EXPIRE" "L1 photo expired" }
        }
    }

    Expect-Code "L1-MEDIA-BG-001" "miniapp" "submit profile background" (Invoke-Api "POST" "/miniapp/profile/media" @{ mediaType = "PROFILE_BG"; mediaUrl = "https://example.test/prd01/bg-a.jpg"; thumbUrl = "https://example.test/prd01/bg-a-thumb.jpg"; sortOrder = 1 } $script:MiniToken) 200
    $bgPending = Latest-Record "/admin/moderation/photos/list" "PENDING"
    if ($bgPending) { Audit-Record "/admin/moderation/photos" ([long]$bgPending.id) "APPROVE" }

    Expect-Code "L1-TEXT-001" "miniapp" "about me machine approved" (Invoke-Api "POST" "/miniapp/profile/open-text" @{ fieldName = "ABOUT_ME"; contentText = "I value a stable and sincere relationship and enjoy sports and exhibitions on weekends." } $script:MiniToken) 200
    Expect-Code "L1-TEXT-002" "miniapp" "hope they know machine approved" (Invoke-Api "POST" "/miniapp/profile/open-text" @{ fieldName = "HOPE_THEY_KNOW"; contentText = "I care about boundaries and hope we can plan the future together." } $script:MiniToken) 200
    Expect-Code "L1-TEXT-003" "miniapp" "profile qa machine approved" (Invoke-Api "POST" "/miniapp/profile/open-text" @{ fieldName = "PROFILE_QA"; contentText = "This is a profile QA open answer used by the unified audit L1 flow." } $script:MiniToken) 200
    $textApproved = Latest-Record "/admin/moderation/texts/list" "APPROVED"
    if ($textApproved) { Audit-Record "/admin/moderation/texts" ([long]$textApproved.id) "REJECT" "L1 text rejected" }

    Expect-Code "L1-TEXT-004" "miniapp" "custom open text rejected" (Invoke-Api "POST" "/miniapp/profile/open-text" @{ fieldName = "CUSTOM_OPEN_TEXT"; contentText = "unsupported reserved field" } $script:MiniToken) 5001
    Expect-Code "L1-VOICE-001" "miniapp" "voice intro machine approved" (Invoke-Api "POST" "/miniapp/profile/voice-intro" @{ voiceUrl = "https://example.test/prd01/voice-a.mp3"; duration = 18 } $script:MiniToken) 200
    $voiceShort = Invoke-Api "POST" "/miniapp/profile/voice-intro" @{ voiceUrl = "https://example.test/prd01/voice-short.mp3"; duration = 3 } $script:MiniToken
    Expect-True "L1-VOICE-002" "miniapp" "voice duration rejected" ($voiceShort.code -ne 200 -and $voiceShort.msg -like "*VOICE_DURATION_INVALID*") "invalid duration rejected" "invalid duration accepted or wrong msg: code=$($voiceShort.code) msg=$($voiceShort.msg)"

    $seedOutput = Invoke-DbFixture $script:MiniUserId "seedReviewing"
    $seedLine = @($seedOutput | Where-Object { $_ -like "SEEDED_REVIEWING_ID=*" }) | Select-Object -First 1
    if ($seedLine) {
        $script:SeededReviewingId = [long]($seedLine -replace "SEEDED_REVIEWING_ID=", "")
        Add-Result "L1-DB-SEED-001" "db" "seed reviewing record" "PASS" "reviewingId=$script:SeededReviewingId"
    } else {
        Add-Result "L1-DB-SEED-001" "db" "seed reviewing record" "FAIL" "missing SEEDED_REVIEWING_ID output: $($seedOutput -join '; ')"
    }

    foreach ($item in @(
        @{ id = "L1-ADM-STATUS-PENDING"; path = "/admin/verify/education/list?status=PENDING"; status = "PENDING" },
        @{ id = "L1-ADM-STATUS-APPROVED"; path = "/admin/verify/education/list?status=APPROVED"; status = "APPROVED" },
        @{ id = "L1-ADM-STATUS-REJECTED"; path = "/admin/verify/education/list?status=REJECTED"; status = "REJECTED" },
        @{ id = "L1-ADM-STATUS-EXPIRED"; path = "/admin/verify/education/list?status=EXPIRED"; status = "EXPIRED" },
        @{ id = "L1-ADM-SOURCE-MACHINE"; path = "/admin/verify/real-name/list?auditSource=MACHINE"; status = $null },
        @{ id = "L1-ADM-SOURCE-MANUAL"; path = "/admin/verify/education/list?auditSource=MANUAL"; status = $null },
        @{ id = "L1-ADM-TEXT-REVIEWING"; path = "/admin/moderation/texts/list?status=REVIEWING"; status = "REVIEWING" }
    )) {
        $records = @(Get-Records $item.path)
        Expect-True $item.id "admin" "status/source filter $($item.path)" ($records.Count -gt 0) "records=$($records.Count)" "no records returned"
    }

    $detailTargets = @(
        @{ id = "L1-DETAIL-REAL"; path = "/admin/verify/real-name"; record = $realName },
        @{ id = "L1-DETAIL-AVATAR"; path = "/admin/verify/avatar"; record = (Latest-Record "/admin/verify/avatar/list" "APPROVED") },
        @{ id = "L1-DETAIL-EDU"; path = "/admin/verify/education"; record = (Latest-Record "/admin/verify/education/list" "APPROVED") },
        @{ id = "L1-DETAIL-PHOTO"; path = "/admin/moderation/photos"; record = (Latest-Record "/admin/moderation/photos/list" "APPROVED") },
        @{ id = "L1-DETAIL-TEXT"; path = "/admin/moderation/texts"; record = (Latest-Record "/admin/moderation/texts/list" "REVIEWING") }
    )
    foreach ($target in $detailTargets) {
        if ($target.record) {
            Expect-Code $target.id "admin" "detail $($target.path)" (Invoke-Api "GET" "$($target.path)/$($target.record.id)" $null $script:AdminToken) 200
        } else {
            Add-Result $target.id "admin" "detail $($target.path)" "FAIL" "record not found"
        }
    }

    Expect-Code "L1-MINI-STATUS-001" "miniapp" "verify status after flows" (Invoke-Api "GET" "/miniapp/verify/status" $null $script:MiniToken) 200
    Expect-Code "L1-MINI-ACCESS-001" "miniapp" "access status after flows" (Invoke-Api "GET" "/miniapp/profile/access-status" $null $script:MiniToken) 200
    Expect-Code "L1-ADM-USER-001" "admin" "app user list real-time audit statuses" (Invoke-Api "GET" "/admin/users/app/list?page=1&size=20&userId=$script:MiniUserId" $null $script:AdminToken) 200
    Expect-Code "L1-ADM-USER-002" "admin" "app user detail real-time audit statuses" (Invoke-Api "GET" "/admin/users/app/$script:MiniUserId" $null $script:AdminToken) 200

    $dbOutput = Invoke-DbFixture $script:MiniUserId "summary"
    $requiredLines = @("STATUS:PENDING=", "STATUS:REVIEWING=", "STATUS:APPROVED=", "STATUS:REJECTED=", "STATUS:EXPIRED=", "SOURCE:MACHINE=", "SOURCE:MANUAL=", "HISTORY_TOTAL=", "HISTORY_MACHINE=", "HISTORY_ADMIN=")
    foreach ($prefix in $requiredLines) {
        $hit = @($dbOutput | Where-Object { $_ -like "$prefix*" }) | Select-Object -First 1
        Expect-True "L1-DB-$($prefix.Replace(':','-').Replace('=',''))" "db" "db summary $prefix" ($null -ne $hit) "$hit" "missing $prefix in $($dbOutput -join '; ')"
    }
    $oldHits = @($dbOutput | Where-Object { $_ -like "OLD_TABLE:*EXISTS*" })
    Expect-True "L1-DB-OLD-TABLES" "db" "legacy audit tables dropped" ($oldHits.Count -eq 0) "all legacy audit tables missing" "legacy tables still exist: $($oldHits -join '; ')"
}

$summary = [pscustomobject]@{
    apiUrl = $ApiUrl
    executedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    testUserId = $script:MiniUserId
    seededReviewingId = $script:SeededReviewingId
    total = $script:Results.Count
    pass = ($script:Results | Where-Object result -eq "PASS").Count
    fail = ($script:Results | Where-Object result -eq "FAIL").Count
    skip = ($script:Results | Where-Object result -eq "SKIP").Count
    results = $script:Results
}

$outDir = Split-Path -Parent $OutputJson
if (-not [string]::IsNullOrWhiteSpace($outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}
$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $OutputJson -Encoding UTF8
Write-Host "Unified audit L1 summary: total=$($summary.total) pass=$($summary.pass) fail=$($summary.fail) skip=$($summary.skip)"
Write-Host "Unified audit L1 result file: $OutputJson"
if ($summary.fail -gt 0) { exit 1 }
