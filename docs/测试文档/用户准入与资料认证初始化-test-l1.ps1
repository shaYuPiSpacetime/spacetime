param(
    [string]$ApiUrl = $env:API_URL,
    [string]$AdminAccount = $env:ADMIN_ACCOUNT,
    [string]$AdminPassword = $env:ADMIN_PASSWORD,
    [string]$OutputJson = "docs/test-artifacts/prd01-l1-real-results.json"
)

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

function Load-L1DotEnv {
    param([string]$Path)
    if (-not (Test-Path -Path $Path)) {
        return
    }
    foreach ($rawLine in Get-Content -Path $Path -Encoding UTF8) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            continue
        }
        $index = $line.IndexOf("=")
        if ($index -le 0) {
            continue
        }
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

Load-L1DotEnv ".env"
Load-L1DotEnv "backend/.env.local"

if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = $env:API_URL }
if ([string]::IsNullOrWhiteSpace($AdminAccount)) { $AdminAccount = $env:ADMIN_ACCOUNT }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { $AdminPassword = $env:ADMIN_PASSWORD }

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    $ApiUrl = "http://127.0.0.1:8080"
}
$ApiUrl = $ApiUrl.TrimEnd("/")
$AllowWrite = $env:ALLOW_WRITE -eq "1"
$AdminWriteUserId = $env:ADMIN_WRITE_USER_ID
$script:Results = New-Object System.Collections.Generic.List[object]
$script:AdminToken = $null
$script:MiniToken = $null

function Convert-L1Response {
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

function Invoke-L1Request {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["X-Auth-Token"] = $Token
    }
    $params = @{
        Method = $Method
        Uri = "$ApiUrl$Path"
        Headers = $headers
        UseBasicParsing = $true
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params["ContentType"] = "application/json; charset=utf-8"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 12)
    }
    try {
        $response = Invoke-WebRequest @params
        return Convert-L1Response $response.StatusCode (Get-L1ResponseText $response)
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
        return Convert-L1Response $status $content
    }
}

function Get-L1ResponseText {
    param($Response)
    if ($Response -and $Response.RawContentStream) {
        try {
            $Response.RawContentStream.Position = 0
            $reader = New-Object System.IO.StreamReader($Response.RawContentStream, [System.Text.Encoding]::UTF8)
            return $reader.ReadToEnd()
        } catch {
            return [string]$Response.Content
        }
    }
    return [string]$Response.Content
}

function Add-L1Result {
    param(
        [string]$Id,
        [string]$Layer,
        [string]$Scene,
        [string]$Result,
        [string]$Detail,
        [int]$HttpStatus = 0,
        $Code = $null
    )
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

function Test-HttpStatus {
    param([string]$Id, [string]$Layer, [string]$Scene, [object]$Resp, [int]$Expected)
    if ($Resp.status -eq $Expected) {
        Add-L1Result $Id $Layer $Scene "PASS" "HTTP $Expected" $Resp.status $Resp.code
    } else {
        Add-L1Result $Id $Layer $Scene "FAIL" "Expected HTTP $Expected, actual HTTP $($Resp.status), code=$($Resp.code), msg=$($Resp.msg)" $Resp.status $Resp.code
    }
}

function Test-Code {
    param([string]$Id, [string]$Layer, [string]$Scene, [object]$Resp, [int]$Expected)
    if ($Resp.code -eq $Expected) {
        Add-L1Result $Id $Layer $Scene "PASS" "code=$Expected" $Resp.status $Resp.code
    } else {
        Add-L1Result $Id $Layer $Scene "FAIL" "Expected code=$Expected, actual HTTP $($Resp.status), code=$($Resp.code), msg=$($Resp.msg)" $Resp.status $Resp.code
    }
}

function Skip-L1 {
    param([string]$Id, [string]$Layer, [string]$Scene, [string]$Reason)
    Add-L1Result $Id $Layer $Scene "SKIP" $Reason 0 $null
}

Write-Host "PRD01 L1 real environment check: API=$ApiUrl ALLOW_WRITE=$AllowWrite"

Test-HttpStatus "L1-AUTH-001" "admin" "admin-list-without-token" (Invoke-L1Request "GET" "/admin/users/app/list?pageNum=1&pageSize=10") 401
Test-HttpStatus "L1-AUTH-005" "miniapp" "miniapp-profile-without-token" (Invoke-L1Request "GET" "/miniapp/profile/home-detail") 401

if ([string]::IsNullOrWhiteSpace($AdminAccount) -or [string]::IsNullOrWhiteSpace($AdminPassword)) {
    Skip-L1 "L1-LOGIN-001" "admin" "admin-real-login" "ADMIN_ACCOUNT or ADMIN_PASSWORD is missing"
} else {
    $loginResp = Invoke-L1Request "POST" "/admin/login" @{ account = $AdminAccount; password = $AdminPassword }
    if ($loginResp.code -eq 200 -and $loginResp.data -and $loginResp.data.token) {
        $script:AdminToken = [string]$loginResp.data.token
        Add-L1Result "L1-LOGIN-001" "admin" "admin-real-login" "PASS" "token obtained but not persisted" $loginResp.status $loginResp.code
    } else {
        Add-L1Result "L1-LOGIN-001" "admin" "admin-real-login" "FAIL" "Login failed: HTTP $($loginResp.status), code=$($loginResp.code), msg=$($loginResp.msg)" $loginResp.status $loginResp.code
    }
}

if ($script:AdminToken) {
    $userList = Invoke-L1Request "GET" "/admin/users/app/list?pageNum=1&pageSize=10" $null $script:AdminToken
    Test-Code "L1-ADM-USER-001" "admin" "app-user-list-default" $userList 200
    Test-Code "L1-ADM-USER-002" "admin" "app-user-list-pagination" (Invoke-L1Request "GET" "/admin/users/app/list?pageNum=2&pageSize=5" $null $script:AdminToken) 200
    Test-Code "L1-ADM-USER-003" "admin" "app-user-list-empty-query" (Invoke-L1Request "GET" "/admin/users/app/list?pageNum=1&pageSize=10&phone=19999999999" $null $script:AdminToken) 200

    $firstUserId = $null
    if ($userList.data -and $userList.data.records -and $userList.data.records.Count -gt 0) {
        $firstUserId = $userList.data.records[0].id
    }
    if ($firstUserId) {
        Test-Code "L1-ADM-USER-004" "admin" "app-user-detail" (Invoke-L1Request "GET" "/admin/users/app/$firstUserId" $null $script:AdminToken) 200
    } else {
        Skip-L1 "L1-ADM-USER-004" "admin" "app-user-detail" "No user id discovered from list"
    }

    foreach ($item in @(
        @{ id = "L1-ADM-AUDIT-001"; path = "/admin/verify/real-name/list?pageNum=1&pageSize=10&auditSource=MACHINE"; scene = "real-name-audit-list-with-source-filter" },
        @{ id = "L1-ADM-AUDIT-007"; path = "/admin/verify/education/list?pageNum=1&pageSize=10"; scene = "education-audit-list" },
        @{ id = "L1-ADM-AUDIT-006"; path = "/admin/verify/avatar/list?pageNum=1&pageSize=10"; scene = "avatar-audit-list" },
        @{ id = "L1-ADM-AUDIT-008"; path = "/admin/moderation/photos/list?pageNum=1&pageSize=10"; scene = "photo-moderation-list" },
        @{ id = "L1-ADM-AUDIT-009"; path = "/admin/moderation/texts/list?pageNum=1&pageSize=10"; scene = "open-text-moderation-list" }
    )) {
        Test-Code $item.id "admin" $item.scene (Invoke-L1Request "GET" $item.path $null $script:AdminToken) 200
    }

    foreach ($group in @("PRD01_ACCESS", "PRD01_PROFILE_FIELD", "PRD01_UPLOAD", "PRD01_AUDIT")) {
        Test-Code "L1-CONFIG-001-$group" "admin" "prd01-config-$group" (Invoke-L1Request "GET" "/admin/prd01/config?group=$group" $null $script:AdminToken) 200
    }
    $configResp = Invoke-L1Request "GET" "/admin/prd01/config?group=PRD01_ACCESS" $null $script:AdminToken
    if ($configResp.code -eq 200 -and $configResp.data -and @($configResp.data).Count -gt 0) {
        $items = @()
        foreach ($item in @($configResp.data)) {
            $items += @{
                configKey = $item.configKey
                configValue = $item.configValue
                configGroup = $item.configGroup
                configType = $item.configType
                publicVisible = $item.publicVisible
                status = $item.status
                remark = $item.remark
            }
        }
        Test-Code "L1-CONFIG-002" "admin" "prd01-config-save-same-values" (Invoke-L1Request "POST" "/admin/prd01/config" @{ items = $items } $script:AdminToken) 200
    } else {
        Add-L1Result "L1-CONFIG-002" "admin" "prd01-config-save-same-values" "FAIL" "PRD01_ACCESS config items are empty, cannot verify save flow" $configResp.status $configResp.code
    }
    $badGroup = Invoke-L1Request "GET" "/admin/prd01/config?group=BAD_GROUP" $null $script:AdminToken
    if ($badGroup.code -ne 200) {
        Add-L1Result "L1-CONFIG-003" "admin" "invalid-config-group" "PASS" "Rejected: code=$($badGroup.code), msg=$($badGroup.msg)" $badGroup.status $badGroup.code
    } else {
        Add-L1Result "L1-CONFIG-003" "admin" "invalid-config-group" "FAIL" "Invalid group was not rejected" $badGroup.status $badGroup.code
    }

    if ($AllowWrite -and -not [string]::IsNullOrWhiteSpace($AdminWriteUserId)) {
        $freezeResp = Invoke-L1Request "PUT" "/admin/users/app/$AdminWriteUserId/status" @{ status = "FROZEN" } $script:AdminToken
        $restoreResp = Invoke-L1Request "PUT" "/admin/users/app/$AdminWriteUserId/status" @{ status = "NORMAL" } $script:AdminToken
        if ($freezeResp.code -eq 200 -and $restoreResp.code -eq 200) {
            Add-L1Result "L1-ADM-USER-008" "admin" "freeze-user-write-flow" "PASS" "freeze and restore NORMAL both returned code=200" $restoreResp.status $restoreResp.code
        } else {
            Add-L1Result "L1-ADM-USER-008" "admin" "freeze-user-write-flow" "FAIL" "freeze code=$($freezeResp.code), restore code=$($restoreResp.code)" $restoreResp.status $restoreResp.code
        }
    } else {
        Skip-L1 "L1-ADM-USER-008" "admin" "freeze-user-write-flow" "Set both ALLOW_WRITE=1 and ADMIN_WRITE_USER_ID to avoid freezing a real user by accident"
    }
} else {
    foreach ($id in @(
        "L1-ADM-USER-001","L1-ADM-USER-002","L1-ADM-USER-003","L1-ADM-USER-004",
        "L1-ADM-AUDIT-001","L1-ADM-AUDIT-006","L1-ADM-AUDIT-007","L1-ADM-AUDIT-008","L1-ADM-AUDIT-009",
        "L1-CONFIG-001","L1-CONFIG-003","L1-ADM-USER-008"
    )) {
        Skip-L1 $id "admin" "admin-token-dependent-case" "Admin login failed"
    }
}

Test-Code "L1-MINI-CONFIG-001" "miniapp" "miniapp-prd01-public-config" (Invoke-L1Request "GET" "/miniapp/config/prd01") 200
Test-Code "L1-MINI-CONFIG-002" "miniapp" "miniapp-region-provinces" (Invoke-L1Request "GET" "/miniapp/dict/locations") 200
Test-Code "L1-MINI-CONFIG-003" "miniapp" "miniapp-region-cities" (Invoke-L1Request "GET" "/miniapp/dict/locations?parentCode=110000") 200
Test-Code "L1-MINI-CONFIG-004" "miniapp" "miniapp-region-districts" (Invoke-L1Request "GET" "/miniapp/dict/locations?parentCode=110100") 200
Test-Code "L1-MINI-AUTH-001" "miniapp" "wechat-login-without-protocol" (Invoke-L1Request "POST" "/miniapp/auth/wechat-login" @{ code = "mock_new_user_code"; agreeProtocol = $false }) 5001

if ($AllowWrite) {
    $phone = "13" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString()
    $smsResp = Invoke-L1Request "POST" "/miniapp/auth/sms-code" @{ phone = $phone }
    $miniLogin = Invoke-L1Request "POST" "/miniapp/auth/phone-login" @{ phone = $phone; smsCode = "000000"; agreeProtocol = $true }
    if ($smsResp.code -eq 200 -and $miniLogin.code -eq 200 -and $miniLogin.data -and $miniLogin.data.token) {
        $script:MiniToken = [string]$miniLogin.data.token
        Add-L1Result "L1-MINI-AUTH-002" "miniapp" "phone-login-create-test-user" "PASS" "miniapp token obtained; test phone is not persisted in report" $miniLogin.status $miniLogin.code
    } else {
        Add-L1Result "L1-MINI-AUTH-002" "miniapp" "phone-login-create-test-user" "FAIL" "SMS code=$($smsResp.code), login HTTP $($miniLogin.status), code=$($miniLogin.code), msg=$($miniLogin.msg)" $miniLogin.status $miniLogin.code
    }
} else {
    Skip-L1 "L1-MINI-AUTH-002" "miniapp" "phone-login-create-test-user" "Set ALLOW_WRITE=1 to create a mobile test user"
}

if ($script:MiniToken) {
    Test-Code "L1-MINI-PROFILE-001" "miniapp" "init-status" (Invoke-L1Request "GET" "/miniapp/profile/init-status" $null $script:MiniToken) 200
    Test-Code "L1-MINI-PROFILE-002" "miniapp" "init-step-gender" (Invoke-L1Request "POST" "/miniapp/profile/init-step" @{ step = 1; gender = "MALE" } $script:MiniToken) 200
    $regionResp = Invoke-L1Request "POST" "/miniapp/profile/init-step" @{ step = 5; locationProvince = "OVERSEAS"; locationCity = "OVERSEAS"; locationDistrict = "OVERSEAS" } $script:MiniToken
    if ($regionResp.code -ne 200 -and $regionResp.msg -like "*REGION_NOT_SUPPORTED*") {
        Add-L1Result "L1-MINI-PROFILE-003" "miniapp" "overseas-region-not-supported" "PASS" $regionResp.msg $regionResp.status $regionResp.code
    } else {
        Add-L1Result "L1-MINI-PROFILE-003" "miniapp" "overseas-region-not-supported" "FAIL" "Expected REGION_NOT_SUPPORTED, actual code=$($regionResp.code), msg=$($regionResp.msg)" $regionResp.status $regionResp.code
    }
    Test-Code "L1-MINI-PROFILE-006" "miniapp" "profile-home-detail" (Invoke-L1Request "GET" "/miniapp/profile/home-detail" $null $script:MiniToken) 200
    Test-Code "L1-MINI-MEDIA-001" "miniapp" "album-list" (Invoke-L1Request "GET" "/miniapp/profile/albums" $null $script:MiniToken) 200
    Test-Code "L1-MINI-MEDIA-005" "miniapp" "profile-background-detail" (Invoke-L1Request "GET" "/miniapp/profile/background" $null $script:MiniToken) 200

    Test-Code "L1-MINI-TEXT-002" "miniapp" "about-me-detail" (Invoke-L1Request "GET" "/miniapp/profile/about-me" $null $script:MiniToken) 200
    $aboutMe = Invoke-L1Request "POST" "/miniapp/profile/about-me" @{ questionKey = "interests"; contentText = "平时喜欢阅读、徒步、看展，也愿意认真分享生活里的小事。" } $script:MiniToken
    if ($aboutMe.code -eq 200) {
        Add-L1Result "L1-MINI-TEXT-003" "miniapp" "about-me-submit" "PASS" "about-me answer submitted" $aboutMe.status $aboutMe.code
    } else {
        Add-L1Result "L1-MINI-TEXT-003" "miniapp" "about-me-submit" "FAIL" "code=$($aboutMe.code), msg=$($aboutMe.msg)" $aboutMe.status $aboutMe.code
    }

    $voiceShort = Invoke-L1Request "POST" "/miniapp/profile/voice-intro" @{ voiceUrl = "https://example.com/l1-short.mp3"; duration = 3 } $script:MiniToken
    if ($voiceShort.code -ne 200 -and $voiceShort.msg -like "*VOICE_DURATION_INVALID*") {
        Add-L1Result "L1-MINI-VOICE-002" "miniapp" "voice-duration-invalid" "PASS" $voiceShort.msg $voiceShort.status $voiceShort.code
    } else {
        Add-L1Result "L1-MINI-VOICE-002" "miniapp" "voice-duration-invalid" "FAIL" "Expected VOICE_DURATION_INVALID, actual code=$($voiceShort.code), msg=$($voiceShort.msg)" $voiceShort.status $voiceShort.code
    }
    Test-Code "L1-MINI-VERIFY-001" "miniapp" "verification-status" (Invoke-L1Request "GET" "/miniapp/verify/status" $null $script:MiniToken) 200
    Test-Code "L1-MINI-VERIFY-007" "miniapp" "access-status" (Invoke-L1Request "GET" "/miniapp/profile/access-status" $null $script:MiniToken) 200
} else {
    foreach ($id in @(
        "L1-MINI-PROFILE-001","L1-MINI-PROFILE-002","L1-MINI-PROFILE-003","L1-MINI-PROFILE-006",
        "L1-MINI-MEDIA-001","L1-MINI-MEDIA-005",
        "L1-MINI-TEXT-002","L1-MINI-TEXT-003","L1-MINI-VOICE-002","L1-MINI-VERIFY-001","L1-MINI-VERIFY-007"
    )) {
        Skip-L1 $id "miniapp" "miniapp-token-dependent-case" "Miniapp login failed or write mode disabled"
    }
}

$summary = [pscustomobject]@{
    apiUrl = $ApiUrl
    allowWrite = $AllowWrite
    executedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
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
Write-Host "L1 summary: total=$($summary.total) pass=$($summary.pass) fail=$($summary.fail) skip=$($summary.skip)"
Write-Host "L1 result file: $OutputJson"
if ($summary.fail -gt 0) { exit 1 }
