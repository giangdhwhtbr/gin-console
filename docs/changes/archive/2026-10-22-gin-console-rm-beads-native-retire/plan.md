# Plan: Retire Scotty

Epic: gin-console-rm-beads-native
Spec: docs/changes/gin-console-rm-beads-native-retire/ (proposal.md, spec-delta.md, design.md, tests.md)

This is change E of five under the epic (A browse, B Board and Focus, C comments and authors and D dependency tree are shipped). Shipping it must NOT close the epic: the owner closes it.

## Objective

The console has no Scotty setting left. `server.scotty_base_url` and the project field `scotty_id` are gone from the config (a config that still has either stops the console naming the key), `GET /api/projects` no longer returns `scotty_id` and `scotty_url`, and on the Projects page a project's name opens its Beads page inside the console. The example config and the deploy notes lose their Scotty references.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: retire Scotty, the last step of the epic: the console owns Beads viewing and carries nothing of Scotty.
- Architecture: backend `config.py` drops the two fields and the URL check; both models already use `extra="forbid"`, so a leftover key fails with pydantic's message, which names the key. `projects/models.py` and `projects/source.py` drop the two response fields. Frontend `projects/api.ts` drops them from the type and the guard; `ProjectCard.tsx` renders the project name as the console `Link` to `/beads?project=<name>`.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, vitest, Testing Library.

## Global Constraints

- Not touched: `~/scotty` and any Scotty service, the owner's real config (`~/.config/gin-console/config.yaml`), the Tailscale rules, the `scotty` project entry in `config.example.yaml` (a repo with beads: it stays a normal project), the roadmap's history, the epic.
- No one-time command is written into any file of the repository.
- Titles and every text come from people and agents: render them as plain text only; ids and names in links go through `encodeURIComponent`.
- Automated tests carry the REQ-ID in the test name or a comment.
- Never run the real `bd`, `claude` or `codex`, and never read or edit the owner's real config: tests use temporary files.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: the console still carries Scotty's project id, base URL and an outbound link per project, though Scotty is not running and the console now does its job.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; the real config as it is makes the console exit naming `scotty_id`, and a temporary copy without that line loads; nothing under `backend/src`, `frontend/src`, `config.example.yaml` and `deploy/` mentions Scotty except the project entry named `scotty` and its path.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Remove the fields; stale keys fail with the key named (selected in discuss)
- Summary: delete the fields; the existing `extra="forbid"` reports a leftover key.
- Pros: no compatibility code; the config describes only what the console uses; the failure is the existing fail-fast path.
- Cons: the owner must delete one line of the real config before the next restart (a manual step).

### Option 2: Remove the fields but ignore the old keys
- Pros: a restart never breaks.
- Cons: a temporary compatibility path to delete later; stale config goes unnoticed.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-CONFIG-002 (modified), REQ-CONFIG-004 (removed), REQ-CONFIG-005, REQ-SERVER-003 (modified), REQ-UI-005 (modified), REQ-DEPLOY-002 (modified; contract text only, no code).
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Two small tracks in a chain (the backend stops returning the fields, then the frontend stops expecting them); one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/config.py` (modify) | drop `scotty_base_url`, its validator, `_is_http_url`, `urlparse`, and `scotty_id` | 1 |
| `backend/src/gin_console/projects/{models,source,router}.py` (modify) | drop `scotty_id`, `scotty_url`; `build_project` loses its unused `settings` parameter | 1 |
| `backend/tests/{test_config,test_app}.py` (modify) | REQ-CONFIG-002, 005, REQ-SERVER-003 | 1 |
| `config.example.yaml` (modify) | no Scotty keys | 1 |
| `frontend/src/features/projects/{api.ts,ProjectCard.tsx}` (modify) | type and guard; the project name link | 2 |
| `frontend/src/features/projects/{ProjectsPage,ProjectsPage.quota}.test.tsx`, `frontend/src/features/beads/{beadFixtures.ts,BeadsPage.test.tsx}`, `frontend/src/app/App.test.tsx` (modify) | REQ-UI-005; fixtures lose `scotty_*` | 2 |
| `deploy/README.md` (modify) | drop the Scotty sentence and the one-time `/bd` line | 2 |

## Tasks

### Track 1: Config and projects API without Scotty
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-002, REQ-CONFIG-005, REQ-SERVER-003
- **Files**: modify `backend/src/gin_console/config.py`, `backend/src/gin_console/projects/{models,source,router}.py`, `backend/tests/{test_config,test_app}.py`, `config.example.yaml`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: a config with `server.scotty_base_url` or a project `scotty_id` exits through `ConfigError` naming that key; a valid config loads without them; `/api/projects` entries have exactly `name`, `path`, `exists`, `workflow`, `beads`; the tests of the removed REQ-CONFIG-004 are gone; ruff and mypy clean; independent review approved.
- **Estimated complexity**: low

Interfaces produced: `ServerSettings(host, port)`, `ProjectEntry(name, path)`, `Project(name, path, exists, workflow, beads)`, `build_project(entry, collector)`.

- [ ] **Step 1: failing tests.** In `backend/tests/test_config.py`:

  Change `test_config_002_valid_projects_in_order` to
```python
# REQ-CONFIG-002
def test_config_002_valid_projects_in_order(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n"
        "  - {name: qwikfone, path: /home/gin/qwikfone}\n"
        "  - {name: scotty, path: /home/gin/scotty}\n",
    )
    settings = load_settings(path)
    assert [p.name for p in settings.projects] == ["qwikfone", "scotty"]
```
  Delete the three tests of `# REQ-CONFIG-004` (`test_config_004_scotty_base_url_valid`, `..._defaults_to_none` and the parametrized `..._invalid`, the end of the file) and append:
```python
# REQ-CONFIG-005
def test_config_005_old_base_url_is_refused(tmp_path: Path) -> None:
    path = write(tmp_path, "server: {scotty_base_url: 'https://h'}\n")
    with pytest.raises(ConfigError, match="scotty_base_url"):
        load_settings(path)


# REQ-CONFIG-005
def test_config_005_old_project_id_is_refused(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: a, path: /a, scotty_id: a}\n")
    with pytest.raises(ConfigError, match="scotty_id"):
        load_settings(path)
```
  In `backend/tests/test_app.py`: change the import to `from gin_console.config import ProjectEntry, Settings`; in `make_client` remove the `scotty_base_url` parameter and build `settings = Settings(projects=projects)`; in `test_server_003_projects_exists_flags` use `ProjectEntry(name="present", path=present)` and delete the `"scotty_id"` and `"scotty_url"` lines of both expected dicts; replace `test_server_003_scotty_url` and the parametrized `test_server_003_no_scotty_url` by
```python
# REQ-SERVER-003
def test_server_003_no_scotty_fields(tmp_path: Path, fake: Fake) -> None:
    (tmp_path / "s").mkdir()
    client = make_client(tmp_path, [ProjectEntry(name="s", path=tmp_path / "s")])
    entry = client.get("/api/projects").json()[0]
    assert set(entry) == {"name", "path", "exists", "workflow", "beads"}
```
  Run `uv --directory backend run pytest -q`: the new `test_config_005_*` tests and `test_server_003_*` (the exact-dict one and `test_server_003_no_scotty_fields`) must FAIL (the fields still exist and are accepted).

- [ ] **Step 2: `config.py`.** Remove `from urllib.parse import urlparse`, the function `_is_http_url`, the field `scotty_base_url` with its `_http_url` validator (leave `host` and `port`), and the line `scotty_id: str | None = None` of `ProjectEntry`. `field_validator` stays imported (`ProjectEntry._absolute` uses it).

- [ ] **Step 3: projects.** In `projects/models.py` delete `scotty_id: str | None` and `scotty_url: str | None` from `Project`. Replace `projects/source.py` with
```python
"""Projects come from the console config; existence and state are checked on every call."""

from gin_console.config import ProjectEntry
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project


def build_project(entry: ProjectEntry, collector: Collector) -> Project:
    exists = entry.path.is_dir()
    workflow, beads = collector.get(entry.name, entry.path) if exists else (None, None)
    return Project(
        name=entry.name,
        path=str(entry.path),
        exists=exists,
        workflow=workflow,
        beads=beads,
    )
```
  In `projects/router.py` call `build_project(entry, collector)` (the lambda becomes `lambda entry: build_project(entry, collector)`); if `Settings` is no longer used there beyond the `build_router(settings: Settings)` signature, keep that import.

- [ ] **Step 4: `config.example.yaml`.** Delete the `scotty_base_url` line and the `scotty_id: scotty` line; keep the `scotty` project (name and path).

- [ ] **Step 5: validate.** `uv --directory backend run pytest -q`, `ruff check .`, `ruff format --check` on the touched files, `mypy` are green; `grep -rniE "scotty_(id|url|base_url)" backend/src config.example.yaml` prints nothing. The real-host check (a temporary copy of the owner's config without the `scotty_id` line loads; the real one as it is exits naming `scotty_id`; neither is edited) is run by the orchestrator, not the worker.

### Track 2: Frontend and deploy notes without Scotty
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-005, REQ-DEPLOY-002
- **Files**: modify `frontend/src/features/projects/{api.ts,ProjectCard.tsx,ProjectsPage.test.tsx,ProjectsPage.quota.test.tsx}`, `frontend/src/features/beads/{beadFixtures.ts,BeadsPage.test.tsx}`, `frontend/src/app/App.test.tsx`, `deploy/README.md`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the guard accepts a project without `scotty_*`; the project name is a link to `/beads?project=<name>` (encoded) without `target`; epic links unchanged; no `scotty_id`/`scotty_url` left under `frontend/src`; `deploy/README.md` has no Scotty sentence and no one-time command; the four frontend commands are green; independent review approved.
- **Estimated complexity**: low

Interfaces consumed: Track 1 JSON. Produced: `Project` without `scotty_id`/`scotty_url`.

- [ ] **Step 1: failing tests.** In the five test/fixture files delete the two lines `scotty_id: null,` and `scotty_url: null,` (`ProjectsPage.test.tsx` helper `project`, `ProjectsPage.quota.test.tsx`, `beadFixtures.ts`, `BeadsPage.test.tsx`, `App.test.tsx`). In `ProjectsPage.test.tsx` replace the two tests `REQ-UI-005 links the project name to Scotty in a new tab and each epic to the console` and `REQ-UI-005 links epics to the console and leaves the name plain without a Scotty URL` by
```tsx
  // REQ-UI-005
  it("REQ-UI-005 links the project name to its beads page and each epic to the bead page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ name: "scotty", beads })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "scotty" });
    const projectLink = within(card).getByRole("link", { name: "scotty" });
    expect(projectLink).toHaveAttribute("href", "/beads?project=scotty");
    expect(projectLink).not.toHaveAttribute("target");
    const epicLink = within(card).getByRole("link", { name: "e1" });
    expect(epicLink).toHaveAttribute("href", "/beads/scotty/e1");
  });

  // REQ-UI-005
  it("REQ-UI-005 encodes the project name in the project link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([project({ name: "a b" })])));
    render(<ProjectsPage />);
    const card = await screen.findByRole("article", { name: "a b" });
    expect(within(card).getByRole("link", { name: "a b" })).toHaveAttribute(
      "href",
      "/beads?project=a%20b",
    );
  });
```
  Run `pnpm -C frontend test --run`: the projects tests must FAIL (the guard still demands `scotty_*`, so the page shows an error instead of the cards).

- [ ] **Step 2: `api.ts`.** Remove `scotty_id: string | null;` and `scotty_url: string | null;` from `Project` and the four guard lines `"scotty_id" in value && ...` and `"scotty_url" in value && ...` of `isProject`.

- [ ] **Step 3: `ProjectCard.tsx`.** Delete the `MaybeLink` function and the `import type { ReactNode } from "react";` line (nothing else uses them). Replace the heading content by
```tsx
        <h2 className="font-medium">
          <Link
            to={`/beads?project=${encodeURIComponent(project.name)}`}
            className="underline underline-offset-2"
          >
            {project.name}
          </Link>
        </h2>
```
  (`Link` is already imported from `@/app/Link`.)

- [ ] **Step 4: `deploy/README.md`.** In the Tailscale section delete the line `tailscale serve --https=443 --set-path=/bd off     # remove the redundant /bd path` and, in the sentence after the code block, the text ` Scotty stays at \`/\`.` so it reads: `Prefix with \`sudo\` if your user is not the Tailscale operator.` Write no other command.

- [ ] **Step 5: validate.** The four frontend commands are green; `uv --directory backend run pytest -q` is green; `grep -rniE "scotty_(id|url)" frontend/src` prints nothing; `grep -rni scotty deploy config.example.yaml backend/src` shows only the `scotty` project entry of `config.example.yaml`.

## Integration
- **Branch**: `feat/gin-console-rm-beads-native` in the worktree `.planning/worktrees/gin-console-rm-beads-native`
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (backend and frontend)
- [ ] ruff, mypy, eslint, tsc, build clean
- [ ] Specs lint and trace clean; archive into the living specs
- [ ] Manual verification steps (given in the chat, never in the repo): remove `scotty_id: scotty` from `~/.config/gin-console/config.yaml`; rebuild the frontend and restart `gin-console`; open the Projects page and click a project name; optionally remove the stale Tailscale route to port 3000

## Notes
- Model guidance is planning metadata, not Beads state.
- The living specs change through `specs archive`, not by hand.
