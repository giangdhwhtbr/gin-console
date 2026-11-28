# Config

## Purpose

## Requirements

### REQ-CONFIG-001: Config file location
WHEN the console starts, the console SHALL read its config from the path in `GIN_CONSOLE_CONFIG` if set, otherwise from `~/.config/gin-console/config.yaml`.

#### Scenario: Default location
- GIVEN `GIN_CONSOLE_CONFIG` is unset and `~/.config/gin-console/config.yaml` exists
- WHEN the console starts
- THEN it loads the projects from that file

#### Scenario: Environment override
- GIVEN `GIN_CONSOLE_CONFIG` points to another valid config file
- WHEN the console starts
- THEN it loads the projects from that file and ignores the default location

### REQ-CONFIG-002: Project entries
The config SHALL define `server.host`, `server.port`, and a `projects` list whose entries have a unique `name` and an absolute `path`.

#### Scenario: Valid projects
- GIVEN a config with two projects that have distinct names and absolute paths
- WHEN the console starts
- THEN both projects are loaded in config order

#### Scenario: Server defaults
- GIVEN a config without a `server` section
- WHEN the console starts
- THEN it binds to `127.0.0.1:8700`

### REQ-CONFIG-003: Invalid config stops startup
IF the config file is missing, is not valid YAML, or violates the schema (duplicate `name`, relative `path`, unknown type), THEN the console SHALL exit with a non-zero status and a message naming the file path or the failing field.

#### Scenario: Missing file
- GIVEN no file exists at the resolved config path
- WHEN the console starts
- THEN it exits non-zero and the message names the path it tried and suggests copying `config.example.yaml`

#### Scenario: Duplicate project name
- GIVEN a config with two projects named `qwikfone`
- WHEN the console starts
- THEN it exits non-zero and the message names the duplicate `name`

#### Scenario: Relative path
- GIVEN a project whose `path` is `qwikfone`
- WHEN the console starts
- THEN it exits non-zero and the message names that project's `path` field

### REQ-CONFIG-005: Removed Scotty settings
IF the config has `server.scotty_base_url` or a project with `scotty_id`, THEN the console SHALL exit with a non-zero status and a message naming that key.

#### Scenario: Old base URL
- GIVEN a config with `server.scotty_base_url` set
- WHEN the console starts
- THEN it exits non-zero and the message names `scotty_base_url`

#### Scenario: Old project id
- GIVEN a config with a project that has `scotty_id`
- WHEN the console starts
- THEN it exits non-zero and the message names `scotty_id`

## Diagrams
- [Pull settings](diagrams/pull-settings-activity.md)
- [Overview settings](diagrams/overview-settings-activity.md)
- [Evidence folders](diagrams/evidence-folders-activity.md)

### REQ-CONFIG-006: Pull settings
The config SHALL accept an optional top-level `beads` section whose `pull_interval` is `0` or a duration of whole seconds, minutes or hours written as `<n>s`, `<n>m` or `<n>h`, of at least one minute, and an optional `pull` boolean (default `true`) on each project entry; IF `pull_interval` does not parse, is under one minute and not `0`, or `pull` is not a boolean, THEN the console SHALL exit with a non-zero status and a message naming the field (REQ-CONFIG-003).

#### Scenario: Interval and opt-out
- GIVEN a config with `beads: {pull_interval: 5m}` and a project with `pull: false`
- WHEN the console starts
- THEN the pull interval is 300 seconds and that project is left out of pulls

#### Scenario: Defaults
- GIVEN a config without `beads` and projects without `pull`
- WHEN the console starts
- THEN there is no scheduled pull and every project is pulled on refresh

#### Scenario: Too short
- GIVEN a config with `beads: {pull_interval: 30s}`
- WHEN the console starts
- THEN it exits non-zero and the message names `beads.pull_interval`

### REQ-CONFIG-007: Overview settings
The config SHALL accept an optional top-level `overview` section whose `aging_days` is an integer of at least 1, default 3; IF `aging_days` is anything else, THEN the console SHALL exit with a non-zero status and a message naming `overview.aging_days` (REQ-CONFIG-003).

#### Scenario: Default
- GIVEN a config without `overview`
- WHEN the console starts
- THEN `aging_days` is 3

#### Scenario: Set
- GIVEN a config with `overview: {aging_days: 5}`
- WHEN the console starts
- THEN `aging_days` is 5

#### Scenario: Invalid
- GIVEN a config with `overview: {aging_days: 0}`
- WHEN the console starts
- THEN it exits non-zero and the message names `overview.aging_days`

### REQ-CONFIG-008: Evidence folders
The config SHALL accept on each project entry an optional `evidence_roots` list of absolute folder paths (default empty), the folders besides the project's `path` from which images of its beads may be served (REQ-BEADS-027); IF an entry of `evidence_roots` is not an absolute path or the field is not a list, THEN the console SHALL exit with a non-zero status and a message naming the field (REQ-CONFIG-003). A listed folder that does not exist SHALL serve no image and SHALL NOT stop the console.

#### Scenario: Listed folders
- GIVEN project `qwikfone` with `evidence_roots: [/home/gin/infra/bug-sync-mcp/data/attachments]`
- WHEN the console starts
- THEN that folder is an evidence folder of `qwikfone` and of no other project

#### Scenario: Default
- GIVEN a project without `evidence_roots`
- WHEN the console starts
- THEN its only evidence folder is its `path`

#### Scenario: Relative folder
- GIVEN a project with `evidence_roots: [shots]`
- WHEN the console starts
- THEN it exits non-zero and the message names that project's `evidence_roots`

### REQ-CONFIG-009: Auth settings
The config SHALL accept an optional top-level `auth` section with `enabled` (boolean, default `false`), `users_file` (path, default `~/.config/gin-console/users.yaml`, `~` expanded), `session_ttl` (a duration written as `<n>m` or `<n>h`, at least 5 minutes, default `12h`) and `rate_limit` with `per_user` (integer ≥ 1, default 5), `per_ip` (integer ≥ 1, default 20) and `window` (a duration of at least one minute, default `15m`); IF a field is of the wrong type or out of range, or `enabled` is `true` and the users file is missing, does not parse, holds no user, or names a project that is not in `projects`, THEN the console SHALL exit with a non-zero status and a message naming the field or the file (REQ-CONFIG-003).

#### Scenario: Defaults
- GIVEN a config without `auth`
- WHEN the console starts
- THEN auth is off, the session TTL is 12 hours and the limits are 5 per user and 20 per IP in 15 minutes

#### Scenario: Enabled without users
- GIVEN a config with `auth: {enabled: true}` and no users file
- WHEN the console starts
- THEN it exits non-zero and the message names the users file

#### Scenario: Unknown project
- GIVEN auth enabled and a user assigned to `ghost`, which is not in `projects`
- WHEN the console starts
- THEN it exits non-zero and the message names `ghost`

#### Scenario: Invalid limit
- GIVEN a config with `auth: {rate_limit: {per_user: 0}}`
- WHEN the console starts
- THEN it exits non-zero and the message names `auth.rate_limit.per_user`

### REQ-CONFIG-010: Path of the gin executable
The config SHALL accept an optional top-level `gin` section whose `path` is an absolute path to the `gin` executable; WHEN `gin.path` is set, every `gin` call of the console SHALL run that file, and WHEN it is not set, `gin` SHALL be found as before (on `PATH`, through the `gin.cmd` shim or Git Bash on Windows). IF `gin` cannot be found or run, THEN the error the console shows SHALL name `gin.path` and the config file. IF `gin.path` is not absolute, THEN the console SHALL exit with a non-zero status and a message naming `gin.path` (REQ-CONFIG-003).

#### Scenario: Default
- GIVEN a config without `gin`
- WHEN the console runs `gin`
- THEN it runs the `gin` found on `PATH`

#### Scenario: Set
- GIVEN `gin: {path: /opt/gin/gin}`
- WHEN the console runs `gin state`
- THEN the process started is `/opt/gin/gin`

#### Scenario: Not found
- GIVEN no `gin` on `PATH` and no `gin.path`
- WHEN a page asks for a project's milestones
- THEN the error names `gin.path`

#### Scenario: Relative path
- GIVEN `gin: {path: bin/gin}`
- WHEN the console starts
- THEN it exits non-zero and the message names `gin.path`
