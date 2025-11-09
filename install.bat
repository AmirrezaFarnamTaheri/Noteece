@echo off
REM ============================================================================
REM Noteece - One-Click Installation and Build Automation Script (Windows Batch)
REM For Windows Command Prompt
REM
REM Usage: install.bat [--skip-tests] [--skip-build] [--only-setup]
REM
REM Features:
REM - System requirement verification
REM - Automatic dependency installation via Chocolatey
REM - Repository setup
REM - Comprehensive test suite
REM - Multi-platform builds
REM - Installation package generation
REM ============================================================================

setlocal enabledelayedexpansion

REM Color codes (using SystemPageFile approach for colors)
REM Since batch doesn't have native colors, we'll use text with markers

cls
echo.
echo ============================================================================
echo  Noteece - One-Click Installation and Build Script (Windows)
echo ============================================================================
echo.

REM Parse command line arguments
set SKIP_TESTS=false
set SKIP_BUILD=false
set ONLY_SETUP=false

:parse_args
if "%~1"=="" goto end_args
if "%~1"=="--skip-tests" (
    set SKIP_TESTS=true
    shift
    goto parse_args
)
if "%~1"=="--skip-build" (
    set SKIP_BUILD=true
    shift
    goto parse_args
)
if "%~1"=="--only-setup" (
    set ONLY_SETUP=true
    set SKIP_TESTS=true
    set SKIP_BUILD=true
    shift
    goto parse_args
)
shift
goto parse_args

:end_args

REM Configuration
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

set PROJECT_NAME=Noteece
set MIN_NODE_VERSION=18.0.0
set MIN_RUST_VERSION=1.70.0
set MIN_PNPM_VERSION=8.0.0

REM ============================================================================
REM System Detection
REM ============================================================================

echo.
echo [*] System Detection
echo ---------------------

for /f "tokens=*" %%i in ('wmic os get caption ^| findstr /r "."') do (
    set OS_INFO=%%i
)

REM Get architecture
for /f "tokens=*" %%i in ('wmic os get osarchitecture ^| findstr /r "."') do (
    set ARCH_INFO=%%i
)

echo Operating System: %OS_INFO:~0,50%
echo Architecture: %ARCH_INFO:~0,50%

REM ============================================================================
REM Dependency Checking
REM ============================================================================

echo.
echo [*] Checking System Requirements
echo --------------------------------

set MISSING_DEPS=false

REM Check Node.js
echo.
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js not found
    set MISSING_DEPS=true
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js %NODE_VERSION%
)

REM Check Rust
echo Checking Rust...
where /q rustc
if errorlevel 1 (
    echo [X] Rust not found
    set MISSING_DEPS=true
) else (
    for /f "tokens=*" %%i in ('rustc --version') do set RUST_VERSION=%%i
    echo [OK] %RUST_VERSION%
)

REM Check pnpm
echo Checking pnpm...
where /q pnpm
if errorlevel 1 (
    echo [X] pnpm not found
    set MISSING_DEPS=true
) else (
    for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo [OK] pnpm %PNPM_VERSION%
)

REM Check Git
echo Checking Git...
where /q git
if errorlevel 1 (
    echo [X] Git not found
    set MISSING_DEPS=true
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [OK] %GIT_VERSION%
)

REM ============================================================================
REM Dependency Installation
REM ============================================================================

echo.
echo [*] Installing Missing Dependencies
echo -----------------------------------

REM Check if Chocolatey is installed
where /q choco
if errorlevel 1 (
    echo.
    echo [!] Chocolatey not found. Installing Chocolatey...
    echo.
    echo This requires Administrator privileges. Please run as Administrator.
    echo.
    powershell -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command ^
        "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; ^
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

    if errorlevel 1 (
        echo [X] Failed to install Chocolatey. Please install manually.
        echo     Visit: https://chocolatey.org/install
        goto error
    )
    echo [OK] Chocolatey installed
)

REM Install Node.js if missing
if %MISSING_DEPS% equ 1 (
    where /q node
    if errorlevel 1 (
        echo.
        echo Installing Node.js (requires Administrator)...
        call choco install -y nodejs
        if errorlevel 1 (
            echo [X] Failed to install Node.js
            goto error
        )
        echo [OK] Node.js installed
    )
)

REM Install Rust if missing
where /q rustc
if errorlevel 1 (
    echo.
    echo Installing Rust (requires Administrator)...
    call choco install -y rust-msvc
    if errorlevel 1 (
        echo [X] Failed to install Rust
        goto error
    )
    echo [OK] Rust installed
    echo Refreshing environment variables...
    call refreshenv
)

REM Install pnpm if missing
where /q pnpm
if errorlevel 1 (
    echo.
    echo Installing pnpm...
    call npm install -g pnpm@8
    if errorlevel 1 (
        echo [X] Failed to install pnpm
        goto error
    )
    echo [OK] pnpm installed
)

REM Configure Rust for Windows builds
echo.
echo Configuring Rust targets...
call rustup target add x86_64-pc-windows-msvc
call rustup default stable-msvc
echo [OK] Rust targets configured

REM Install Visual Studio Build Tools if needed
where /q cl.exe
if errorlevel 1 (
    echo.
    echo [!] Visual C++ Build Tools not found
    echo     Please install Visual Studio Build Tools with C++ support
    echo     Download: https://visualstudio.microsoft.com/downloads/
    echo.
)

REM ============================================================================
REM Repository Setup
REM ============================================================================

echo.
echo [*] Repository Setup
echo ------------------

if not exist "%SCRIPT_DIR%package.json" (
    echo [X] package.json not found. Are you in the project root?
    goto error
)

echo [OK] Project directory: %SCRIPT_DIR%

if exist "%SCRIPT_DIR%node_modules" (
    echo [!] Existing node_modules found. Cleaning...
    rmdir /s /q "%SCRIPT_DIR%node_modules" 2>nul || true
    del /q "%SCRIPT_DIR%pnpm-lock.yaml" 2>nul || true
)

echo.
echo Installing Node dependencies...
cd /d "%SCRIPT_DIR%"
call pnpm install --frozen-lockfile
if errorlevel 1 (
    echo [!] Frozen install failed, installing fresh...
    call pnpm install
    if errorlevel 1 (
        echo [X] Failed to install Node dependencies
        goto error
    )
)
echo [OK] Node dependencies installed

if exist "%SCRIPT_DIR%Cargo.toml" (
    echo.
    echo Setting up Rust workspace...
    call cargo fetch
    echo [OK] Rust workspace ready
)

REM ============================================================================
REM Configuration
REM ============================================================================

echo.
echo [*] Configuration Setup
echo ---------------------

if not exist "%SCRIPT_DIR%.env" (
    echo.
    echo Creating .env file...
    (
        echo # Noteece Configuration
        echo.
        echo # Server Configuration
        echo NOTEECE_SERVER_PORT=8765
        echo NOTEECE_SERVER_HOST=127.0.0.1
        echo.
        echo # Sync Configuration
        echo NOTEECE_SYNC_PORT=8443
        echo NOTEECE_SYNC_AUTO_INTERVAL=300
        echo.
        echo # Database Configuration
        echo NOTEECE_DB_PATH=%USERPROFILE%\.noteece\data
        echo NOTEECE_BACKUP_PATH=%USERPROFILE%\.noteece\backups
        echo.
        echo # Security Configuration
        echo NOTEECE_ENABLE_HTTPS=false
        echo NOTEECE_DEV_MODE=true
        echo.
        echo # Build Configuration
        echo NOTEECE_VERSION=1.0.0
    ) > "%SCRIPT_DIR%.env"
    echo [OK] .env file created with defaults
) else (
    echo [OK] .env file already exists
)

REM ============================================================================
REM Testing
REM ============================================================================

if not "%SKIP_TESTS%"=="true" (
    echo.
    echo [*] Running Test Suite
    echo -------------------
    echo.
    echo Running all tests...
    cd /d "%SCRIPT_DIR%"
    call pnpm test
    if errorlevel 1 (
        echo [X] Some tests failed. Review output above.
        echo Please investigate and run "pnpm test" again.
    ) else (
        echo [OK] All tests passed
    )
) else (
    echo.
    echo [*] Skipping tests (--skip-tests flag)
)

REM ============================================================================
REM Building
REM ============================================================================

if not "%SKIP_BUILD%"=="true" (
    echo.
    echo [*] Building Noteece
    echo -----------------

    if not exist "%SCRIPT_DIR%dist" mkdir "%SCRIPT_DIR%dist"

    echo.
    echo Building desktop application...
    cd /d "%SCRIPT_DIR%apps\desktop"

    echo.
    echo Building Windows (x86_64)...
    call pnpm build -- --target x86_64-pc-windows-msvc
    if errorlevel 1 (
        echo [X] Build failed
        goto error
    )
    echo [OK] Windows build complete

    echo.
    echo Collecting build artifacts...
    if exist "%SCRIPT_DIR%apps\desktop\dist" (
        xcopy "%SCRIPT_DIR%apps\desktop\dist\*" "%SCRIPT_DIR%dist\" /Y /E 2>nul || true
    )

    echo [OK] Desktop build complete
) else (
    echo.
    echo [*] Skipping build (--skip-build flag)
)

REM ============================================================================
REM Build Verification
REM ============================================================================

echo.
echo [*] Build Verification
echo -------------------

if exist "%SCRIPT_DIR%dist" (
    echo [OK] Distribution directory found
    echo.
    echo Available packages:
    dir "%SCRIPT_DIR%dist" /B
) else (
    echo [!] Distribution directory not found
)

REM ============================================================================
REM Summary
REM ============================================================================

echo.
echo.
echo ============================================================================
echo  Installation Complete!
echo ============================================================================
echo.
echo [OK] %PROJECT_NAME% has been successfully installed!
echo.
echo.
echo Next Steps:
echo -----------
echo.
echo 1. Open installation package (if built):
echo    cd dist
echo    explorer .
echo.
echo 2. Run the application:
echo    cd apps\desktop
echo    pnpm dev
echo.
echo 3. For mobile development:
echo    cd apps\mobile
echo    pnpm dev
echo.
echo 4. For backend development:
echo    cargo run --package core-rs
echo.
echo.
echo Configuration Files:
echo   - Environment: .env
echo   - Build config: build.config.ts
echo   - Installation: INSTALLATION.md
echo.
echo Version Info:
echo.
call node --version
call rustc --version
call pnpm --version
echo.
if "%SKIP_TESTS%"=="true" (
    echo [!] Tests were skipped. Run 'pnpm test' to verify installation.
)
if "%SKIP_BUILD%"=="true" (
    echo [!] Build was skipped. Run 'pnpm build' to create installation packages.
)
echo.
echo Enjoy Noteece! ^^_/
echo.

goto end

:error
echo.
echo ============================================================================
echo  Installation Failed!
echo ============================================================================
echo.
echo Please check the errors above and try again.
echo.
exit /b 1

:end
endlocal
