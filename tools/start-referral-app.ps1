param(
    [string]$Module = "referral-app",
    [string]$LogPrefix = "codex-referral-app-8081"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "logs"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdout = Join-Path $logDir ($LogPrefix + "-" + $stamp + ".out.log")
$stderr = Join-Path $logDir ($LogPrefix + "-" + $stamp + ".err.log")

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$proc = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "rtk mvn -pl $Module spring-boot:run" `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

$proc.Id
