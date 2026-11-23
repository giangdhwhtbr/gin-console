# TC-DEPLOY-002: Serve rule listed

- **REQ:** REQ-DEPLOY-002@264af66b
- **Priority:** medium

**Preconditions:**
- The serve rule is applied

**Steps:**
1. Run `tailscale serve status` on the host

**Expected:**
- It lists `:8443` proxying to `http://127.0.0.1:8700`
