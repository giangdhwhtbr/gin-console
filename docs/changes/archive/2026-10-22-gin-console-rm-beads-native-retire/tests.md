# Tests: Retire Scotty

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-DEPLOY-002 | manual | After the owner rebuilds and restarts the service, `https://<host>.ts.net:8443` loads the Projects page and `tailscale serve status` lists `:8443` proxying to `http://127.0.0.1:8700` |
