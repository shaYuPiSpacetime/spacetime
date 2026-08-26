param(
    [Parameter(Mandatory = $true)][string]$ApiUrl,
    [Parameter(Mandatory = $true)][string]$MiniToken,
    [string]$AdminToken,
    [Parameter(Mandatory = $true)][long]$TestUserId,
    [Parameter(Mandatory = $true)][string]$SafeImagePath,
    [Parameter(Mandatory = $true)][string]$RiskImagePath,
    [Parameter(Mandatory = $true)][string]$AudioPath,
    [string]$OutputJson = "docs/test-artifacts/prd01-wechat-content-security-real.json"
)

$ErrorActionPreference = "Stop"
$ApiUrl = $ApiUrl.TrimEnd("/")

function Invoke-BusinessApi {
    param([string]$Method, [string]$Path, [object]$Body, [string]$Token)
    $headers = @{ "X-Auth-Token" = $Token }
    $args = @{
        Method = $Method
        Uri = "$ApiUrl$Path"
        Headers = $headers
        ContentType = "application/json; charset=utf-8"
    }
    if ($null -ne $Body) {
        $args.Body = $Body | ConvertTo-Json -Depth 20
    }
    Invoke-RestMethod @args
}

function Upload-WithTicket {
    param([string]$TicketType, [string]$FilePath)
    $file = Get-Item -LiteralPath $FilePath
    $ticket = Invoke-BusinessApi "POST" "/miniapp/file/upload-ticket/$TicketType" @{
        fileName = $file.Name
        fileSizeBytes = $file.Length
    } $MiniToken
    if ($ticket.code -ne 200) { throw "upload ticket failed: $($ticket.msg)" }

    $form = @{}
    $ticket.data.formData.PSObject.Properties | ForEach-Object { $form[$_.Name] = [string]$_.Value }
    $form.file = $file
    $upload = Invoke-WebRequest -Method Post -Uri $ticket.data.uploadUrl -Form $form
    if ($upload.StatusCode -notin 200, 201, 204) { throw "OSS upload failed: $($upload.StatusCode)" }
    [pscustomobject]@{ File = $file; Ticket = $ticket.data; UploadStatus = $upload.StatusCode }
}

function Submit-Album {
    param([string]$Kind, [string]$FilePath, [int]$SortOrder)
    $uploaded = Upload-WithTicket "album" $FilePath
    $response = Invoke-BusinessApi "POST" "/miniapp/profile/albums" @{
        mediaUrl = $uploaded.Ticket.fileUrl
        thumbUrl = $uploaded.Ticket.fileUrl
        fileSizeBytes = $uploaded.File.Length
        sortOrder = $SortOrder
    } $MiniToken
    [pscustomobject]@{ Kind = $Kind; UploadStatus = $uploaded.UploadStatus; Response = $response }
}

$results = [ordered]@{}
$results.safeText = Invoke-BusinessApi "POST" "/miniapp/profile/introduction" @{
    aboutMe = "我喜欢校园散步、阅读和羽毛球，希望认识真诚友善的新朋友，一起分享生活中的快乐。"
} $MiniToken
$results.legacyRiskText1 = Invoke-BusinessApi "POST" "/miniapp/profile/introduction" @{
    aboutMe = "特3456书yuuo莞6543李zxcz蒜7782法fgnv级"
} $MiniToken
$results.legacyRiskText2 = Invoke-BusinessApi "POST" "/miniapp/profile/introduction" @{
    aboutMe = "完2347全dfji试3726测asad感3847知qwez到"
} $MiniToken
$results.safeImage = Submit-Album "safe" $SafeImagePath 90
$results.riskImage = Submit-Album "risk" $RiskImagePath 91

$audio = Upload-WithTicket "voice" $AudioPath
$results.audio = Invoke-BusinessApi "POST" "/miniapp/profile/voice-intro" @{
    voiceUrl = $audio.Ticket.fileUrl
    duration = 10
} $MiniToken

try {
    $results.videoProbe = Invoke-BusinessApi "POST" "/miniapp/file/upload-ticket/video" @{
        fileName = "audit-video.mp4"
        fileSizeBytes = 1024
    } $MiniToken
} catch {
    $results.videoProbe = [ordered]@{ transportError = $_.Exception.Message }
}

Start-Sleep -Seconds 10
if (-not [string]::IsNullOrWhiteSpace($AdminToken)) {
    $results.adminPhotos = Invoke-BusinessApi "GET" "/admin/moderation/photos/list?userId=$TestUserId&page=1&size=20" $null $AdminToken
    $results.adminTexts = Invoke-BusinessApi "GET" "/admin/moderation/texts/list?userId=$TestUserId&page=1&size=20" $null $AdminToken
    $results.adminAvatars = Invoke-BusinessApi "GET" "/admin/verify/avatar/list?userId=$TestUserId&page=1&size=20" $null $AdminToken
}

$outputPath = Join-Path (Get-Location) $OutputJson
New-Item -ItemType Directory -Force -Path (Split-Path $outputPath) | Out-Null
$results | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Host "Real WeChat content-security result written to $outputPath"
