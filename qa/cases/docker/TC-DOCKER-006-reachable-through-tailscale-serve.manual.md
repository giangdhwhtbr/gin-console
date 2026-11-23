# TC-DOCKER-006: Reachable through tailscale serve

- **REQ:** REQ-DOCKER-005@278907b5
- **Priority:** medium

**Preconditions:**
- The compose stack is running
- `tailscale serve --https=8443` points at `http://127.0.0.1:8700`

**Steps:**
1. From a tailnet device, open the `:8443` URL

**Expected:**
- The My Tasks page of the current project is shown
