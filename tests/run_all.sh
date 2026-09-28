#!/usr/bin/env bash
# Kører alle Playwright-testsuiter mod en lokal server fra repoets rod.
# Brug: tests/run_all.sh            (alle suiter)
#       tests/run_all.sh risiko     (kun suiter hvis navn indeholder "risiko")
set -u
cd "$(dirname "$0")/.."
PORT="${PORT:-8795}"
export BASE_URL="http://localhost:$PORT/"
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
if ! curl -s -o /dev/null "$BASE_URL"; then
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null' EXIT
  sleep 1
fi
total=0
for t in tests/*.test.js; do
  case "$t" in *"${1:-}"*) ;; *) continue ;; esac
  out=$(timeout 180 node "$t" 2>&1)
  n=$(printf '%s\n' "$out" | grep -c '^FAIL ')
  if ! printf '%s\n' "$out" | grep -q '^FAILS: 0'; then n=$((n > 0 ? n : 1)); fi
  printf '%-28s %s\n' "$(basename "$t")" "$([ "$n" -eq 0 ] && echo OK || echo "FEJL ($n)")"
  [ "$n" -eq 0 ] || printf '%s\n' "$out" | grep -E '^FAIL|Error' | head -10 | sed 's/^/    /'
  total=$((total + n))
done
echo "Samlet: $total fejl"
[ "$total" -eq 0 ]
