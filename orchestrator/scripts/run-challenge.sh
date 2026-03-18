#!/usr/bin/env bash
# Challenge 0: Todo REST API Benchmark Runner
# 在 Claude Code 环境中运行此挑战并记录结果

set -euo pipefail

CHALLENGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_DIR="$CHALLENGE_DIR/results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "=========================================="
echo "  AI Dev Arena — Challenge 0"
echo "  Todo REST API Benchmark"
echo "=========================================="
echo ""
echo "挑战目录: $CHALLENGE_DIR"
echo "结果目录: $RESULTS_DIR"
echo ""

# Step 1: 创建临时工作目录
WORK_DIR=$(mktemp -d)
echo "[1/5] 工作目录: $WORK_DIR"
cd "$WORK_DIR"
git init

# Step 2: 复制 SPEC 和测试
echo "[2/5] 复制 SPEC 和验收测试..."
cp "$CHALLENGE_DIR/SPEC.md" .
cp "$CHALLENGE_DIR/acceptance-tests/package.json" ./package.json
cp "$CHALLENGE_DIR/acceptance-tests/todo-api.test.js" ./tests/todo-api.test.js
mkdir -p tests

# Step 3: 记录开始时间
START_TIME=$(date +%s)
echo "[3/5] 开始时间: $(date)"
echo ""

# Step 4: 运行 Claude Code
echo "[4/5] 启动 Claude Code..."
PROMPT=$(cat <<'EOF'
Read SPEC.md carefully. Implement a complete Todo REST API that passes ALL acceptance tests in tests/todo-api.test.js.

Requirements:
- TypeScript + Express + better-sqlite3
- All endpoints from SPEC.md
- Run `npm install` first, then implement the solution
- After implementation, run `npm test` to verify
- Fix any failing tests
- The app must export an Express app via src/app.ts (module.exports = { app })
- Make sure tests can import it correctly

Do NOT modify the test files. Only create src/ directory with your implementation.

When done and all tests pass, output:
BENCHMARK_DONE: <token_count_used_if_available>
EOF
)

# 使用 --print 模式运行 Claude Code（非 PTY）
claude --permission-mode bypassPermissions --print "$PROMPT" 2>&1 | tee "$RESULTS_DIR/claude-output.log"

# Step 5: 记录结果
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "[5/5] 完成！"
echo "=========================================="
echo "  结果"
echo "=========================================="
echo "耗时: ${DURATION} 秒 ($(( DURATION / 60 )) 分 $(( DURATION % 60 )) 秒)"
echo "输出日志: $RESULTS_DIR/claude-output.log"

# 保存结果
cat > "$RESULTS_DIR/metrics.json" <<ENDJSON
{
  "challenge": "00-todo-api",
  "model": "claude-opus-4-6",
  "orchestrator": "glm-5-via-openclaw",
  "startTime": "$(date -d @$START_TIME -Iseconds 2>/dev/null || date -r $START_TIME -Iseconds)",
  "endTime": "$(date -d @$END_TIME -Iseconds 2>/dev/null || date -r $END_TIME -Iseconds)",
  "durationSeconds": $DURATION,
  "workDir": "$WORK_DIR"
}
ENDJSON

echo "指标: $RESULTS_DIR/metrics.json"
echo ""
echo "提示: 运行测试验证 → cd $WORK_DIR && npm test"
