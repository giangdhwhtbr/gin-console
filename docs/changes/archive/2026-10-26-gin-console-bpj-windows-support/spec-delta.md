# Spec Delta: Windows support

## ADDED

### REQ-SERVER-009: Windows script execution and environment
WHERE the server runs on Windows, the server SHALL sanitize `PATH` in `_child_env` by stripping `Scripts` under `VIRTUAL_ENV` rather than `bin`, and SHALL invoke `gin-workflow` via `bash` (locating `bash.exe` via `PATH` or the standard Git for Windows installation path).

#### Scenario: Child environment on Windows
- GIVEN `sys.platform` is `"win32"` and `VIRTUAL_ENV` is set in the environment
- WHEN `_child_env()` is called
- THEN the sanitized `PATH` does not contain the virtualenv's `Scripts` directory

#### Scenario: gin-workflow dispatch on Windows
- GIVEN `sys.platform` is `"win32"` and a command starts with `"gin-workflow"`
- WHEN the command is prepared for subprocess execution
- THEN it is executed via `bash` with the script arguments preserved

### REQ-QUOTA-008: Windows quota process handling
WHERE the server runs on Windows, the server SHALL read Codex app-server responses using non-blocking pipe reading without calling socket-only `select.select()`, and SHALL terminate child process trees using Windows process termination rather than `os.killpg()`.

#### Scenario: Codex JSON-RPC reader on Windows
- GIVEN `sys.platform` is `"win32"`
- WHEN `_codex_conversation` reads responses from the Codex app-server subprocess
- THEN it does not call `select.select()` on the stdout pipe and returns valid responses before deadline

#### Scenario: Codex process termination on Windows
- GIVEN `sys.platform` is `"win32"` and a Codex subprocess is active
- WHEN `_end(process)` is called
- THEN it terminates the process tree without calling `os.killpg()`

### REQ-SESSIONS-009: Windows session inspection and path matching
WHERE the server runs on Windows, the server SHALL determine session process liveness via the Windows process API rather than `/proc/{pid}`, and SHALL normalize Windows drive letters and path separators when matching Claude session project directories.

#### Scenario: Windows live session detection
- GIVEN `sys.platform` is `"win32"` and a session registry record contains an integer `pid`
- WHEN live sessions are inspected
- THEN process liveness is checked via the Windows process API rather than `/proc/{pid}`

#### Scenario: Windows project path matching
- GIVEN a project path on Windows with a drive letter and backslashes
- WHEN `project_dirs` searches for corresponding Claude project directories
- THEN the path is encoded with backslashes and drive separators normalized to hyphens

## MODIFIED

## REMOVED
