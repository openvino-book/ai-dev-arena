#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RESULTS_DIR="$REPO_DIR/results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "========================================="
echo "  AI Dev Arena — Benchmark Runner"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

CHALLENGES=("00-todo-api" "01-auth-system" "02-landing-page" "03-real-time-chat" "04-ecommerce-checkout" "05-pr-fix-bot")
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_TIME=0

for ch in "${CHALLENGES[@]}"; do
  ch_num="${ch%%-*}"
  ch_dir="$REPO_DIR/challenges/$ch"
  
  if [ ! -d "$ch_dir/acceptance-tests" ]; then
    echo "⏭  Challenge $ch_num: No acceptance tests found, skipping"
    continue
  fi

  echo "🔨 Challenge $ch_num: $ch"
  echo "────────────────────────────────"

  # Setup temp dir
  WORK_DIR=$(mktemp -d)
  cp -r "$ch_dir/SPEC.md" "$ch_dir/acceptance-tests" "$WORK_DIR/" 2>/dev/null || true
  
  if [ -f "$ch_dir/acceptance-tests/tsconfig.json" ]; then
    cp "$ch_dir/acceptance-tests/tsconfig.json" "$WORK_DIR/tsconfig.json"
  fi

  # Create tests directory
  mkdir -p "$WORK_DIR/tests"
  cp "$ch_dir/acceptance-tests"/*.test.js "$WORK_DIR/tests/" 2>/dev/null || true
  cp "$ch_dir/acceptance-tests"/package.json "$WORK_DIR/" 2>/dev/null || true

  # Install
  cd "$WORK_DIR"
  npm install --silent 2>&1 | tail -1

  # Run Claude Code
  START=$(date +%s)
  claude --permission-mode bypassPermissions --print \
    "Read SPEC.md. Implement in src/ to pass all tests in tests/. Export via module.exports = { app }. Do NOT modify test files." \
    2>&1 | tail -20
  
  END=$(date +%s)
  DURATION=$((END - START))
  TOTAL_TIME=$((TOTAL_TIME + DURATION))

  # Run tests
  cd acceptance-tests 2>/dev/null || cd .
  TEST_OUTPUT=$(npx jest --verbose 2>&1 || true)
  
  PASS=$(echo "$TEST_OUTPUT" | grep -oP 'Tests:\s+\K\d+(?=\s+passed)' || echo "0")
  FAIL=$(echo "$TEST_OUTPUT" | grep -oP 'Tests:\s+\d+\s+passed.*?(\d+)\s+failed' | grep -oP '\d+(?=\s+failed)' || echo "0")
  
  TOTAL_PASS=$((TOTAL_PASS + PASS))
  TOTAL_FAIL=$((TOTAL_FAIL + FAIL))

  echo "  ✅ Pass: $PASS | ❌ Fail: $FAIL | ⏱ ${DURATION}s"
  echo "$TEST_OUTPUT" > "$RESULTS_DIR/challenge-$ch_num.log"
  
  # Cleanup
  rm -rf "$WORK_DIR"
  echo ""
done

echo "========================================="
echo "  📊 FINAL RESULTS"
echo "========================================="
echo "  Total Pass: $TOTAL_PASS"
echo "  Total Fail: $TOTAL_FAIL"
echo "  Total Time: ${TOTAL_TIME}s ($((TOTAL_TIME / 60))m $((TOTAL_TIME % 60))s)"
echo "  Results:    $RESULTS_DIR/"
echo "========================================="
