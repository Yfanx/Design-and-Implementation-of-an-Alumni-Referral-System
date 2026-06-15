$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $repoRoot "logs\system-processes.json"

if (-not (Test-Path $stateFile)) {
    Write-Host "No launcher process state was found. The services may already be stopped." -ForegroundColor Yellow
    exit 0
}

$services = Get-Content -Encoding UTF8 $stateFile | ConvertFrom-Json
foreach ($service in @($services)) {
    $process = Get-Process -Id $service.pid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $service.pid -Force
        Write-Host "Stopped $($service.name) (PID $($service.pid))." -ForegroundColor Green
    }
}

Remove-Item $stateFile -Force
Write-Host "Referral application services have been stopped. MySQL remains running." -ForegroundColor Green
