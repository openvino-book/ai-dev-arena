# run-challenge.ps1 — Windows PowerShell 版本
# Challenge 0: Todo REST API Benchmark Runner

param(
    [string]$Challenge = "00-todo-api",
    [string]$ResultsDir
)

$ErrorActionPreference = "Stop"

$ChallengeDir = Join-Path $PSScriptRoot "..\challenges\$Challenge"
if (-not $ResultsDir) {
    $ResultsDir = Join-Path $ChallengeDir "results\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}
New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AI Dev Arena — Challenge $Challenge" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "挑战目录: $ChallengeDir"
Write-Host "结果目录: $ResultsDir"
Write-Host ""

# Step 1: 创建临时工作目录
$WorkDir = Join-Path $env:TEMP "ai-dev-arena-$Challenge-$(Get-Random)"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
Set-Location $WorkDir
git init | Out-Null

Write-Host "[1/5] 工作目录: $WorkDir"

# Step 2: 复制 SPEC 和测试
Write-Host "[2/5] 复制 SPEC 和验收测试..."
Copy-Item "$ChallengeDir\SPEC.md" .
New-Item -ItemType Directory -Path "tests" -Force | Out-Null
Copy-Item "$ChallengeDir\acceptance-tests\package.json" "package.json"
Copy-Item "$ChallengeDir\acceptance-tests\todo-api.test.js" "tests\todo-api.test.js"
Copy-Item "$ChallengeDir\acceptance-tests\tsconfig.json" "tsconfig.json"

# Step 3: 记录开始时间
$StartTime = Get-Date
Write-Host "[3/5] 开始时间: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host ""

# Step 4: 运行 Claude Code
Write-Host "[4/5] 启动 Claude Code..." -ForegroundColor Yellow

$Prompt = @'
Read SPEC.md carefully. Implement a complete Todo REST API that passes ALL acceptance tests in tests/todo-api.test.js.

Requirements:
- TypeScript + Express + better-sqlite3 + uuid
- All endpoints from SPEC.md
- Run `npm install` first, then implement the solution
- After implementation, run `npx jest` to verify (tests use CommonJS require)
- Fix any failing tests until ALL 23 pass
- The app must export via src/app.ts using: module.exports = { app }
- Make sure tests can require('../src/app') correctly

Do NOT modify the test files. Only create src/ directory with your implementation.

Important: tests use require() (CommonJS), so compile TS to JS first with tsc, or use ts-node.
Recommended approach:
1. npm install
2. Implement in src/app.ts (use CommonJS exports)
3. npx jest to verify
4. Fix any failures
5. Repeat until all 23 tests pass
'@

$LogFile = Join-Path $ResultsDir "claude-output.log"

claude --permission-mode bypassPermissions --print $Prompt 2>&1 | Tee-Object -FilePath $LogFile

# Step 5: 记录结果
$EndTime = Get-Date
$Duration = ($EndTime - $StartTime).TotalSeconds

Write-Host ""
Write-Host "[5/5] 完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  结果" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
$Minutes = [math]::Floor($Duration / 60)
$Seconds = $Duration % 60
Write-Host "耗时: $([math]::Round($Duration, 0)) 秒 ($Minutes 分 $([math]::Round($Seconds) 秒))"
Write-Host "输出日志: $LogFile"

# 保存结果
$Metrics = @{
    challenge    = $Challenge
    model        = "claude-opus-4-6"
    orchestrator = "glm-5-via-openclaw"
    startTime    = $StartTime.ToString("o")
    endTime      = $EndTime.ToString("o")
    durationSeconds = [math]::Round($Duration)
    workDir      = $WorkDir
} | ConvertTo-Json

$Metrics | Out-File -FilePath (Join-Path $ResultsDir "metrics.json") -Encoding utf8

Write-Host "指标: $(Join-Path $ResultsDir metrics.json)"
Write-Host ""
Write-Host "提示: 验证测试 → cd $WorkDir && npx jest" -ForegroundColor DarkGray
