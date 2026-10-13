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
The config SHALL define `server.host`, `server.port`, and a `projects` list whose entries have a unique `name`, an absolute `path`, and an optional `scotty_id`.

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
