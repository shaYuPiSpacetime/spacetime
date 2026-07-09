param(
    [switch]$NoEnvFile
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$EnvFile = Join-Path $BackendDir ".env.local"

function Load-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -Path $Path)) {
        throw "Missing env file: $Path"
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

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

if (-not $NoEnvFile) {
    Load-EnvFile $EnvFile
}

$java21 = Join-Path $env:USERPROFILE ".jdks\ms-21.0.11"
if ((Test-Path -Path (Join-Path $java21 "bin\java.exe")) -and [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
    $env:JAVA_HOME = $java21
}

if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
    $env:Path = (Join-Path $env:JAVA_HOME "bin") + ";$env:Path"
}

Set-Location $BackendDir
& mvn.cmd "spring-boot:run" "-Dspring-boot.run.profiles=dev" "-Denforcer.skip=true"
