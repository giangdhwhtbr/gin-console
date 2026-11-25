# TC-DEPLOY-001: Reachable from the tailnet

- **REQ:** REQ-DEPLOY-002@264af66b
- **Priority:** medium

**Preconditions:**
- The service is running and the serve rule for port 8443 is applied
- A second device is on the tailnet

**Steps:**
1. On the second device, open `https://<host>.ts.net:8443`

**Expected:**
- The My work page of the current project loads (`/my-tasks?project=<current project>`)
