# Tests: Windows support

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-SERVER-009 | unit | `tests/test_collect.py` validates `_child_env` uses `Scripts` and `gin-workflow` executes via bash on Windows. |
| TC-2 | REQ-QUOTA-008 | unit | `tests/test_quota_source.py` validates queue-based stdout reader and process termination without `os.killpg`. |
| TC-3 | REQ-SESSIONS-009 | unit | `tests/test_sessions_list.py` validates Windows PID inspection and path translation. |
