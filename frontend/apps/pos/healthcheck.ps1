# Health Check Script for POS Modern Frontend
# PowerShell version for Windows Server environments
# Author: POS Modern Team
# Version: 1.0.0

param(
    [string]$AppPath = "C:\inetpub\wwwroot\pos-modern",
    [string]$HealthUrl = "http://localhost/health",
    [string]$LogPath = "",
    [switch]$Verbose = $false,
    [switch]$Json = $false
)

# Set default log path if not provided
if ([string]::IsNullOrEmpty($LogPath)) {
    $LogPath = Join-Path $AppPath "logs\healthcheck.log"
}

# Ensure logs directory exists
$LogDir = Split-Path $LogPath -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Initialize variables
$ErrorCount = 0
$Warnings = @()
$Errors = @()
$StartTime = Get-Date

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $LogPath -Value $LogEntry
    
    # Write to console if verbose
    if ($Verbose) {
        switch ($Level) {
            "ERROR" { Write-Host $LogEntry -ForegroundColor Red }
            "WARNING" { Write-Host $LogEntry -ForegroundColor Yellow }
            "SUCCESS" { Write-Host $LogEntry -ForegroundColor Green }
            default { Write-Host $LogEntry }
        }
    }
}

# Health check functions
function Test-WebServer {
    Write-Log "Checking web server status..."
    
    # Check IIS
    $iisService = Get-Service -Name W3SVC -ErrorAction SilentlyContinue
    if ($iisService -and $iisService.Status -eq "Running") {
        Write-Log "IIS service is running" "SUCCESS"
        return $true
    }
    
    # Check IIS Express
    $iisExpressProcess = Get-Process -Name "iisexpress" -ErrorAction SilentlyContinue
    if ($iisExpressProcess) {
        Write-Log "IIS Express is running" "SUCCESS"
        return $true
    }
    
    Write-Log "No web server found running" "ERROR"
    $script:Errors += "Web server not running"
    $script:ErrorCount++
    return $false
}

function Test-HealthEndpoint {
    Write-Log "Checking application health endpoint..."
    
    try {
        $response = Invoke-WebRequest -Uri $HealthUrl -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Log "Health endpoint responding correctly" "SUCCESS"
            return $true
        } else {
            Write-Log "Health endpoint returned status code: $($response.StatusCode)" "ERROR"
            $script:Errors += "Health endpoint error: $($response.StatusCode)"
            $script:ErrorCount++
            return $false
        }
    } catch {
        Write-Log "Health endpoint check failed: $($_.Exception.Message)" "ERROR"
        $script:Errors += "Health endpoint unreachable"
        $script:ErrorCount++
        return $false
    }
}

function Test-ApplicationFiles {
    Write-Log "Checking application files..."
    
    $indexFile = Join-Path $AppPath "index.html"
    if (!(Test-Path $indexFile)) {
        Write-Log "Main application file missing: $indexFile" "ERROR"
        $script:Errors += "Missing index.html"
        $script:ErrorCount++
        return $false
    }
    
    $assetsDir = Join-Path $AppPath "assets"
    if (!(Test-Path $assetsDir)) {
        Write-Log "Assets directory missing: $assetsDir" "WARNING"
        $script:Warnings += "Missing assets directory"
    }
    
    Write-Log "Application files check completed" "SUCCESS"
    return $true
}

function Test-SystemResources {
    Write-Log "Checking system resources..."
    
    # Check disk space
    $drive = (Get-Item $AppPath).PSDrive
    $freeSpace = [math]::Round($drive.Free / 1GB, 2)
    
    if ($freeSpace -lt 1) {
        Write-Log "Low disk space: ${freeSpace}GB available" "WARNING"
        $script:Warnings += "Low disk space: ${freeSpace}GB"
    } else {
        Write-Log "Disk space OK: ${freeSpace}GB available" "SUCCESS"
    }
    
    # Check memory usage
    $memory = Get-CimInstance -ClassName Win32_OperatingSystem
    $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $memoryUsage = [math]::Round((($totalMemory - $freeMemory) / $totalMemory) * 100, 2)
    
    if ($memoryUsage -gt 90) {
        Write-Log "High memory usage: ${memoryUsage}%" "WARNING"
        $script:Warnings += "High memory usage: ${memoryUsage}%"
    } else {
        Write-Log "Memory usage OK: ${memoryUsage}%" "SUCCESS"
    }
}

function Test-NetworkConnectivity {
    Write-Log "Checking network connectivity..."
    
    try {
        $ping = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet
        if ($ping) {
            Write-Log "Internet connectivity OK" "SUCCESS"
        } else {
            Write-Log "No internet connectivity" "WARNING"
            $script:Warnings += "No internet connectivity"
        }
    } catch {
        Write-Log "Network connectivity check failed" "WARNING"
        $script:Warnings += "Network check failed"
    }
}

function Test-SSLCertificate {
    Write-Log "Checking SSL certificate..."
    
    try {
        $certs = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { 
            $_.Subject -like "*pos-modern*" -or $_.Subject -like "*localhost*" 
        }
        
        if ($certs) {
            $cert = $certs | Select-Object -First 1
            $daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
            
            if ($daysUntilExpiry -lt 30) {
                Write-Log "SSL certificate expires in $daysUntilExpiry days" "WARNING"
                $script:Warnings += "SSL certificate expiring soon"
            } else {
                Write-Log "SSL certificate valid for $daysUntilExpiry days" "SUCCESS"
            }
        } else {
            Write-Log "No SSL certificate found" "WARNING"
            $script:Warnings += "No SSL certificate"
        }
    } catch {
        Write-Log "SSL certificate check failed: $($_.Exception.Message)" "WARNING"
        $script:Warnings += "SSL check failed"
    }
}

function Test-LogFiles {
    Write-Log "Checking log files..."
    
    $logFiles = Get-ChildItem -Path (Split-Path $LogPath -Parent) -Filter "*.log" -ErrorAction SilentlyContinue
    
    foreach ($logFile in $logFiles) {
        $sizeMB = [math]::Round($logFile.Length / 1MB, 2)
        if ($sizeMB -gt 100) {
            Write-Log "Large log file detected: $($logFile.Name) (${sizeMB}MB)" "WARNING"
            $script:Warnings += "Large log file: $($logFile.Name)"
        }
    }
    
    Write-Log "Log files check completed" "SUCCESS"
}

# Main execution
Write-Log "Starting POS Modern health check..."

# Run all health checks
Test-WebServer
Test-HealthEndpoint
Test-ApplicationFiles
Test-SystemResources
Test-NetworkConnectivity
Test-SSLCertificate
Test-LogFiles

# Calculate execution time
$ExecutionTime = (Get-Date) - $StartTime

# Prepare results
$HealthStatus = if ($ErrorCount -eq 0) { "HEALTHY" } else { "UNHEALTHY" }
$Result = @{
    Status = $HealthStatus
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ExecutionTime = $ExecutionTime.TotalSeconds
    ErrorCount = $ErrorCount
    WarningCount = $Warnings.Count
    Errors = $Errors
    Warnings = $Warnings
    AppPath = $AppPath
    HealthUrl = $HealthUrl
}

Write-Log "Health check completed - Status: $HealthStatus, Errors: $ErrorCount, Warnings: $($Warnings.Count)"

# Output results
if ($Json) {
    $Result | ConvertTo-Json -Depth 3
} else {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "   POS Modern Frontend - $HealthStatus" -ForegroundColor $(if ($HealthStatus -eq "HEALTHY") { "Green" } else { "Red" })
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "   Errors: $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })
    Write-Host "   Warnings: $($Warnings.Count)" -ForegroundColor $(if ($Warnings.Count -eq 0) { "Green" } else { "Yellow" })
    Write-Host "   Execution Time: $([math]::Round($ExecutionTime.TotalSeconds, 2))s" -ForegroundColor Cyan
    Write-Host "   Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    
    if ($Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Red
        $Errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
    
    if ($Warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "Warnings:" -ForegroundColor Yellow
        $Warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
    
    Write-Host ""
}

# Exit with appropriate code
exit $ErrorCount

