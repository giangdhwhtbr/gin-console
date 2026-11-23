# TC-DOCKER-005: Not reachable from other interfaces

- **REQ:** REQ-DOCKER-005@278907b5
- **Priority:** medium

**Preconditions:**
- The compose stack is running

**Steps:**
1. From another machine, or from the host using its non-loopback address, request `http://<host address>:8700/`

**Expected:**
- The connection is refused
