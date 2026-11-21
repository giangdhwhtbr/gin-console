# Spec Delta: Retire Sessions and Quota

## ADDED

## MODIFIED

### REQ-BEADS-018: Pull status display
<!-- base: edacce0f2bd13aa36ad99c6c96f1030a71a10984661250f05275db8ca07435f3 -->
The Projects page SHALL show on each project card whose `pull` is not `null`: "pulled " and the age of `pull.at` as a relative time ("just now" under 45 seconds, else the nearest whole number of minutes under an hour, of hours under a day, or of days, for example "pulled 2 minutes ago") when `pull.status` is `ok`, "no Dolt remote" when it is `no_remote`, and "pull failed: <error>" marked as an error when it is `error`, with the full `at` time as its `title`; and WHERE the `pull` of a project in `GET /api/projects/beads` has `status` `error`, the Beads page with that project selected and the My Tasks page SHALL show, above their list, the note "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." once per such project, and SHALL show no such note for a project whose `pull` is `null`, missing, or not `error`.

#### Scenario: Pulled
- GIVEN project A with `pull` `{"status": "ok", "at": <2 minutes ago>, "error": null}`
- WHEN the Projects page loads
- THEN A's card shows "pulled 2 minutes ago"

#### Scenario: Pulled just now
- GIVEN project A with `pull.status` `ok` and `pull.at` 10 seconds ago
- WHEN the Projects page loads
- THEN A's card shows "pulled just now"

#### Scenario: No remote
- GIVEN project B with `pull.status` `no_remote`
- WHEN the Projects page loads
- THEN B's card shows "no Dolt remote" and no error

#### Scenario: Failed pull on the card
- GIVEN project A with `pull` `{"status": "error", "error": "Merge conflict detected", …}`
- WHEN the Projects page loads
- THEN A's card shows "pull failed: Merge conflict detected" as an error and its beads counts as before

#### Scenario: Failed pull note
- GIVEN projects A whose `pull.status` is `error` and B whose `pull` is `null`
- WHEN My Tasks opens, and then the Beads page opens with A selected
- THEN each page shows one note naming A, its error, `bd dolt pull` and A's path, none names B, and the lists are shown below it

#### Scenario: Older backend
- GIVEN projects without a `pull` key
- WHEN the Projects, Beads and My Tasks pages load
- THEN no pull line and no pull note is shown

### REQ-UI-057: Current destination
<!-- base: 9586e43b348a1be167d80bb259a3259d1e185a418d7c9cd0636865f27c1e37f0 -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads, `/milestones`, `/milestones/<project>/<id>` as Milestones and `/reports` as Reports, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL is `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL is `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Address of a retired page
- GIVEN the URL is `/sessions/alpha/s-1`
- WHEN the page loads
- THEN no link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the Projects page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

### REQ-DOCKER-001: Image contains the required tools
<!-- base: 28233c2d169a00c1f877219bc1b48bf8ba650ec65b055b86c05f9edb561a1779 -->
The Dockerfile SHALL build an image that provides `uv`, `git`, `bd` and `gin` on the `PATH`, the backend installed from `uv.lock`, and the built frontend, and SHALL NOT install `claude` or `codex`.

#### Scenario: Tools present
- GIVEN the image was built with default build args
- WHEN `uv --version`, `git --version`, `bd --version` and `gin --version` run in the container
- THEN each exits 0

#### Scenario: No agent CLIs
- GIVEN the image was built with default build args
- WHEN `command -v claude` and `command -v codex` run in the container
- THEN each exits non-zero

#### Scenario: Frontend bundled
- GIVEN the image was built
- WHEN the container starts with a valid config
- THEN `GET /` returns the built frontend

### REQ-DOCKER-003: Host paths are preserved
<!-- base: a1e31cf064c17e7a1fc709d74261a24d90c513fbf72e59c2527bcdc06fbe5e7b -->
The container SHALL run as the host user with `HOME=/home/gin`, and the compose file SHALL mount the config file and each project directory at the same absolute paths they have on the host.

#### Scenario: Shared config
- GIVEN the config lists `/home/gin/qwikfone`
- WHEN the container starts
- THEN `/home/gin/qwikfone` exists inside the container and the Projects page lists it without a "missing" badge

#### Scenario: Same config in both modes
- GIVEN the systemd service uses `~/.config/gin-console/config.yaml`
- WHEN the container starts from the same file
- THEN both show the same project list

### REQ-DOCKER-004: Mount permissions
<!-- base: 76979b37d5d0f1447926e3f292601b5d6168fb0edd54cca0fe88dd6f53aa8f16 -->
The compose file SHALL mount project directories read-write and SHALL NOT mount `~/.claude` or `~/.codex`.

#### Scenario: Beads works
- GIVEN a project with a `.beads` directory is mounted
- WHEN `bd list` runs in the container against that project
- THEN it succeeds without a lock error

#### Scenario: No login directories
- GIVEN the container was started from the compose file
- WHEN `test -e "$HOME/.claude"` and `test -e "$HOME/.codex"` run in the container
- THEN each exits non-zero

### REQ-DOCKER-006: Pinned and secret-safe build
<!-- base: 5648df2e4ee3a21daf39cc6affa6ec7a95c06c87f17151800ac6c9ffaa4fb652 -->
The Dockerfile SHALL set the versions of `bd` and the `gin-workflow` git ref through build args with defaults, and SHALL accept git credentials only through BuildKit secrets.

#### Scenario: Pinned versions
- GIVEN no build args are overridden
- WHEN the image is built twice
- THEN both builds install the same tool versions

#### Scenario: No secret in layers
- GIVEN the image was built with a git secret
- WHEN `docker history` and the image filesystem are inspected
- THEN the secret value is not present

## REMOVED

### REQ-SESSIONS-001: Project session directories
<!-- base: 305d67003a94f9c3a5f8c81600a7693c643cd8b2029e366b1b98fe241ecd224d -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-002: Session list
<!-- base: 5ca4317fe467ed939b68d2f9ceef051ad040674769a92f31c4383d8b04d41904 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-003: Session title and cwd
<!-- base: 54e94f50ddce7a6b742d6388136c50ee738549137fbe639fb31aa54331866116 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-004: Live sessions
<!-- base: d2e91ecfefd6f81d460e7d8084656193311012d1cc5f7eb77d8d51fb7f9a7e51 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-005: Resume command
<!-- base: 5ad42643174b90ea7081b2eec31d1b0620dfbe4c17cbeb8c7677d7a8fcb84148 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-006: Message pages
<!-- base: f80fe40f90c6332e5f103c2505af7323ced9587c6d8f8c1026fe17a89761c25d -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-007: Message shape
<!-- base: f8354bb0ec1094d2ae6af2fcbd36bf87553488a84fb2a7b7a70265c742b547c6 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-008: Safe, read-only lookup
<!-- base: 91009c326eb3166e5d157f5b752428bc87c2157da6f5b14ff6c5b671ed8695c2 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-SESSIONS-009: Windows session inspection and path matching
<!-- base: 142193ec71126025feecaf41707eb6c23e3952382da1528607e281d5c69bb519 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-001: Quota endpoint
<!-- base: bc3a4ffc863e6033c66ecdc87b799ebe9c7a0b722fedffbdc7e2b1c62c6fc5eb -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-002: Claude usage from the usage command
<!-- base: ad08f4e3b0c17f062fd79c1f825568dd0ae257b839543eb8306d43f45eed4148 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-003: Claude usage unavailable
<!-- base: 7c0b58b0a805ca56ff1763d5560c12c033754f9ac35be100cbf2b5e1540f3143 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-004: Codex rate limits from the app server
<!-- base: c608f32658e257c20060dc1350919d73bac57f05fe6b731101be206765df347e -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-005: Codex rate limits unavailable
<!-- base: c70f3ed9dae79db93a9d6f2128ad8a5dc61f6f679fea2d51aeffb9bfe8df95ee -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-006: Reuse and refresh
<!-- base: 51bfb2be4e8654239e3e500c8242ea39cd76136d3ba82510d8b620bd6aa173d9 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-007: Fixed commands and safe output
<!-- base: 428de9bb3792213120b12332c208b9bb9bcb3812fd6eaf1dd2e12afbe1473468 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-QUOTA-008: Windows quota process handling
<!-- base: f627eb556a29e66c94e34601c50f4c6640551a673a3c041898ed26288b6b002a -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-008: Sessions navigation
<!-- base: 6b7ee02048681ccc431e0ad1f31192e4cd52ad698849706af128bd6cda3b7034 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-009: Session list display
<!-- base: 1478f939525300f2c5e513efeaabc45fd5259370bf80958f432a3fe6b1f7800c -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-010: Session list refresh
<!-- base: 567eea71ffc200cb338b99cae42cc00b77ee7e46eadd2ebcbde12e369bdef3fd -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-011: Copy resume command
<!-- base: 4459d99442d440a03ec4d28dd9b6436ebdc92e24c2bef4b1270f42c0475fc9a9 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-012: Session log view
<!-- base: 2d4c43fd83e4c64df7c3e012b76f42852edd1eec6da6097099832b54de450247 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-013: Load more and refresh
<!-- base: b85c06473787b56d0a682454a01b5d0594e08b069be9ac1b1bf1047c0ad859b1 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-014: Session errors
<!-- base: 94a3e83fd17ad7e4f8f8e3900795784b2e6ed517624c834990312ad96cb77f08 -->
Reason: The Sessions page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-015: Quota page without navigation
<!-- base: 10757233b8ed84d4566043a8b0e78b7e15be354f21e6cafe3f73e6dfa5974a60 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-016: No quota on the Projects page
<!-- base: 08188b272b32f404bb0f03bb24a8920a803c37f75a048decfb84dd91a5c4e60a -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-017: Quota status rules
<!-- base: e43e81a6c930d7f42c351c1f260c5fae025f3680517f4cfb17eaacb1fc5a6989 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-018: Claude quota card
<!-- base: c7cca7bad68a9d3fed9472a0d26e6799fa97a7d2ccaad4a11fe90d86434f3d03 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-019: Codex quota card
<!-- base: 2a85597d1b1bc47268c3388d836a01a12a16c6a97da377baf857b48614fdaa24 -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-020: Quota refresh
<!-- base: 668b2cc37f074e8bf15a6b9b37a0f547e149db94aa178535b422db4d1a6ad0cc -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).

### REQ-UI-021: Quota errors
<!-- base: 2c292c294c7548c2ece51bfd2023526cc38152068813b318197f8ff250d7509e -->
Reason: The Quota page is retired (PM decision 2026-11-21, epic gin-console-rm-retire-sessions-quota).
