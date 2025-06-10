@echo off
REM Health check script for POS Modern Frontend on Windows
REM Author: POS Modern Team
REM Version: 1.0.0

setlocal enabledelayedexpansion

echo [%date% %time%] Starting POS Modern health check...

REM Set variables
set "APP_NAME=POS Modern Frontend"
set "HEALTH_URL=http://localhost/health"
set "APP_PATH=C:\inetpub\wwwroot\pos-modern"
set "INDEX_FILE=%APP_PATH%\index.html"
set "LOG_FILE=%APP_PATH%\logs\healthcheck.log"
set "ERROR_COUNT=0"

REM Create logs directory if it doesn't exist
if not exist "%APP_PATH%\logs" mkdir "%APP_PATH%\logs"

REM Function to log messages
:log_message
echo [%date% %time%] %~1 >> "%LOG_FILE%"
echo [%date% %time%] %~1
goto :eof

REM Check if IIS is running (Windows equivalent to nginx)
call :log_message "Checking IIS service status..."
sc query W3SVC | find "RUNNING" >nul
if !errorlevel! neq 0 (
    call :log_message "ERROR: IIS service is not running"
    set /a ERROR_COUNT+=1
    goto check_iis_express
) else (
    call :log_message "OK: IIS service is running"
    goto check_health_endpoint
)

:check_iis_express
REM Check if IIS Express is running (alternative)
call :log_message "Checking IIS Express processes..."
tasklist /FI "IMAGENAME eq iisexpress.exe" 2>NUL | find /I /N "iisexpress.exe" >nul
if !errorlevel! neq 0 (
    call :log_message "ERROR: Neither IIS nor IIS Express is running"
    set /a ERROR_COUNT+=1
) else (
    call :log_message "OK: IIS Express is running"
)

:check_health_endpoint
REM Check if the application health endpoint is responding
call :log_message "Checking application health endpoint..."
powershell -Command "try { $response = Invoke-WebRequest -Uri '%HEALTH_URL%' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if !errorlevel! neq 0 (
    call :log_message "ERROR: Application health check failed - %HEALTH_URL% not responding"
    set /a ERROR_COUNT+=1
) else (
    call :log_message "OK: Application health endpoint responding"
)

:check_main_files
REM Check if main application files exist
call :log_message "Checking main application files..."
if not exist "%INDEX_FILE%" (
    call :log_message "ERROR: Main application file missing - %INDEX_FILE%"
    set /a ERROR_COUNT+=1
) else (
    call :log_message "OK: Main application file exists"
)

REM Check if assets directory exists
if not exist "%APP_PATH%\assets" (
    call :log_message "WARNING: Assets directory missing - %APP_PATH%\assets"
) else (
    call :log_message "OK: Assets directory exists"
)

:check_disk_space
REM Check available disk space (warn if less than 1GB)
call :log_message "Checking disk space..."
for /f "tokens=3" %%a in ('dir /-c %APP_PATH% ^| find "bytes free"') do set FREE_BYTES=%%a
set /a FREE_GB=!FREE_BYTES!/1073741824
if !FREE_GB! lss 1 (
    call :log_message "WARNING: Low disk space - !FREE_GB!GB available"
) else (
    call :log_message "OK: Sufficient disk space - !FREE_GB!GB available"
)

:check_memory
REM Check available memory
call :log_message "Checking system memory..."
for /f "skip=1 tokens=4" %%a in ('wmic OS get TotalVisibleMemorySize /value') do (
    if not "%%a"=="" set TOTAL_MEM=%%a
)
for /f "skip=1 tokens=4" %%a in ('wmic OS get FreePhysicalMemory /value') do (
    if not "%%a"=="" set FREE_MEM=%%a
)
set /a MEM_USAGE_PERCENT=(!TOTAL_MEM!-!FREE_MEM!)*100/!TOTAL_MEM!
if !MEM_USAGE_PERCENT! gtr 90 (
    call :log_message "WARNING: High memory usage - !MEM_USAGE_PERCENT!%%"
) else (
    call :log_message "OK: Memory usage normal - !MEM_USAGE_PERCENT!%%"
)

:check_network_connectivity
REM Check network connectivity to external services
call :log_message "Checking network connectivity..."
ping -n 1 8.8.8.8 >nul 2>&1
if !errorlevel! neq 0 (
    call :log_message "WARNING: No internet connectivity"
) else (
    call :log_message "OK: Internet connectivity available"
)

:check_ssl_certificate
REM Check SSL certificate validity (if HTTPS is configured)
call :log_message "Checking SSL certificate..."
powershell -Command "try { $cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -like '*pos-modern*' -or $_.Subject -like '*localhost*' } | Select-Object -First 1; if ($cert -and $cert.NotAfter -gt (Get-Date).AddDays(30)) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if !errorlevel! neq 0 (
    call :log_message "WARNING: SSL certificate not found or expiring soon"
) else (
    call :log_message "OK: SSL certificate valid"
)

:check_log_files
REM Check if log files are growing too large
call :log_message "Checking log file sizes..."
if exist "%APP_PATH%\logs\*.log" (
    for %%f in ("%APP_PATH%\logs\*.log") do (
        set "file_size=%%~zf"
        set /a file_size_mb=!file_size!/1048576
        if !file_size_mb! gtr 100 (
            call :log_message "WARNING: Large log file detected - %%f (!file_size_mb!MB)"
        )
    )
    call :log_message "OK: Log file sizes checked"
) else (
    call :log_message "INFO: No log files found"
)

:final_result
REM Final health check result
call :log_message "Health check completed with !ERROR_COUNT! errors"

if !ERROR_COUNT! equ 0 (
    call :log_message "RESULT: %APP_NAME% is HEALTHY"
    echo.
    echo ================================
    echo   %APP_NAME% - HEALTHY
    echo ================================
    echo   All systems operational
    echo   Timestamp: %date% %time%
    echo ================================
    exit /b 0
) else (
    call :log_message "RESULT: %APP_NAME% has ISSUES (!ERROR_COUNT! errors)"
    echo.
    echo ================================
    echo   %APP_NAME% - ISSUES DETECTED
    echo ================================
    echo   Errors found: !ERROR_COUNT!
    echo   Check log: %LOG_FILE%
    echo   Timestamp: %date% %time%
    echo ================================
    exit /b 1
)

:end
endlocal

