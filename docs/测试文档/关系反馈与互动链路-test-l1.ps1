param(
    [string]$ApiUrl = $env:API_URL,
    [string]$AdminToken = $env:RELATION_ADMIN_TOKEN,
    [string]$AdminAccount = $env:ADMIN_ACCOUNT,
    [string]$AdminPassword = $env:ADMIN_PASSWORD,
    [string]$NoRelationToken = $env:RELATION_NO_PERMISSION_TOKEN,
    [string]$NoCommercialToken = $env:RELATION_NO_COMMERCIAL_TOKEN,
    [long]$UserId = 0,
    [string]$OutputJson = "docs/test-artifacts/prd02-relation-l1-results.json"
)

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = "http://127.0.0.1:8080" }
$ApiUrl = $ApiUrl.TrimEnd("/")
$script:Results = New-Object System.Collections.Generic.List[object]

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

function Invoke-Api {
    param([string]$Method, [string]$Path, [string]$Token = $null, [object]$Body = $null)
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
        $params["Body"] = $Body | ConvertTo-Json -Depth 8
    }
    try {
        $response = Invoke-WebRequest @params
        return Convert-Response ([int]$response.StatusCode) ([string]$response.Content)
    } catch {
        $status = 0
        $content = $_.ErrorDetails.Message
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        return Convert-Response $status $content
    }
}

function Add-Result {
    param([string]$Id, [string]$Scene, [string]$Result, [string]$Detail, [int]$HttpStatus = 0, $Code = $null)
    $script:Results.Add([pscustomobject]@{
        id = $Id
        scene = $Scene
        result = $Result
        httpStatus = $HttpStatus
        code = $Code
        detail = $Detail
    })
    Write-Host "[$Result] $Id $Scene - $Detail"
}

function Assert-Http {
    param([string]$Id, [string]$Scene, [object]$Response, [int]$Expected)
    if ($Response.status -eq $Expected) {
        Add-Result $Id $Scene "PASS" "HTTP $Expected" $Response.status $Response.code
    } else {
        Add-Result $Id $Scene "FAIL" "Expected HTTP $Expected; actual HTTP $($Response.status), code=$($Response.code), msg=$($Response.msg)" $Response.status $Response.code
    }
}

function Assert-Code {
    param([string]$Id, [string]$Scene, [object]$Response, [int]$Expected)
    if ($Response.code -eq $Expected) {
        Add-Result $Id $Scene "PASS" "code=$Expected" $Response.status $Response.code
    } else {
        Add-Result $Id $Scene "FAIL" "Expected code=$Expected; actual HTTP $($Response.status), code=$($Response.code), msg=$($Response.msg)" $Response.status $Response.code
    }
}

function Skip-Test {
    param([string]$Id, [string]$Scene, [string]$Reason)
    Add-Result $Id $Scene "SKIP" $Reason
}

Write-Host "PRD02 relation L1: API=$ApiUrl"
Assert-Http "L1-P0-12" "relation summary without token" (Invoke-Api "GET" "/admin/users/app/1/relations/summary") 401

if ([string]::IsNullOrWhiteSpace($AdminToken) -and
    -not [string]::IsNullOrWhiteSpace($AdminAccount) -and
    -not [string]::IsNullOrWhiteSpace($AdminPassword)) {
    $login = Invoke-Api "POST" "/admin/login" $null @{ account = $AdminAccount; password = $AdminPassword }
    if ($login.code -eq 200 -and $login.data -and $login.data.token) {
        $AdminToken = [string]$login.data.token
        Add-Result "L1-LOGIN" "admin login" "PASS" "Temporary token obtained and not persisted" $login.status $login.code
    } else {
        Add-Result "L1-LOGIN" "admin login" "FAIL" "Login failed: HTTP $($login.status), code=$($login.code), msg=$($login.msg)" $login.status $login.code
    }
}

if ([string]::IsNullOrWhiteSpace($AdminToken)) {
    Skip-Test "L1-P0-01~07" "admin relation APIs" "Missing RELATION_ADMIN_TOKEN or ADMIN_ACCOUNT/ADMIN_PASSWORD"
} else {
    $stats = Invoke-Api "GET" "/admin/users/app/stats" $AdminToken
    Assert-Code "L1-P1-17" "independent user stats" $stats 200

    $list = Invoke-Api "GET" "/admin/users/app/list?pageNum=1&pageSize=9" $AdminToken
    Assert-Code "L1-P0-01" "app user list size 9" $list 200
    if ($UserId -le 0 -and $list.data -and @($list.data.records).Count -gt 0) {
        $UserId = [long]$list.data.records[0].id
    }

    if ($UserId -le 0) {
        Skip-Test "L1-P0-03~07" "summary and four detail tabs" "No user found; specify a test user with -UserId"
    } else {
        Assert-Code "L1-P0-03" "relation summary" (Invoke-Api "GET" "/admin/users/app/$UserId/relations/summary" $AdminToken) 200
        foreach ($item in @(
            @{ id = "L1-P0-04"; name = "like details"; path = "likes" },
            @{ id = "L1-P0-05"; name = "visit details"; path = "visits" },
            @{ id = "L1-P0-06"; name = "match details"; path = "matches" },
            @{ id = "L1-P0-07"; name = "unlock details"; path = "unlocks" }
        )) {
            Assert-Code $item.id $item.name (Invoke-Api "GET" "/admin/users/app/$UserId/relations/$($item.path)?page=1&size=10" $AdminToken) 200
        }
        Assert-Code "L1-P1-08" "detail size 50" (Invoke-Api "GET" "/admin/users/app/$UserId/relations/likes?page=1&size=50" $AdminToken) 200
        Assert-Code "L1-P1-09" "reject invalid size 9" (Invoke-Api "GET" "/admin/users/app/$UserId/relations/likes?page=1&size=9" $AdminToken) 20008
        $legacy = Invoke-Api "GET" "/admin/users/app/$UserId/relations/visits?page=1&size=10&hideVisitRecord=true" $AdminToken
        if ($legacy.code -eq 200 -and $legacy.body -notmatch "hideVisitRecord") {
            Add-Result "L1-P1-11" "legacy hidden-visit parameter" "PASS" "Response contains no hidden-visit field" $legacy.status $legacy.code
        } else {
            Add-Result "L1-P1-11" "legacy hidden-visit parameter" "FAIL" "code=$($legacy.code); response may contain legacy field" $legacy.status $legacy.code
        }
    }
    Assert-Code "L1-P1-10" "nonexistent user" (Invoke-Api "GET" "/admin/users/app/9223372036854775807/relations/summary" $AdminToken) 20009
}

if ([string]::IsNullOrWhiteSpace($NoRelationToken)) {
    Skip-Test "L1-P0-13" "access without relation permission" "Missing RELATION_NO_PERMISSION_TOKEN"
} else {
    Assert-Http "L1-P0-13" "summary without relation permission" (Invoke-Api "GET" "/admin/users/app/1/relations/summary" $NoRelationToken) 403
}

if ([string]::IsNullOrWhiteSpace($NoCommercialToken)) {
    Skip-Test "L1-P0-14~15" "commercial field redaction" "Missing RELATION_NO_COMMERCIAL_TOKEN"
} elseif ($UserId -le 0) {
    Skip-Test "L1-P0-14~15" "commercial field redaction" "Missing usable UserId"
} else {
    Assert-Http "L1-P0-14" "VIP filter without commercial permission" (Invoke-Api "GET" "/admin/users/app/list?pageNum=1&pageSize=9&vipStatus=active" $NoCommercialToken) 403
    $summary = Invoke-Api "GET" "/admin/users/app/$UserId/relations/summary" $NoCommercialToken
    if ($summary.code -eq 200 -and $summary.data.vipVisible -eq $false -and $null -eq $summary.data.vipStatus) {
        Add-Result "L1-P0-15" "summary commercial redaction" "PASS" "vipVisible=false and vipStatus=null" $summary.status $summary.code
    } else {
        Add-Result "L1-P0-15" "summary commercial redaction" "FAIL" "Commercial fields were not redacted" $summary.status $summary.code
    }
}

$directory = Split-Path -Parent $OutputJson
if (-not [string]::IsNullOrWhiteSpace($directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
$summaryResult = [pscustomobject]@{
    generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    apiUrl = $ApiUrl
    pass = @($script:Results | Where-Object result -eq "PASS").Count
    fail = @($script:Results | Where-Object result -eq "FAIL").Count
    skip = @($script:Results | Where-Object result -eq "SKIP").Count
    results = $script:Results
}
$summaryResult | ConvertTo-Json -Depth 10 | Set-Content -Path $OutputJson -Encoding UTF8
Write-Host "Results written to ${OutputJson}: PASS=$($summaryResult.pass) FAIL=$($summaryResult.fail) SKIP=$($summaryResult.skip)"
if ($summaryResult.fail -gt 0) { exit 1 }
