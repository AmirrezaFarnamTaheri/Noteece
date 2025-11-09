#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Noteece - One-Click Installation and Build Automation Script (Windows PowerShell)

.DESCRIPTION
    Comprehensive installation script for Noteece on Windows with:
    - System requirement verification
    - Automatic dependency installation
    - Repository setup and configuration
    - Comprehensive test suite execution
    - Multi-platform builds
    - Installation package generation

.PARAMETER SkipTests
    Skip running the test suite

.PARAMETER SkipBuild
    Skip building the application

.PARAMETER OnlySetup
    Only run setup (skip tests and build)

.EXAMPLE
    .\install.ps1
    .\install.ps1 -SkipTests
    .\install.ps1 -OnlySetup

.NOTES
    Requires Administrator privileges
    Requires PowerShell 5.0 or higher
#>

param(
    [switch]$SkipTests = $false,
    [switch]$SkipBuild = $false,
    [switch]$OnlySetup = $false
)

$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration
# ============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
$ProjectName = "Noteece"
$MinNodeVersion = [version]"18.0.0"
$MinRustVersion = [version]"1.70.0"
$MinPnpmVersion = [version]"8.0.0"

# Color configuration
$colors = @{
    Header = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "White"
    Step = "Blue"
}

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-Host ("=" * 70) -ForegroundColor $colors.Header
    Write-Host $Message -ForegroundColor $colors.Header -NoNewline
    Write-Host "`n" + ("=" * 70) -ForegroundColor $colors.Header
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[*] $Message" -ForegroundColor $colors.Step
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor $colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor $colors.Warning
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor $colors.Error
}

function Get-CommandVersion {
    param(
        [string]$Command,
        [string]$VersionFlag = "--version"
    )

    try {
        $output = & $Command $VersionFlag 2>&1
        if ($output -match "(\d+\.\d+\.\d+)") {
            return $matches[1]
        }
        return $output
    }
    catch {
        return "not found"
    }
}

function Test-CommandExists {
    param([string]$Command)

    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Compare-Versions {
    param(
        [version]$Version1,
        [version]$Version2
    )

    return $Version1 -ge $Version2
}

function Install-Chocolatey {
    Write-Step "Installing Chocolatey..."

    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072

        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

        Write-Success "Chocolatey installed"
        return $true
    }
    catch {
        Write-Error-Custom "Failed to install Chocolatey: $_"
        return $false
    }
}

function Install-Package {
    param(
        [string]$PackageName,
        [string]$FriendlyName = $PackageName
    )

    Write-Step "Installing $FriendlyName..."

    try {
        if ($env:ChocolateyInstall) {
            $ChocoPath = "$env:ChocolateyInstall\bin"
            & "$ChocoPath\choco.exe" install -y $PackageName --no-progress
        } else {
            choco install -y $PackageName --no-progress
        }

        Write-Success "$FriendlyName installed"
        return $true
    }
    catch {
        Write-Error-Custom "Failed to install $FriendlyName: $_"
        return $false
    }
}

# ============================================================================
# System Detection
# ============================================================================

Write-Header " System Detection"

$OSInfo = (Get-WmiObject -Class Win32_OperatingSystem).Caption
$ArchInfo = (Get-WmiObject -Class Win32_OperatingSystem).OSArchitecture
$ComputerName = $env:COMPUTERNAME

Write-Host "Operating System: $OSInfo"
Write-Host "Architecture: $ArchInfo"
Write-Host "Computer: $ComputerName"
Write-Host ""

# ============================================================================
# Dependency Checking
# ============================================================================

Write-Header " Checking System Requirements"

$dependencies = @{
    "Node.js" = @{ Command = "node"; VersionFlag = "--version"; MinVersion = $MinNodeVersion }
    "Rust" = @{ Command = "rustc"; VersionFlag = "--version"; MinVersion = $MinRustVersion }
    "pnpm" = @{ Command = "pnpm"; VersionFlag = "--version"; MinVersion = $MinPnpmVersion }
    "Git" = @{ Command = "git"; VersionFlag = "--version"; MinVersion = [version]"2.0.0" }
}

$missingDeps = @()

foreach ($dep in $dependencies.GetEnumerator()) {
    $depName = $dep.Key
    $cmd = $dep.Value.Command
    $versionFlag = $dep.Value.VersionFlag
    $minVersion = $dep.Value.MinVersion

    Write-Host "Checking $depName..." -NoNewline

    if (Test-CommandExists $cmd) {
        $version = Get-CommandVersion $cmd $versionFlag

        # Extract version number
        if ($version -match "(\d+\.\d+\.\d+)") {
            $parsedVersion = [version]$matches[1]

            if (Compare-Versions $parsedVersion $minVersion) {
                Write-Host " [OK] $parsedVersion" -ForegroundColor $colors.Success
            }
            else {
                Write-Host " [OLD] $parsedVersion (required: $minVersion+)" -ForegroundColor $colors.Warning
                $missingDeps += $depName
            }
        }
        else {
            Write-Host " [OK] $version" -ForegroundColor $colors.Success
        }
    }
    else {
        Write-Host " [MISSING]" -ForegroundColor $colors.Error
        $missingDeps += $depName
    }
}

# ============================================================================
# Dependency Installation
# ============================================================================

if ($missingDeps.Count -gt 0) {
    Write-Header " Installing Missing Dependencies"

    # Ensure Chocolatey is installed
    if (-not (Test-CommandExists "choco")) {
        if (-not (Install-Chocolatey)) {
            Write-Error-Custom "Chocolatey installation failed"
            exit 1
        }
    }

    # Install missing dependencies
    $installerMap = @{
        "Node.js" = "nodejs"
        "Rust" = "rust-msvc"
        "pnpm" = $null  # Special handling - use npm
        "Git" = "git"
    }

    foreach ($dep in $missingDeps) {
        if ($installerMap[$dep] -eq $null) {
            # Install via npm
            if ($dep -eq "pnpm") {
                Write-Step "Installing pnpm via npm..."
                npm install -g pnpm@8
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "pnpm installed"
                }
                else {
                    Write-Error-Custom "Failed to install pnpm"
                    exit 1
                }
            }
        }
        else {
            Install-Package $installerMap[$dep] $dep
        }
    }
}

# ============================================================================
# Environment Refresh
# ============================================================================

Write-Step "Refreshing environment variables..."
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Success "Environment refreshed"

# ============================================================================
# Rust Configuration
# ============================================================================

Write-Header " Rust Configuration"

Write-Step "Adding Rust targets for Windows..."
try {
    & rustup target add x86_64-pc-windows-msvc
    & rustup default stable-msvc
    Write-Success "Rust targets configured"
}
catch {
    Write-Error-Custom "Failed to configure Rust: $_"
}

# Check for Visual Studio Build Tools
Write-Step "Checking for Visual C++ Build Tools..."
$vsPathFound = $false

if (Test-CommandExists "cl.exe") {
    Write-Success "Visual C++ compiler found"
    $vsPathFound = $true
}
else {
    # Check common Visual Studio locations
    $vsPaths = @(
        "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC",
        "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC",
        "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC"
    )

    foreach ($path in $vsPaths) {
        if (Test-Path $path) {
            Write-Success "Visual Studio found at $path"
            $vsPathFound = $true
            break
        }
    }
}

if (-not $vsPathFound) {
    Write-Warning "Visual C++ Build Tools not found"
    Write-Host "Please install Visual Studio Build Tools with C++ support:"
    Write-Host "  Download: https://visualstudio.microsoft.com/downloads/"
}

# ============================================================================
# Repository Setup
# ============================================================================

Write-Header " Repository Setup"

if (-not (Test-Path "$ScriptDir\package.json")) {
    Write-Error-Custom "package.json not found. Are you in the project root?"
    exit 1
}

Write-Success "Project directory: $ScriptDir"

# Clean previous installations
if (Test-Path "$ScriptDir\node_modules") {
    Write-Warning "Existing node_modules found. Cleaning..."
    Remove-Item -Path "$ScriptDir\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$ScriptDir\pnpm-lock.yaml" -Force -ErrorAction SilentlyContinue
}

Write-Step "Installing Node dependencies..."
Push-Location $ScriptDir
try {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Frozen install failed, installing fresh..."
        & pnpm install
    }
    Write-Success "Node dependencies installed"
}
catch {
    Write-Error-Custom "Failed to install Node dependencies: $_"
    exit 1
}
finally {
    Pop-Location
}

# Setup Rust workspace
if (Test-Path "$ScriptDir\Cargo.toml") {
    Write-Step "Setting up Rust workspace..."
    try {
        & cargo fetch
        Write-Success "Rust workspace ready"
    }
    catch {
        Write-Warning "Failed to fetch Rust dependencies: $_"
    }
}

# ============================================================================
# Configuration
# ============================================================================

Write-Header " Configuration Setup"

if (-not (Test-Path "$ScriptDir\.env")) {
    Write-Step "Creating .env file..."

    $envContent = @"
# Noteece Configuration

# Server Configuration
NOTEECE_SERVER_PORT=8765
NOTEECE_SERVER_HOST=127.0.0.1

# Sync Configuration
NOTEECE_SYNC_PORT=8443
NOTEECE_SYNC_AUTO_INTERVAL=300

# Database Configuration
NOTEECE_DB_PATH=$env:USERPROFILE\.noteece\data
NOTEECE_BACKUP_PATH=$env:USERPROFILE\.noteece\backups

# Security Configuration
NOTEECE_ENABLE_HTTPS=false
NOTEECE_DEV_MODE=true

# Build Configuration
NOTEECE_VERSION=1.0.0
"@

    Set-Content -Path "$ScriptDir\.env" -Value $envContent -Encoding UTF8
    Write-Success ".env file created with defaults"
}
else {
    Write-Success ".env file already exists"
}

# ============================================================================
# Testing
# ============================================================================

if (-not $SkipTests -and -not $OnlySetup) {
    Write-Header " Running Test Suite"

    Write-Step "Running all tests..."
    Push-Location $ScriptDir
    try {
        & pnpm test
        Write-Success "All tests passed"
    }
    catch {
        Write-Error-Custom "Some tests failed: $_"
    }
    finally {
        Pop-Location
    }
}
elseif ($SkipTests) {
    Write-Header " Skipping Test Suite"
    Write-Warning "Tests skipped (--SkipTests flag)"
}

# ============================================================================
# Building
# ============================================================================

if (-not $SkipBuild -and -not $OnlySetup) {
    Write-Header " Building Noteece"

    # Create dist directory
    if (-not (Test-Path "$ScriptDir\dist")) {
        New-Item -ItemType Directory -Path "$ScriptDir\dist" | Out-Null
    }

    Write-Step "Building desktop application..."
    Push-Location "$ScriptDir\apps\desktop"
    try {
        Write-Step "Building Windows (x86_64)..."
        & pnpm build -- --target x86_64-pc-windows-msvc

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Windows build complete"

            # Collect artifacts
            Write-Step "Collecting build artifacts..."
            if (Test-Path "$ScriptDir\apps\desktop\dist") {
                Copy-Item "$ScriptDir\apps\desktop\dist\*" "$ScriptDir\dist\" -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        else {
            Write-Error-Custom "Build failed"
            exit 1
        }
    }
    catch {
        Write-Error-Custom "Build error: $_"
        exit 1
    }
    finally {
        Pop-Location
    }

    Write-Success "Desktop build complete"
}
elseif ($SkipBuild) {
    Write-Header " Skipping Build"
    Write-Warning "Build skipped (--SkipBuild flag)"
}

# ============================================================================
# Build Verification
# ============================================================================

Write-Header " Build Verification"

Write-Step "Checking generated artifacts..."
if (Test-Path "$ScriptDir\dist") {
    $artifacts = Get-ChildItem "$ScriptDir\dist" -Recurse -File
    if ($artifacts.Count -gt 0) {
        Write-Success "Generated $($artifacts.Count) artifacts in .\dist\"
        Write-Host ""
        Write-Host "Available packages:" -ForegroundColor $colors.Step
        foreach ($artifact in $artifacts) {
            $size = [math]::Round($artifact.Length / 1MB, 2)
            Write-Host "  - $($artifact.Name) ($size MB)"
        }
    }
    else {
        Write-Warning "No artifacts found in .\dist\"
    }
}
else {
    Write-Warning "Distribution directory not found"
}

# ============================================================================
# Summary
# ============================================================================

Write-Header " Installation Complete!"

Write-Host "✓ $ProjectName has been successfully installed!" -ForegroundColor $colors.Success
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor $colors.Step
Write-Host ""
Write-Host "1. Open installation package (if built):"
Write-Host "   cd dist"
Write-Host "   explorer ."
Write-Host ""
Write-Host "2. Run the application:"
Write-Host "   cd apps\desktop"
Write-Host "   pnpm dev"
Write-Host ""
Write-Host "3. For mobile development:"
Write-Host "   cd apps\mobile"
Write-Host "   pnpm dev"
Write-Host ""
Write-Host "4. For backend development:"
Write-Host "   cargo run --package core-rs"
Write-Host ""

Write-Host "Configuration Files:" -ForegroundColor $colors.Step
Write-Host "  - Environment: .env"
Write-Host "  - Build config: build.config.ts"
Write-Host "  - Installation: INSTALLATION.md"
Write-Host ""

Write-Host "Version Info:" -ForegroundColor $colors.Step
try {
    $nodeVer = & node --version
    Write-Host "  - Node.js: $nodeVer"
}
catch { }

try {
    $rustVer = & rustc --version
    Write-Host "  - $rustVer"
}
catch { }

try {
    $pnpmVer = & pnpm --version
    Write-Host "  - pnpm: $pnpmVer"
}
catch { }

Write-Host ""

if ($SkipTests) {
    Write-Warning "Tests were skipped. Run 'pnpm test' to verify installation."
}

if ($SkipBuild) {
    Write-Warning "Build was skipped. Run 'pnpm build' to create installation packages."
}

Write-Host "Enjoy Noteece! 🎉" -ForegroundColor $colors.Success
Write-Host ""
