# Start-Dev.ps1 -- AI-Infra-Learning 开发环境快速启动脚本
# 用法（在项目根目录执行）：
#   powershell -ExecutionPolicy Bypass -File Start-Dev.ps1
#
# 步骤：
#   1. 检查 Node.js >= 18
#   2. 按需执行 npm install（node_modules 缺失或依赖有更新时）
#   3. npm start 启动 Electron 开发服务

$ErrorActionPreference = 'Stop'

function Write-Step { param($msg) Write-Host "`n[.] $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[!]  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "[ERR] $msg" -ForegroundColor Red }

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

if (-not (Test-Path "$root\node_modules")) {
    Write-Warn "node_modules 不存在，准备安装依赖。"
    $needInstall = $true
}

if (-not $needInstall) {
    $nmTime  = (Get-Item "$root\node_modules").LastWriteTime
    $pkgTime = (Get-Item "$root\package.json").LastWriteTime

    $lockFile = "$root\package-lock.json"
    $lockTime = [datetime]::MinValue
    if (Test-Path $lockFile) {
        $lockTime = (Get-Item $lockFile).LastWriteTime
    }

    if (($pkgTime -gt $nmTime) -or ($lockTime -gt $nmTime)) {
        Write-Warn "package.json / package-lock.json 比 node_modules 新，需要重新安装依赖。"
        $needInstall = $true
    } else {
        Write-OK "node_modules 已是最新，跳过安装。"
    }
}

if ($needInstall) {
    Write-Step "执行 npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install 失败，请检查网络连接或依赖配置。"
        exit 1
    }
    Write-OK "依赖安装完成。"
}

# ---- Step 3: 启动开发服务 ----
Write-Step "启动 Electron 开发服务（npm start）..."
Write-Host "  按 Ctrl+C 可停止。" -ForegroundColor DarkGray
Write-Host ""

npm start
