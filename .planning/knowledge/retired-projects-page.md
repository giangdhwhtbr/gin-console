# Projects page retired; pages follow the switcher

**Context**
Once the project switcher in the sidebar and phone bar chose the current project (epic gin-console-rm-nav-shell), the Projects page at `/`, the "All projects" choice of Reports and the project select of My Tasks duplicated it. Epic gin-console-k4l (2026-11-23) removed them from both stacks.

**Decision/Solution**
- **Landing (replaced on 2026-11-25 by the Overview, see [overview-page](overview-page.md)):** `/` rendered `frontend/src/app/HomeRedirect.tsx`, which shows "Loading…" and then replaces the address with `/my-tasks?project=<current>` (`resolveProject` of `?project=`, tab, favorite, first), or `/my-tasks` with no configured project, without a history entry (REQ-UI-099). The Main navigation has four links, Beads, My Tasks, Milestones and Reports, each with `?project=`.
- **Reports and My Tasks** read only the current project and have no project select. `project=all` is the retired Reports value: `isUnknownProject` lets it through and the page resolves it to the current project. `switchProject` keeps `view`, `closed`, `tab`, `days` and `q`, so on My Tasks a project change drops `milestone`.
- **My Tasks** has no Project column. An empty list says "No tasks assigned to <email>" and links "Open the Beads page" to `/beads?project=<current>` (REQ-UI-100).
- **Backend:** `GET /api/projects` and its `Collector`, `collect_workflow`, `build_project` and the `Project`, `Workflow`, `Workspace`, `WorkspaceRepo` and `Team` models are gone. `/api/projects/beads` (REQ-SERVER-010) stays, with `Epic.workflow` always null. `collect_epic_workflow`, `run_json` and `CollectError` stay in `projects/collect.py`. Reports lost `ALL`, `ProjectError` and `Report.errors`, so `/api/reports?project=all` answers 404.
- **Origin:** `origin.ts` has no `projects` kind. `rememberOrigin` takes a project, or null for the Overview.
- **Bugs found on the way:**
  - The phone top bar overflowed 360px with a long project name. The bar switcher is now `min-w-0 shrink`, and the brand word is `max-sm:sr-only`.
  - `cn` dropped `text-primary-foreground` next to the custom size `text-13`. `frontend/src/lib/utils.ts` builds `cn` with `createCn` and a `font-size` class group for `13`.
  - The light `--identity-wash` is now #F4F0FC, so the selected row reaches 4.5:1.

**Consequences**
- **Custom font sizes:** a size added to `@theme` must also be added to the `createCn` `font-size` group. Otherwise `cn` treats `text-<n>` as a colour and silently removes the real text colour (`lib/utils.test.ts`).
- **Reused case IDs:** gin-qa reused the IDs of deleted cases for new ones: TC-UI-047, 048, 137 to 140 and 151, and TC-SERVER-012. Evidence older than 2026-11-23 under those IDs belongs to the retired cases.
- **Cases can be wrong:** a case can contradict its living spec. TC-UI-145 expected an Owner fact that REQ-UI-110 forbids. When an e2e spec fails on a case expectation, read `docs/specs` before filing a product defect.
- **Readability data:** the readability specs (`readability.spec.ts`, TC-UI-144, 147 and 153 to 155) share their example data and `stubExample` from `qa/e2e/support/example.ts`; `show` lives in `support/readability.ts`.
- **Deploy and Docker REQs:** under `standard` rigor, `gin specs trace` reports a modified `REQ-DEPLOY-*` or `REQ-DOCKER-*` as missing until `05-tests.md` has a row for it, even when only a scenario's wording changed.
  - Docker run (TC-3): build with `GIN_WORKFLOW_REF=v3.5.0`. Use a temporary `docker-compose.override.yml` that mounts the projects, `/home/gin/gin-fam` and `/home/gin/gin-beads`, because every `.beads` is a symlink into `~/gin-beads`. Stop the systemd service, run `docker compose up -d` and `scripts/docker-smoke.sh`, then `docker compose down` and start the service again.
  - Tailnet check: `tailscale serve` maps `https://instance-20260515-2304.tail5ca54e.ts.net:8443` to `127.0.0.1:8700`.
- **TC scripts outside the repo:** load Playwright with `NODE_PATH=/home/gin/gin-fam/gin-console/node_modules/.pnpm/playwright@1.64.1/node_modules`; `/home/gin/scotty` no longer exists.

**References**
- Change: `docs/changes/archive/2026-11-23-gin-console-k4l-retire-projects/`.
- Evidence:
  - TC-1: `qa/evidence/2026-11-23-k4l-tc1/` (52/52).
  - TC-2 and TC-3: `qa/evidence/2026-11-23-k4l-tc2/`.
  - e2e runs: `qa/evidence/2026-11-23T03-27-52`, `2026-11-23T03-45-40`.
  - api runs: `qa/evidence/2026-11-23T03-32-23-api`, `2026-11-23T03-46-49-api`.
- Beads: gin-console-k4l, tracks .1 to .7 and bugs .8 and .9.
- Related: [navigation-shell](navigation-shell.md), [project-card-health](project-card-health.md), [strung-visual-system](strung-visual-system.md).

**Scope**
The landing address, the Main navigation, the Reports and My Tasks project handling, the projects and reports APIs, `cn` and custom Tailwind sizes, gin-qa case IDs, and deploy and Docker checks.
