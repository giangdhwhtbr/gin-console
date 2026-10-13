#!/usr/bin/env sh
# Smoke checks for the running compose stack (TC-1..TC-5 in docs/changes/gin-console-42m-docker/tests.md).
set -eu

exec_in() { docker compose exec -T gin-console sh -c "$1"; }
fail() { echo "FAIL: $1" >&2; exit 1; }

# REQ-DOCKER-001 (TC-1)
exec_in 'uv --version && git --version && bd --version && gin-workflow --version && claude --version && codex --version' >/dev/null \
  || fail "a required tool is missing"

# REQ-DOCKER-002 (TC-2)
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health)" = 200 ] || fail "/api/health is not 200"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/)" = 200 ] || fail "/ is not 200"

# REQ-DOCKER-003 / REQ-DOCKER-004 (TC-3, TC-4)
exec_in 'test -d "$HOME/.claude" && test -d "$HOME/.codex"' || fail "login directories are not mounted"
if exec_in 'touch "$HOME/.claude/.smoke" 2>/dev/null'; then fail "~/.claude is writable"; fi
if exec_in 'touch "$HOME/.codex/.smoke" 2>/dev/null'; then fail "~/.codex is writable"; fi
project=$(exec_in 'for d in "$HOME"/*/; do [ -d "$d.beads" ] && echo "${d%/}" && break; done' | tr -d '\r')
[ -n "$project" ] || fail "no mounted project with a .beads directory under \$HOME"
exec_in "cd '$project' && bd list >/dev/null" || fail "bd list failed in $project"

# REQ-DOCKER-005 (TC-5, local half)
ip=$(hostname -I | awk '{print $1}')
if curl -s -m 3 -o /dev/null "http://$ip:8700/"; then fail "console is reachable on $ip:8700"; fi

echo "docker smoke: ok"
