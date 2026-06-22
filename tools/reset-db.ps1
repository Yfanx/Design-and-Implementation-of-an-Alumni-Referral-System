[CmdletBinding()]
param(
    [string]$Container = "referral-mysql",
    [string]$ConfigFile
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $ConfigFile) {
    $ConfigFile = Join-Path $repoRoot "config\shared-local.yml"
}

$resetSql = Join-Path $repoRoot "deployment\mysql\00-reset-and-import.sql"
if (-not (Test-Path $resetSql)) {
    throw "Reset SQL not found: $resetSql"
}

if (-not (Test-Path $ConfigFile)) {
    throw "Config file not found: $ConfigFile"
}

function Get-YamlValue([string[]]$Lines, [string]$Key) {
    $match = $Lines | Where-Object { $_ -match ("^\s*" + [regex]::Escape($Key) + "\s*:\s*(.+?)\s*$") } | Select-Object -First 1
    if (-not $match) { return $null }
    $value = [regex]::Match($match, ":\s*(.+?)\s*$").Groups[1].Value.Trim()
    return $value.Trim('"').Trim("'")
}

$configLines = Get-Content -Encoding UTF8 $ConfigFile
$password = Get-YamlValue $configLines "password"
if (-not $password) {
    throw "MySQL password was not found in: $ConfigFile"
}

$containerName = (& docker ps -a --filter "name=^/$Container$" --format "{{.Names}}" | Select-Object -First 1).Trim()
if (-not $containerName) {
    throw "Docker container '$Container' was not found."
}

$running = (& docker ps --filter "name=^/$Container$" --format "{{.Names}}" | Select-Object -First 1).Trim()
if (-not $running) {
    throw "Docker container '$Container' is not running."
}

Write-Host "[referral] Resetting database with UTF-8 safe import..." -ForegroundColor Cyan
& docker cp $resetSql "${Container}:/tmp/00-reset-and-import.sql" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy reset SQL into MySQL container."
}

& docker exec $Container mysql --default-character-set=utf8mb4 --user=root "--password=$password" --execute="source /tmp/00-reset-and-import.sql"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to reset database."
}

Write-Host "[referral] Database reset completed." -ForegroundColor Green
