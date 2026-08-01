################################################################################
# AI Business Strategy Copilot - Full Stack Dev Startup Script
# Starts MongoDB, Backend (FastAPI), and Frontend (Vite/Node) together
################################################################################

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "startup-ai-copilot-27"
$MongoDataDir = Join-Path $Root "mongo-data"
$MongoLogDir = Join-Path $Root "mongo-logs"

function Write-Header { param([string]$msg) Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host "  $msg" -ForegroundColor Cyan; Write-Host "========================================" -ForegroundColor Cyan }
function Write-OK { param([string]$msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-WARN { param([string]$msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-FAIL { param([string]$msg) Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-INFO { param([string]$msg) Write-Host "[INFO] $msg" -ForegroundColor White }

Write-Header "AI Business Strategy Copilot - Dev Startup"

# ─────────────────────────────────────────────────────────────────────────────
# 1. ENSURE MONGODB IS RUNNING
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Step 1: MongoDB Setup"

$mongoRunning = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", 27017)
    $mongoRunning = $true
    $tcpClient.Close()
} catch {}

if ($mongoRunning) {
    Write-OK "MongoDB is already running on port 27017"
} else {
    Write-INFO "MongoDB not running. Attempting to start..."
    
    # Try to start as a Windows service first
    $svc = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($svc) {
        Write-INFO "Starting MongoDB Windows service..."
        Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        try { $tc = New-Object System.Net.Sockets.TcpClient; $tc.Connect("localhost",27017); $mongoRunning=$true; $tc.Close() } catch {}
        if ($mongoRunning) { Write-OK "MongoDB service started." }
    }
    
    # Try to find and run mongod.exe directly
    if (-not $mongoRunning) {
        $mongodPaths = @(
            "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe",
            "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe",
            "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe",
            "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
        )
        $mongodExe = $mongodPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
        
        if ($mongodExe) {
            Write-INFO "Found mongod at: $mongodExe"
            if (-not (Test-Path $MongoDataDir)) { New-Item -ItemType Directory -Path $MongoDataDir -Force | Out-Null }
            if (-not (Test-Path $MongoLogDir)) { New-Item -ItemType Directory -Path $MongoLogDir -Force | Out-Null }
            
            Write-INFO "Starting mongod with local data directory..."
            Start-Process -FilePath $mongodExe -ArgumentList "--dbpath `"$MongoDataDir`" --logpath `"$MongoLogDir\mongod.log`" --port 27017" -WindowStyle Minimized
            Start-Sleep -Seconds 4
            try { $tc = New-Object System.Net.Sockets.TcpClient; $tc.Connect("localhost",27017); $mongoRunning=$true; $tc.Close() } catch {}
            if ($mongoRunning) { Write-OK "mongod started successfully." }
        }
    }

    # Try installing via winget
    if (-not $mongoRunning) {
        Write-WARN "mongod.exe not found. Attempting to install MongoDB Community Server via winget..."
        Write-INFO "This may take a few minutes on first run..."
        $wingetResult = winget install --id MongoDB.Server --silent --accept-package-agreements --accept-source-agreements 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "MongoDB installed. Attempting to start service..."
            Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 5
            try { $tc = New-Object System.Net.Sockets.TcpClient; $tc.Connect("localhost",27017); $mongoRunning=$true; $tc.Close() } catch {}
            if ($mongoRunning) { Write-OK "MongoDB running after install." }
        }
    }

    if (-not $mongoRunning) {
        Write-FAIL "Could not start MongoDB automatically."
        Write-Host ""
        Write-Host "  MANUAL FIX OPTIONS:" -ForegroundColor Yellow
        Write-Host "  Option A: Download MongoDB Community Server:" -ForegroundColor White
        Write-Host "            https://www.mongodb.com/try/download/community" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Option B: Use a free MongoDB Atlas cloud cluster:" -ForegroundColor White
        Write-Host "            https://cloud.mongodb.com (free forever)" -ForegroundColor Cyan
        Write-Host "            Then update MONGODB_URI in backend/.env with your Atlas connection string" -ForegroundColor White
        Write-Host ""
        $continueAnyway = Read-Host "Continue starting backend + frontend anyway? (y/N)"
        if ($continueAnyway -ne "y" -and $continueAnyway -ne "Y") { exit 1 }
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. START BACKEND (FastAPI)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Step 2: Backend (FastAPI on :8000)"

$venvPython = Join-Path $BackendDir "venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    Write-OK "Found virtual environment at backend/venv"
} else {
    Write-WARN "No venv found. Creating one at backend/venv..."
    python -m venv (Join-Path $BackendDir "venv")
    Write-INFO "Installing Python dependencies..."
    & (Join-Path $BackendDir "venv\Scripts\pip.exe") install -r (Join-Path $BackendDir "requirements.txt") --quiet
}

Write-INFO "Starting FastAPI backend (uvicorn)..."
$backendProcess = Start-Process -FilePath $venvPython `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" `
    -WorkingDirectory $BackendDir `
    -PassThru -WindowStyle Normal
Write-OK "Backend started (PID: $($backendProcess.Id)) -> http://localhost:8000"
Write-INFO "Swagger UI: http://localhost:8000/docs"

Start-Sleep -Seconds 3

# ─────────────────────────────────────────────────────────────────────────────
# 3. START FRONTEND (Vite)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Step 3: Frontend (Vite/TanStack on :8080)"

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-WARN "node_modules not found. Running npm install..."
    Start-Process -FilePath "npm" -ArgumentList "install" -WorkingDirectory $FrontendDir -Wait -WindowStyle Normal
}

Write-INFO "Starting Vite dev server..."
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -PassThru -WindowStyle Normal
Write-OK "Frontend started (PID: $($frontendProcess.Id)) -> http://localhost:8080"

# ─────────────────────────────────────────────────────────────────────────────
# 4. SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "All Services Started"
Write-Host ""
Write-Host "  +---------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |   AI Business Strategy Copilot - Dev Environment       |" -ForegroundColor Cyan
Write-Host "  +---------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  Frontend   ->  http://localhost:8080                  |" -ForegroundColor Green
Write-Host "  |  Backend    ->  http://localhost:8000                  |" -ForegroundColor Green
Write-Host "  |  API Docs   ->  http://localhost:8000/docs             |" -ForegroundColor Green
Write-Host "  |  Health     ->  http://localhost:8000/api/v1/health    |" -ForegroundColor Green
Write-Host "  |  MongoDB    ->  localhost:27017                        |" -ForegroundColor Yellow
Write-Host "  +---------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend and Frontend windows are open in separate consoles." -ForegroundColor Gray
Write-Host "Press any key to exit this launcher..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
