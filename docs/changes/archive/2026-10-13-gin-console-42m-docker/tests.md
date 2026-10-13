# Tests: Docker

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-DOCKER-001 | manual | `docker compose run --rm gin-console sh -c 'uv --version && git --version && bd --version && gin-workflow --version && claude --version && codex --version'` exits 0 |
| TC-2 | REQ-DOCKER-002 | manual | `docker compose up -d`, then `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health` prints 200 |
| TC-3 | REQ-DOCKER-003 | manual | Projects page in the container lists the same projects as the systemd service, with no "missing" badge |
| TC-4 | REQ-DOCKER-004 | manual | `docker compose exec gin-console sh -c 'cd /home/gin/gin-console && bd list'` succeeds; `docker compose exec gin-console touch /home/gin/.claude/x` fails with a read-only error |
| TC-5 | REQ-DOCKER-005 | manual | `curl http://<non-loopback host ip>:8700/` is refused; `https://instance-20260515-2304.tail5ca54e.ts.net:8443` shows the Projects page |
| TC-6 | REQ-DOCKER-006 | manual | `docker history --no-trunc` and a filesystem grep show no secret value after a build with a git secret |
