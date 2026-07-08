param(
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 5173,
    [switch]$SkipMiniapp
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
    # 兼容 DB_/REDIS_ 通用变量和 DEV_DB_/DEV_REDIS_ 开发变量。
    Set-EnvDefault "DEV_DB_HOST" "DB_HOST"
    Set-EnvDefault "DEV_DB_HOST" "DB_HOST"
    Set-EnvDefault "DEV_DB_PORT" "DB_PORT" "3306"
    Set-EnvDefault "DEV_DB_NAME" "DB_NAME" "shikongxiehou"
    Set-EnvDefault "DEV_DB_USER" "DB_USER"
    Set-EnvDefault "DEV_DB_PASSWORD" "DB_PASSWORD"
    Set-EnvDefault "DEV_REDIS_HOST" "REDIS_HOST"
    Set-EnvDefault "DEV_REDIS_PORT" "REDIS_PORT" "6379"
    Set-EnvDefault "DEV_REDIS_USERNAME" "REDIS_USERNAME"
    Set-EnvDefault "DEV_REDIS_DATABASE" "REDIS_DATABASE" "1"
    Set-EnvDefault "DEV_REDIS_PASSWORD" "REDIS_PASSWORD"
    Set-EnvDefault "DEV_OSS_ENDPOINT" "OSS_ENDPOINT"
    Set-EnvDefault "DEV_OSS_ACCESS_KEY_ID" "OSS_ACCESS_KEY_ID"
    Set-EnvDefault "DEV_OSS_ACCESS_KEY_SECRET" "OSS_ACCESS_KEY_SECRET"
    Set-EnvDefault "DEV_OSS_BUCKET_NAME" "OSS_BUCKET_NAME"
}

function Assert-BackendEnv {
    $missing = New-Object System.Collections.Generic.List[string]
    foreach ($key in @("DEV_DB_USER", "DEV_DB_PASSWORD")) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
            $missing.Add($key)
        }
    }
    $redisHost = [Environment]::GetEnvironmentVariable("DEV_REDIS_HOST", "Process")
    if ([string]::IsNullOrWhiteSpace($redisHost)) {
        $redisHost = "r-bp182i9r17g2ybq30gpd.redis.rds.aliyuncs.com"
    }
    $redisPassword = [Environment]::GetEnvironmentVariable("DEV_REDIS_PASSWORD", "Process")
    if ($redisHost -notin @("localhost", "127.0.0.1") -and [string]::IsNullOrWhiteSpace($redisPassword)) {
        $missing.Add("DEV_REDIS_PASSWORD")
    }
    if ($missing.Count -gt 0) {
        throw "Missing backend env: $($missing -join ', '). Create .env or backend/.env.local from .env.example, then restart."
    }
}

function Write-BackendEnvSummary {
    $items = @(
        "DEV_DB_HOST",
        "DEV_DB_NAME",
        "DEV_DB_USER",
        "DEV_DB_PASSWORD",
        "DEV_REDIS_HOST",
        "DEV_REDIS_DATABASE",
        "DEV_REDIS_PASSWORD"
    )
    foreach ($key in $items) {
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
    Write-Host "$Name failed to become ready. Recent backend log:"
    if (Test-Path -Path $LogPath) {
        Get-Content -Path $LogPath -Tail 80
    }
    throw "$Name startup timeout"
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

Write-Host "Cleaning previous dev processes..."
Stop-Port $BackendPort
Stop-Port $FrontendPort

Write-Host "Starting backend with JAVA_HOME=$javaHome"
# 开发启动只跳过 enforcer，编译与测试仍通过 mvn test 保留 JDK 校验。
$backend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "mvn.cmd -Denforcer.skip=true spring-boot:run" -WorkingDirectory $BackendDir -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrLog -PassThru -WindowStyle Hidden
Set-Content -Path (Join-Path $RuntimeDir "backend.pid") -Value $backend.Id -Encoding ASCII
Wait-HttpOk "http://127.0.0.1:$BackendPort/health" "Backend" $BackendErrLog

Write-Host "Starting frontend"
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm.cmd run dev -- --host 0.0.0.0" -WorkingDirectory $FrontendDir -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErrLog -PassThru -WindowStyle Hidden
Set-Content -Path (Join-Path $RuntimeDir "frontend.pid") -Value $frontend.Id -Encoding ASCII
Wait-HttpOk "http://127.0.0.1:$FrontendPort/" "Frontend" $FrontendErrLog

if (-not $SkipMiniapp -and (Test-Path -Path $MiniappDir)) {
    Write-Host "Starting miniapp compiler"
    $miniapp = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm.cmd run dev:weapp" -WorkingDirectory $MiniappDir -RedirectStandardOutput $MiniappLog -RedirectStandardError $MiniappErrLog -PassThru -WindowStyle Hidden
    Set-Content -Path (Join-Path $RuntimeDir "miniapp.pid") -Value $miniapp.Id -Encoding ASCII
}

Write-Host ""
Write-Host "Dev services are ready:"
Write-Host "Backend : http://127.0.0.1:$BackendPort"
Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
Write-Host "Logs    : $LogDir"
