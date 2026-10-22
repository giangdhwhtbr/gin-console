# Spec Delta: Retire Scotty

## ADDED

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

## MODIFIED

### REQ-CONFIG-002: Project entries
<!-- base: 2889adb6fbd0ecafd933987f8ac3173946910becd2e31edbcadc61dc270c37a8 -->
The config SHALL define `server.host`, `server.port`, and a `projects` list whose entries have a unique `name` and an absolute `path`.

#### Scenario: Valid projects
- GIVEN a config with two projects that have distinct names and absolute paths
- WHEN the console starts
- THEN both projects are loaded in config order

#### Scenario: Server defaults
- GIVEN a config without a `server` section
- WHEN the console starts
- THEN it binds to `127.0.0.1:8700`

### REQ-SERVER-003: Projects endpoint
<!-- base: 2f0e89892a6475f5d952489d418e33945e7ce9c6ea901ebdcdd95dbd1f2d6906 -->
WHEN a client requests `GET /api/projects`, the server SHALL return the configured projects in config order, each with `name`, `path`, `exists` reflecting whether `path` is a directory at request time, `workflow` and `beads`.

#### Scenario: Existing and missing paths
- GIVEN two configured projects, one whose path is a directory and one whose path does not exist
- WHEN a client requests `GET /api/projects`
- THEN the response lists both with `exists` true and false respectively

#### Scenario: Path appears later
- GIVEN a configured project whose path did not exist at startup
- WHEN the directory is created and a client requests `GET /api/projects`
- THEN that project has `exists` true

#### Scenario: No Scotty fields
- GIVEN any configured project
- WHEN a client requests `GET /api/projects`
- THEN its entry has no `scotty_id` and no `scotty_url`

### REQ-UI-005: Project links
<!-- base: ce5a7943c503ee2ed2b7905a627941fee3e8308efe8eda7d4e5881b793839dfb -->
The Projects page SHALL link each project name to that project's Beads page `/beads?project=<name>` inside the console, in the same tab and without an external address, and SHALL link each active epic to the bead page `/beads/<project>/<id>`.

#### Scenario: Project name opens its beads
- GIVEN a project named `qwikfone`
- WHEN the Projects page loads
- THEN the name links to `/beads?project=qwikfone`, without `target` and without an external address

#### Scenario: Name needing encoding
- GIVEN a project named `a b`
- WHEN the Projects page loads
- THEN the name links to `/beads?project=a%20b`

#### Scenario: Epics open the console's bead page
- GIVEN a project named `scotty` with active epic `scotty-1`
- WHEN the Projects page loads
- THEN the epic links to `/beads/scotty/scotty-1` inside the console

### REQ-DEPLOY-002: Tailscale serve on a dedicated port
<!-- base: deb3c11c19ba291c069038ff4d6be0fcc3555824111371d340255d4e08314dee -->
The deployment SHALL expose the console through `tailscale serve` on HTTPS port 8443 proxying to `http://127.0.0.1:8700`, and SHALL NOT depend on any other web application being served beside it.

#### Scenario: Reachable from the tailnet
- GIVEN the service is running and the serve rule is applied
- WHEN another tailnet device opens `https://<host>.ts.net:8443`
- THEN the Projects page loads

#### Scenario: Serve rule listed
- GIVEN the serve rule is applied
- WHEN the operator runs `tailscale serve status`
- THEN it lists `:8443` proxying to the console

## REMOVED

### REQ-CONFIG-004: Scotty base URL
<!-- base: 0c45a53a39fc564bc2d060a6443bbcdfd32a25d97a00bfae9d297129e49c04b7 -->
Reason: Scotty is retired; the console no longer builds links to it, and a stale `server.scotty_base_url` is reported by REQ-CONFIG-005.
