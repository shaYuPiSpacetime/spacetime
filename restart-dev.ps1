param(
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 5173,
    [switch]$SkipFrontend,
    [switch]$SkipMiniapp,
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$MiniappDir = Join-Path $RootDir "miniapp"
$RuntimeDir = Join-Path $RootDir ".runtime"
$LogDir = Join-Path $RuntimeDir "logs"
$BackendLog = Join-Path $LogDir "backend.log"
$BackendErrLog = Join-Path $LogDir "backend.err.log"
$FrontendLog = Join-Path $LogDir "frontend.log"
$FrontendErrLog = Join-Path $LogDir "frontend.err.log"
$MiniappLog = Join-Path $LogDir "miniapp.log"
$MiniappErrLog = Join-Path $LogDir "miniapp.err.log"

function Load-DotEnv {
    param([string]$Path)
    if (-not (Test-Path -Path $Path)) {
        return
    }

    Write-Host "Loading env: $Path"
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

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

function Set-EnvDefault {
    param([string]$Target, [string]$Source, [string]$Default = "")
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Target, "Process"))) {
        $value = [Environment]::GetEnvironmentVariable($Source, "Process")
        if ([string]::IsNullOrWhiteSpace($value)) {
            $value = $Default
        }

        [Environment]::SetEnvironmentVariable($Target, $value, "Process")
    }
}

function Normalize-BackendEnv {
    # Keep DB_/REDIS_ and DEV_DB_/DEV_REDIS_ compatible.
    Set-EnvDefault "DEV_DB_HOST" "DB_HOST" "rm-bp11i1ru1405fb2iqio.mysql.rds.aliyuncs.com"
    Set-EnvDefault "DEV_DB_PORT" "DB_PORT" "3306"
    Set-EnvDefault "DEV_DB_NAME" "DB_NAME" "shikongxiehou"
    Set-EnvDefault "DEV_DB_USER" "DB_USER"
    Set-EnvDefault "DEV_DB_PASSWORD" "DB_PASSWORD"
    Set-EnvDefault "DEV_REDIS_HOST" "REDIS_HOST" "r-bp182i9r17g2ybq30gpd.redis.rds.aliyuncs.com"
    Set-EnvDefault "DEV_REDIS_PORT" "REDIS_PORT" "6379"
    Set-EnvDefault "DEV_REDIS_USERNAME" "REDIS_USERNAME"
    Set-EnvDefault "DEV_REDIS_DATABASE" "REDIS_DATABASE" "1"
    Set-EnvDefault "DEV_REDIS_PASSWORD" "REDIS_PASSWORD"
    Set-EnvDefault "DEV_OSS_ENDPOINT" "OSS_ENDPOINT"
    Set-EnvDefault "DEV_OSS_ACCESS_KEY_ID" "OSS_ACCESS_KEY_ID"
    Set-EnvDefault "DEV_OSS_ACCESS_KEY_SECRET" "OSS_ACCESS_KEY_SECRET"
    Set-EnvDefault "DEV_OSS_BUCKET_NAME" "OSS_BUCKET_NAME"
    Set-EnvDefault "ADMIN_ACCOUNT" "ADMIN_USERNAME" "peter"
    Set-EnvDefault "ADMIN_PASSWORD" "ADMIN_PASS" "000000"
}

function Assert-BackendEnv {
    $missing = New-Object System.Collections.Generic.List[string]
    foreach ($key in @("DEV_DB_USER", "DEV_DB_PASSWORD")) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
            $missing.Add($key)
        }
    }

    $redisHost = [Environment]::GetEnvironmentVariable("DEV_REDIS_HOST", "Process")
    $redisPassword = [Environment]::GetEnvironmentVariable("DEV_REDIS_PASSWORD", "Process")
    if (-not [string]::IsNullOrWhiteSpace($redisHost) -and $redisHost -notin @("localhost", "127.0.0.1") -and [string]::IsNullOrWhiteSpace($redisPassword)) {
        $missing.Add("DEV_REDIS_PASSWORD")
    }

    if (-not $SkipSmoke) {
        foreach ($key in @("ADMIN_ACCOUNT", "ADMIN_PASSWORD")) {
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
                $missing.Add($key)
            }
        }
    }

    if ($missing.Count -gt 0) {
        throw @"
Missing backend env: $($missing -join ', ').
Fix once:
  1. Copy backend/.env.local.example to backend/.env.local.
  2. Fill real DB/Redis values and admin smoke account in backend/.env.local. Do not commit that file.
  3. Restart with: powershell -ExecutionPolicy Bypass -File .\restart-dev.ps1 -SkipMiniapp
Do not start backend directly with mvn when these values are missing; /health may pass while business DB access fails.
"@
    }
}

function Write-BackendEnvSummary {
    foreach ($key in @(
        "DEV_DB_HOST",
        "DEV_DB_NAME",
        "DEV_DB_USER",
        "DEV_DB_PASSWORD",
        "DEV_REDIS_HOST",
        "DEV_REDIS_DATABASE",
        "DEV_REDIS_PASSWORD",
        "ADMIN_ACCOUNT",
        "ADMIN_PASSWORD"
    )) {
        $value = [Environment]::GetEnvironmentVariable($key, "Process")
        $state = if ([string]::IsNullOrWhiteSpace($value)) { "missing" } else { "set,length=$($value.Length)" }
        Write-Host "${key}: $state"
    }
}

function Find-JavaHome21 {
    $candidates = @(
        $env:JAVA_HOME,
        (Join-Path $env:USERPROFILE ".jdks\ms-21.0.11")
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    foreach ($candidate in $candidates) {
        $javaExe = Join-Path $candidate "bin\java.exe"
        if (Test-Path -Path $javaExe) {
            $previousErrorAction = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            $versionText = (& $javaExe -version 2>&1 | Out-String)
            $ErrorActionPreference = $previousErrorAction
            if ($versionText -match 'version "21\.') {
                return $candidate
            }
        }
    }

    throw "JAVA_HOME is not JDK21. Set JAVA_HOME to a JDK21 path."
}

function Normalize-ProcessPath {
    # Windows 上同一进程里偶发同时存在 Path/PATH，Start-Process 会因此抛重复键异常。
    $pathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
    if ([string]::IsNullOrWhiteSpace($pathValue)) {
        $pathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
    }

    [Environment]::SetEnvironmentVariable("Path", $null, "Process")
    [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
}

function Stop-Port {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        Write-Host "Stopping port $Port listener: PID $($conn.OwningProcess)"
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Wait-HttpOk {
    param([string]$Url, [string]$Name, [string]$LogPath)
    for ($i = 1; $i -le 90; $i++) {
        try {
            $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                Write-Host "$Name is ready: $Url"
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-Host "$Name failed to become ready. Recent log:"
    if (Test-Path -Path $LogPath) {
        Get-Content -Path $LogPath -Tail 80
    }
    throw "$Name startup timeout"
}

function Test-AdminLoginSmoke {
    param([string]$BaseUrl)

    $account = [Environment]::GetEnvironmentVariable("ADMIN_ACCOUNT", "Process")
    $password = [Environment]::GetEnvironmentVariable("ADMIN_PASSWORD", "Process")
    $body = @{
        account = $account
        password = $password
    } | ConvertTo-Json -Compress

    try {
        $resp = Invoke-RestMethod -Uri "$BaseUrl/admin/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 10
    } catch {
        Write-Host "Admin login smoke failed. Recent backend log:"
        if (Test-Path -Path $BackendLog) {
            Get-Content -Path $BackendLog -Tail 80
        }
        throw "Backend DB/Redis smoke failed: /admin/login request error."
    }

    if ($resp.code -ne 200) {
        $msg = $resp.msg
        if ([string]::IsNullOrWhiteSpace($msg)) {
            $msg = "unknown response"
        }
        throw "Backend DB/Redis smoke failed: /admin/login returned code=$($resp.code), msg=$msg"
    }

    Write-Host "Backend DB/Redis smoke passed: /admin/login"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Load-DotEnv (Join-Path $RootDir ".env")
Load-DotEnv (Join-Path $BackendDir ".env.local")
Normalize-BackendEnv
Write-BackendEnvSummary
Assert-BackendEnv

$javaHome = Find-JavaHome21
[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "Process")
$env:Path = (Join-Path $javaHome "bin") + ";$env:Path"
Normalize-ProcessPath

Write-Host "Cleaning previous dev processes..."
Stop-Port $BackendPort
if (-not $SkipFrontend) {
    Stop-Port $FrontendPort
}

Write-Host "Starting backend with JAVA_HOME=$javaHome"
# Skip enforcer only for dev startup; mvn test still keeps the normal checks.
$backendArgs = "mvn.cmd -DskipTests -Denforcer.skip=true spring-boot:run -Dspring-boot.run.profiles=dev -Dspring-boot.run.jvmArguments=-Dserver.port=$BackendPort"
$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $backendArgs -WorkingDirectory $BackendDir -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrLog -PassThru -WindowStyle Hidden
Set-Content -Path (Join-Path $RuntimeDir "backend.pid") -Value $backend.Id -Encoding ASCII
Wait-HttpOk "http://127.0.0.1:$BackendPort/health" "Backend" $BackendErrLog

if ($SkipSmoke) {
    Write-Warning "DB/Redis smoke skipped by -SkipSmoke."
} else {
    Test-AdminLoginSmoke "http://127.0.0.1:$BackendPort"
}

if (-not $SkipFrontend) {
    Write-Host "Starting frontend"
    $frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm.cmd run dev -- --host 0.0.0.0" -WorkingDirectory $FrontendDir -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErrLog -PassThru -WindowStyle Hidden
    Set-Content -Path (Join-Path $RuntimeDir "frontend.pid") -Value $frontend.Id -Encoding ASCII
    Wait-HttpOk "http://127.0.0.1:$FrontendPort/" "Frontend" $FrontendErrLog
}

if (-not $SkipMiniapp -and (Test-Path -Path $MiniappDir)) {
    Write-Host "Starting miniapp compiler"
    $miniapp = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm.cmd run dev:weapp" -WorkingDirectory $MiniappDir -RedirectStandardOutput $MiniappLog -RedirectStandardError $MiniappErrLog -PassThru -WindowStyle Hidden
    Set-Content -Path (Join-Path $RuntimeDir "miniapp.pid") -Value $miniapp.Id -Encoding ASCII
}

Write-Host ""
Write-Host "Dev services are ready:"
Write-Host "Backend : http://127.0.0.1:$BackendPort"
if (-not $SkipFrontend) {
    Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
}
Write-Host "Logs    : $LogDir"
