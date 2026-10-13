# Tests: Foundation

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-DEPLOY-001 | manual | After `sudo reboot`, `systemctl --user status gin-console` shows active |
| TC-2 | REQ-DEPLOY-001 | manual | With an invalid config, `systemctl --user status gin-console` shows failed after the start limit and `journalctl --user -u gin-console` shows the config error |
| TC-3 | REQ-DEPLOY-002 | manual | `tailscale serve status` lists `/` → `127.0.0.1:3000` and `:8443` → `127.0.0.1:8700`, no `/bd` |
| TC-4 | REQ-DEPLOY-002 | manual | From another tailnet device, `https://instance-20260515-2304.tail5ca54e.ts.net:8443` shows the Projects page |
