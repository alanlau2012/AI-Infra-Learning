# Start-Dev.ps1 -- AI-Infra-Learning Electron 开发调测启动脚本
# 用法（在项目根目录执行）：
#   powershell -ExecutionPolicy Bypass -File Start-Dev.ps1
#
# 步骤：
#   1. 检查 Node.js >= 18
#   2. 仅在 node_modules 缺失或依赖清单变化时执行 npm install
#   3. npm start 启动 Electron Forge + Vite 开发服务（Renderer HMR 即时生效）

$ErrorActionPreference = 'Stop'

function Write-Step { param($msg) Write-Host "`n[.] $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "[ERR] $msg" -ForegroundColor Red }

function Get-DependencyFingerprint {
    $files = @("$root\package.json", "$root\package-lock.json") | Where-Object { Test-Path $_ }
    return (($files | ForEach-Object { (Get-FileHash $_ -Algorithm SHA256).Hash }) -join "`n")
}

# 切换到脚本所在目录（项目根目录）
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Write-OK "工作目录：$root"

# ---- Step 1: 检查 Node.js 版本 ----
Write-Step "检查 Node.js 版本..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "未找到 node 命令。请先安装 Node.js >= 18：https://nodejs.org"
    exit 1
}

$nodeRaw   = node --version
$nodeMajor = [int]($nodeRaw -replace 'v(\d+)\..*', '$1')

if ($nodeMajor -lt 18) {
    Write-Fail "Node.js 版本过低（当前 $nodeRaw），请升级到 >= 18。"
    exit 1
}
Write-OK "Node.js $nodeRaw"

# ---- Step 2: 检测是否需要 npm install ----
Write-Step "检查 node_modules 状态..."

$needInstall = $false
$depStamp = "$root\node_modules\.ai-infra-learning-deps.hash"
$currentDepFingerprint = Get-DependencyFingerprint

if (-not (Test-Path "$root\node_modules")) {
    Write-Warn "node_modules 不存在，准备安装依赖。"
    $needInstall = $true
}

if (-not $needInstall) {
    $installedDepFingerprint = if (Test-Path $depStamp) { Get-Content $depStamp -Raw } else { "" }
    if ($installedDepFingerprint.Trim() -ne $currentDepFingerprint.Trim()) {
        Write-Warn "依赖清单有变化，准备重新安装依赖。"
        $needInstall = $true
    } else {
        Write-OK "依赖未变化，跳过 npm install。"
    }
}

if ($needInstall) {
    Write-Step "执行 npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install 失败，请检查网络连接或依赖配置。"
        exit 1
    }
    $currentDepFingerprint = Get-DependencyFingerprint
    New-Item -ItemType Directory -Force -Path "$root\node_modules" | Out-Null
    Set-Content -Path $depStamp -Value $currentDepFingerprint -Encoding ASCII
    Write-OK "依赖安装完成。"
}

# ---- Step 3: 启动开发热更新服务 ----
Write-Step "启动 Electron 开发调测版（npm start）..."
Write-Host "  这是 Electron Forge + Vite dev server，不执行 npm run build / package。" -ForegroundColor DarkGray
Write-Host "  修改 src/renderer 下的 React/CSS 会在 Electron 窗口中热更新。" -ForegroundColor DarkGray
Write-Host "  修改 main/preload 代码时 Forge 会重启 Electron 进程。" -ForegroundColor DarkGray
Write-Host "  保持此终端运行；按 Ctrl+C 可停止。" -ForegroundColor DarkGray
Write-Host ""

$env:NODE_ENV = "development"
$env:FORCE_COLOR = "1"
npm start
