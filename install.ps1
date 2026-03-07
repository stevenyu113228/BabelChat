# BabelChat Installer for Windows
# Usage: .\install.ps1 [-VencordPath C:\path\to\vencord]

param(
    [string]$VencordPath
)

$ErrorActionPreference = "Stop"

# --- Execution Policy Notice ---
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  BabelChat Installer for Vencord" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: If you received an execution policy error running this script," -ForegroundColor Yellow
Write-Host "open PowerShell as Administrator and run:" -ForegroundColor Yellow
Write-Host "  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned" -ForegroundColor White
Write-Host "Then try again." -ForegroundColor Yellow
Write-Host ""

# ============================================================
# [1/6] Check Prerequisites
# ============================================================
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Cyan
Write-Host ""

$missingDeps = $false

# Check git
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVersion = git --version
    Write-Host "  git found: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "  git is NOT installed." -ForegroundColor Red
    Write-Host "  Install it from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  Or run: winget install Git.Git" -ForegroundColor Yellow
    $missingDeps = $true
}

# Check node
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersionRaw = node --version
    $nodeMajor = [int]($nodeVersionRaw -replace '^v','').Split('.')[0]
    if ($nodeMajor -ge 18) {
        Write-Host "  node found: $nodeVersionRaw" -ForegroundColor Green
    } else {
        Write-Host "  node found ($nodeVersionRaw) but v18+ is required." -ForegroundColor Red
        Write-Host "  Update from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "  Or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
        $missingDeps = $true
    }
} else {
    Write-Host "  node is NOT installed." -ForegroundColor Red
    Write-Host "  Install it from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  Or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    $missingDeps = $true
}

# Check pnpm
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVersion = pnpm --version
    Write-Host "  pnpm found: v$pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "  pnpm is NOT installed." -ForegroundColor Yellow
    if ($missingDeps) {
        Write-Host "  pnpm requires node/npm. Please install node first, then re-run this script." -ForegroundColor Yellow
        $missingDeps = $true
    } else {
        $installPnpm = Read-Host "  Would you like to install pnpm now via 'npm install -g pnpm'? (y/n)"
        if ($installPnpm -eq 'y' -or $installPnpm -eq 'Y') {
            Write-Host "  Installing pnpm..." -ForegroundColor Yellow
            npm install -g pnpm
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  Failed to install pnpm." -ForegroundColor Red
                $missingDeps = $true
            } else {
                Write-Host "  pnpm installed successfully." -ForegroundColor Green
            }
        } else {
            Write-Host "  pnpm is required. Please install it manually and re-run this script." -ForegroundColor Red
            $missingDeps = $true
        }
    }
}

if ($missingDeps) {
    Write-Host ""
    Write-Host "Missing prerequisites detected. Please install them and re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  All prerequisites satisfied." -ForegroundColor Green
Write-Host ""

# ============================================================
# [2/6] Set up Vencord directory
# ============================================================
Write-Host "[2/6] Setting up Vencord..." -ForegroundColor Cyan
Write-Host ""

if (-not $VencordPath) {
    $VencordPath = Join-Path $env:USERPROFILE ".vencord-src"
    Write-Host "  No -VencordPath provided. Using default: $VencordPath" -ForegroundColor Yellow
} else {
    Write-Host "  Using provided Vencord path: $VencordPath" -ForegroundColor Yellow
}

# ============================================================
# [3/6] Clone or update Vencord
# ============================================================
Write-Host ""
Write-Host "[3/6] Cloning or updating Vencord..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path (Join-Path $VencordPath ".git")) {
    Write-Host "  Vencord directory already exists. Pulling latest changes..." -ForegroundColor Yellow
    Push-Location $VencordPath
    try {
        git pull
        if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
    } finally {
        Pop-Location
    }
    Write-Host "  Vencord updated." -ForegroundColor Green
} elseif (Test-Path $VencordPath) {
    Write-Host "  Directory exists at $VencordPath but is not a git repo." -ForegroundColor Red
    Write-Host "  Please remove it or provide a different path with -VencordPath." -ForegroundColor Red
    exit 1
} else {
    Write-Host "  Cloning Vencord into $VencordPath..." -ForegroundColor Yellow
    git clone https://github.com/Vendicated/Vencord.git "$VencordPath"
    if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
    Write-Host "  Vencord cloned." -ForegroundColor Green
}

Write-Host ""
Write-Host "  Installing Vencord dependencies (pnpm install)..." -ForegroundColor Yellow
Push-Location $VencordPath
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
} finally {
    Pop-Location
}
Write-Host "  Dependencies installed." -ForegroundColor Green
Write-Host ""

# ============================================================
# [4/6] Copy the BabelChat plugin
# ============================================================
Write-Host "[4/6] Copying BabelChat plugin..." -ForegroundColor Cyan
Write-Host ""

$sourcePath = Join-Path $PSScriptRoot "src\userplugins\babelChat"
$destPath = Join-Path $VencordPath "src\userplugins\babelChat"

if (-not (Test-Path $sourcePath)) {
    Write-Host "  ERROR: Plugin source not found at $sourcePath" -ForegroundColor Red
    Write-Host "  Make sure this script is in the root of the BabelChat repository." -ForegroundColor Red
    exit 1
}

if (Test-Path $destPath) {
    Write-Host "  Removing existing BabelChat plugin at destination..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $destPath
}

Copy-Item -Recurse -Force $sourcePath $destPath
Write-Host "  Copied plugin to: $destPath" -ForegroundColor Green
Write-Host ""

# ============================================================
# [5/6] Build Vencord
# ============================================================
Write-Host "[5/6] Building Vencord..." -ForegroundColor Cyan
Write-Host ""

Push-Location $VencordPath
try {
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }
} finally {
    Pop-Location
}
Write-Host ""
Write-Host "  Build complete." -ForegroundColor Green
Write-Host ""

# ============================================================
# [6/6] Inject into Discord
# ============================================================
Write-Host "[6/6] Inject Vencord into Discord" -ForegroundColor Cyan
Write-Host ""

Write-Host "  IMPORTANT: Please close Discord completely before injecting." -ForegroundColor Yellow
Write-Host "  (Right-click the Discord icon in the system tray > Quit Discord)" -ForegroundColor Yellow
Write-Host ""
$doInject = Read-Host "  Do you want to inject Vencord into Discord now? (y/n)"
if ($doInject -eq 'y' -or $doInject -eq 'Y') {
    Write-Host ""
    Write-Host "  The injector will ask which Discord version to use." -ForegroundColor Yellow
    Write-Host "  Pick 'Discord' (Stable) if you're not sure." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Injecting Vencord into Discord..." -ForegroundColor Yellow
    Push-Location $VencordPath
    try {
        pnpm inject
        if ($LASTEXITCODE -ne 0) { throw "pnpm inject failed" }
    } finally {
        Pop-Location
    }
    Write-Host ""
    Write-Host "  Injection complete." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  Skipped injection. You can run it later with:" -ForegroundColor Yellow
    Write-Host "    cd $VencordPath" -ForegroundColor White
    Write-Host "    pnpm inject" -ForegroundColor White
}

# ============================================================
# Done!
# ============================================================
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  BabelChat installation complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart Discord completely (close from system tray too)." -ForegroundColor White
Write-Host "  2. Open Discord Settings > Vencord > Plugins." -ForegroundColor White
Write-Host "  3. Search for 'BabelChat' and enable it." -ForegroundColor White
Write-Host "  4. Configure your preferred languages in the plugin settings." -ForegroundColor White
Write-Host ""
Write-Host "Enjoy translating with BabelChat!" -ForegroundColor Green
Write-Host ""
