# TC-CONFIG-007: Listed folders

- **REQ:** REQ-CONFIG-008@d85403e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 5444a6e8

**Preconditions:**
- Project `qwikfone` with `evidence_roots: [/home/gin/infra/bug-sync-mcp/data/attachments]` and project `scotty` without it

**Steps:**
1. Start the console

**Expected:**
- The folder is an evidence folder of `qwikfone`
- The folder is an evidence folder of no other project
- A listed folder that does not exist serves no image and does not stop the console
