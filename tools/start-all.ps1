[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "logs"
$stateFile = Join-Path $logDir "system-processes.json"
$configFile = Join-Path $repoRoot "config\shared-local.yml"
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$mysqlContainer = "referral-mysql"

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-Step([string]$Message) {
    Write-Host "[referral] $Message" -ForegroundColor Cyan
}

function Test-TcpPort([int]$Port, [int]$TimeoutMs = 600) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            return $false
        }
        $client.EndConnect($result)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Wait-TcpPort([int]$Port, [int]$TimeoutSeconds, [string]$Name) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort $Port) {
            Write-Host "  $Name is ready on port $Port." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name did not become ready on port $Port within $TimeoutSeconds seconds."
}

function Get-PortProcessId([int]$Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) { return $null }
    return $connection.OwningProcess
}

function Get-YamlValue([string[]]$Lines, [string]$Key) {
    $match = $Lines | Where-Object { $_ -match ("^\s*" + [regex]::Escape($Key) + "\s*:\s*(.+?)\s*$") } | Select-Object -First 1
    if (-not $match) { return $null }
    $value = [regex]::Match($match, ":\s*(.+?)\s*$").Groups[1].Value.Trim()
    return $value.Trim('"').Trim("'")
}

function Resolve-Java17 {
    $candidates = @()
    if ($env:JAVA_HOME) { $candidates += $env:JAVA_HOME }
    $candidates += @(
        "D:\dev\Scoop\scoopApp\apps\openjdk17\current",
        "D:\Dev\Scoop\scoopApp\apps\openjdk17\current",
        "C:\Program Files\Eclipse Adoptium\jdk-17*",
        "C:\Program Files\Java\jdk-17*"
    )

    foreach ($candidate in $candidates) {
        $resolvedCandidates = Get-Item $candidate -ErrorAction SilentlyContinue
        foreach ($resolved in $resolvedCandidates) {
            $java = Join-Path $resolved.FullName "bin\java.exe"
            if (-not (Test-Path $java)) { continue }
            $releaseFile = Join-Path $resolved.FullName "release"
            $release = if (Test-Path $releaseFile) { Get-Content $releaseFile -Raw } else { "" }
            if ($release -match 'JAVA_VERSION="17[\.]') {
                return $resolved.FullName
            }
        }
    }
    throw "JDK 17 was not found. Install it with: scoop install openjdk17"
}

function Wait-Docker([int]$TimeoutSeconds = 120) {
    try {
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) { return }
    }
    catch {}

    if (-not (Test-Path $dockerDesktop)) {
        throw "Docker Desktop is not installed at: $dockerDesktop"
    }

    Write-Step "Starting Docker Desktop..."
    Start-Process -FilePath $dockerDesktop | Out-Null
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        try {
            & docker info *> $null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Docker Desktop is ready." -ForegroundColor Green
                return
            }
        }
        catch {}
    }
    throw "Docker Desktop did not become ready within $TimeoutSeconds seconds."
}

function Initialize-Database([string]$Container, [string]$Database, [string]$Password) {
    $schema = Join-Path $repoRoot "deployment\mysql\01-schema.sql"
    $seed = Join-Path $repoRoot "deployment\mysql\02-seed-data.sql"
    if (-not (Test-Path $schema) -or -not (Test-Path $seed)) {
        throw "Database initialization scripts are missing under deployment\mysql."
    }

    Write-Step "Initializing MySQL schema and demo data..."
    & docker cp $schema "${Container}:/tmp/01-schema.sql" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to copy the schema script into MySQL." }
    & docker cp $seed "${Container}:/tmp/02-seed-data.sql" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to copy the seed script into MySQL." }

    & docker exec $Container mysql --default-character-set=utf8mb4 --user=root "--password=$Password" --execute="source /tmp/01-schema.sql"
    if ($LASTEXITCODE -ne 0) { throw "Failed to initialize the database schema." }
    & docker exec $Container mysql --default-character-set=utf8mb4 --user=root "--password=$Password" $Database --execute="source /tmp/02-seed-data.sql"
    if ($LASTEXITCODE -ne 0) { throw "Failed to initialize the demo data." }
}

function Apply-DatabaseMigrations([string]$Container, [string]$Database, [string]$Password) {
    $migration = Join-Path $repoRoot "deployment\mysql\03-migrations.sql"
    if (-not (Test-Path $migration)) {
        return
    }

    Write-Step "Applying MySQL compatibility migrations..."
    & docker cp $migration "${Container}:/tmp/03-migrations.sql" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to copy the migration script into MySQL." }
    & docker exec $Container mysql --default-character-set=utf8mb4 --user=root "--password=$Password" $Database --execute="source /tmp/03-migrations.sql"
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply database migrations." }
}

function Ensure-MySql([string]$Database, [string]$Username, [string]$Password) {
    if (Test-TcpPort 3306) {
        Write-Host "  MySQL is already reachable on port 3306." -ForegroundColor Green
        return
    }

    Wait-Docker

    $container = (& docker ps -a --filter "name=^/${mysqlContainer}$" --format "{{.Names}}" | Select-Object -First 1).Trim()
    $created = $false
    if (-not $container) {
        Write-Step "Creating MySQL 8 container (first run only)..."
        $args = @(
            "run", "-d",
            "--name", $mysqlContainer,
            "--restart", "unless-stopped",
            "-e", "MYSQL_ROOT_PASSWORD=$Password",
            "-e", "MYSQL_DATABASE=$Database",
            "-p", "3306:3306",
            "-v", "referral-mysql-data:/var/lib/mysql",
            "mysql:8.0",
            "--character-set-server=utf8mb4",
            "--collation-server=utf8mb4_unicode_ci"
        )
        & docker @args | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Failed to create the MySQL Docker container." }
        $container = $mysqlContainer
        $created = $true
    }
    else {
        $running = (& docker inspect -f "{{.State.Running}}" $container 2>$null).Trim()
        if ($running -ne "true") {
            Write-Step "Starting existing MySQL container..."
            & docker start $container | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Failed to start MySQL container: $container" }
        }
    }

    Wait-TcpPort 3306 120 "MySQL"
    Start-Sleep -Seconds 5

    if ($created) {
        Initialize-Database $container $Database $Password
        Apply-DatabaseMigrations $container $Database $Password
        return
    }

    & docker exec $container mysql --user=root "--password=$Password" --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name='ref_auth_account';" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL is running, but the credentials in config\shared-local.yml cannot connect to container '$container'."
    }
    $tableCount = (& docker exec $container mysql --user=root "--password=$Password" --batch --skip-column-names --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name='ref_auth_account';" 2>$null | Select-Object -First 1).Trim()
    if ($tableCount -eq "0") {
        Initialize-Database $container $Database $Password
    }
    Apply-DatabaseMigrations $container $Database $Password
}

function Get-AppJar([string]$Module) {
    $jar = Get-ChildItem (Join-Path $repoRoot "$Module\target") -Filter "$Module-*.jar" -File |
        Where-Object { $_.Name -notlike "*.original" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $jar) { throw "Cannot find the packaged JAR for $Module." }
    return $jar.FullName
}

function Start-App([string]$Name, [string]$Jar, [int]$Port, [string]$JavaExe) {
    if (Test-TcpPort $Port) {
        Write-Host "  $Name is already running on port $Port; startup skipped." -ForegroundColor Yellow
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $stdout = Join-Path $logDir "$Name-$Port-$stamp.out.log"
    $stderr = Join-Path $logDir "$Name-$Port-$stamp.err.log"
    $command = "cd /d `"$repoRoot`" && start `"$Name`" /b `"$JavaExe`" -Dfile.encoding=UTF-8 -jar `"$Jar`" > `"$stdout`" 2> `"$stderr`""
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $command) -WindowStyle Hidden | Out-Null
    Start-Sleep -Milliseconds 800

    return [ordered]@{
        name = $Name
        pid = $null
        port = $Port
        stdout = $stdout
        stderr = $stderr
    }
}

try {
    Write-Step "Preparing Java 17..."
    $javaHome = Resolve-Java17
    $env:JAVA_HOME = $javaHome
    $env:Path = (Join-Path $javaHome "bin") + ";" + $env:Path
    $javaExe = Join-Path $javaHome "bin\java.exe"
    Write-Host "  JAVA_HOME=$javaHome" -ForegroundColor Green

    if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
        throw "Maven was not found. Install it with: scoop install maven"
    }
    if (-not (Test-Path $configFile)) {
        throw "Missing config\shared-local.yml. Copy config\shared-local.example.yml and set the local MySQL password."
    }

    $config = Get-Content -Encoding UTF8 $configFile
    $dbUrl = Get-YamlValue $config "url"
    $dbUsername = Get-YamlValue $config "username"
    $dbPassword = Get-YamlValue $config "password"
    if (-not $dbUrl -or -not $dbUsername -or -not $dbPassword -or $dbPassword -eq "your-mysql-password") {
        throw "Database settings in config\shared-local.yml are incomplete."
    }
    $dbMatch = [regex]::Match($dbUrl, "jdbc:mysql://[^/]+/([^?]+)")
    if (-not $dbMatch.Success) { throw "Cannot parse the database name from config\shared-local.yml." }
    $database = $dbMatch.Groups[1].Value

    Write-Step "Checking MySQL..."
    Ensure-MySql $database $dbUsername $dbPassword

    if (-not $SkipBuild) {
        Write-Step "Building referral-app and referral-admin..."
        & mvn -pl referral-app,referral-admin -am package -DskipTests
        if ($LASTEXITCODE -ne 0) { throw "Maven build failed." }
    }

    $processes = @()
    Write-Step "Starting application services..."
    $admin = Start-App "referral-admin" (Get-AppJar "referral-admin") 8080 $javaExe
    if ($admin) { $processes += $admin }
    $app = Start-App "referral-app" (Get-AppJar "referral-app") 8081 $javaExe
    if ($app) { $processes += $app }

    Wait-TcpPort 8080 90 "Referral admin"
    Wait-TcpPort 8081 90 "Referral app"

    foreach ($process in $processes) {
        if (-not $process.pid) {
            $process.pid = Get-PortProcessId $process.port
        }
    }
    if ($processes.Count -gt 0) {
        $processes | ConvertTo-Json | Set-Content -Encoding UTF8 $stateFile
    }

    Write-Host ""
    Write-Host "Referral system started successfully." -ForegroundColor Green
    Write-Host "  Student/alumni: http://127.0.0.1:8081/login.html"
    Write-Host "  Administrator:  http://127.0.0.1:8080/login.html"
    Write-Host "  Logs:           $logDir"

    if (-not $NoBrowser) {
        Start-Process "http://127.0.0.1:8081/login.html"
        Start-Process "http://127.0.0.1:8080/login.html"
    }
}
catch {
    Write-Host ""
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs are stored in: $logDir" -ForegroundColor Yellow
    exit 1
}
