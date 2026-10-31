# Plan: Milestones page lists epics outside any milestone

Epic: gin-console-l69
Spec: `docs/changes/gin-console-l69-unassigned-epics/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`, `05-tests.md`)

## Objective
Below the milestones, the Milestones page lists every epic without a parent, with its state, id, linked title, priority, and labels. The heading count equals the rows. A "Show closed" checkbox adds closed epics. The `unassigned_epics` sentence is gone.

**Goal:** every scenario of the added REQ-MILESTONE-UI-010 and of the modified REQ-MILESTONE-UI-001 has a passing test that names its REQ-ID, and the four verify commands pass.

**Architecture:** frontend only, in `frontend/src/features/milestones/`.
- `UnassignedEpics.tsx` is new. It holds the pure `unassignedEpics(beads, showClosed)` and the `UnassignedEpics` section, which loads beads through `useBeads(project, showClosed)` from `features/beads`.
- In `MilestonesPage.tsx`, `MilestoneTable` drops the `unassigned_epics` sentence and renders `<UnassignedEpics project={project} />` after the milestone list.
- The `stubMilestones` test helper accepts a handler for `/api/beads` as well as a fixed list.

**Tech Stack:** React 19, TypeScript, Tailwind 4, vitest and Testing Library (`@testing-library/user-event` installed). No new dependency.

**Global Constraints (verbatim from the spec):**
- Changing gin-workflow's `unassigned_epics` or the `milestone list` JSON.
- A new backend endpoint; the section reuses `GET /api/beads`.
- Assigning an epic to a milestone from the console (read-only; the section shows the `/roadmap --milestone <id>` hint instead).
- Listing child epics of other epics: they follow their parent epic.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- Problem statement: the Milestones page shows only a count of roadmap epics outside milestones, from gin-workflow. It does not say which epics they are, and it skips epics without the `roadmap` label.
- Success criteria: the page lists each parent-less epic with a link to it. The heading count equals the rows. "Show closed" adds closed epics. A failure to load beads stays inside the section.
- Constraints: read-only (ADR-0001). No backend or gin-workflow change. Reuse `useBeads`, `StateMark` and `Badge`.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: Derive the list in the frontend from `GET /api/beads`
- Summary: filter the beads that `useBeads` already loads by `issue_type === "epic"` and `parent === null`.
- Pros: one new component and no API change; the count is the list length, so the two cannot differ.
- Cons: the console's definition can differ from what `gin-workflow milestone list` prints, which counts only roadmap epics.

### Option 2: gin-workflow returns the list (schema 2)
- Summary: `milestone list --json` adds the epics, and the console reads the new schema.
- Pros: one source of truth.
- Cons: a cross-repo epic, a schema bump, and two schemas to read, all for one UI section.

### Recommended Approach
- Selected option: Option 1. The user confirmed it in discuss.
- Rationale: the data is already loaded, and the change stays in one feature folder.

## Scope
- In scope: `UnassignedEpics.tsx` and its test, the `MilestonesPage.tsx` edit and its tests, `stubMilestones` in `milestoneFixtures.ts`, and the manual case in `05-tests.md`.
- Out of scope: the backend, the `MilestoneList` type and parser (`unassigned_epics` stays), gin-workflow, and the other milestone pages.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Two tracks; Track 2 is a manual check of Track 1's UI, so nothing runs in parallel.
```

## Tasks

### Track 1: Epics not in a milestone section
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-010
- **Files**:
  - Create `frontend/src/features/milestones/UnassignedEpics.tsx`
  - Test `frontend/src/features/milestones/UnassignedEpics.test.tsx`
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:76-86` (drop the `unassigned_epics` sentence and render the section)
  - Modify `frontend/src/features/milestones/milestoneFixtures.ts:57-68` (`stubMilestones` accepts a beads handler)
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx:12-16,43-46` (replace the count test and add the section tests)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded change to one feature folder against a clear spec, with the code given below. It needs care with the async test flow, and no design judgement.
- **Acceptance criteria**: every REQ-MILESTONE-UI-010 scenario and the modified REQ-MILESTONE-UI-001 scenario "unassigned count not shown" has a passing test named with its REQ-ID. `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: low

- [ ] **Step 1: Let `stubMilestones` take a beads handler.** In `milestoneFixtures.ts`, change the signature and the `/api/beads` branch. Existing callers pass an array and keep working:
  ```ts
  /** Stub `fetch`: `/api/projects` lists "alpha", `/api/milestones…` goes to `handler`, `/api/beads` returns `beads` (or what `beads(url)` answers). */
  export function stubMilestones(
    handler: (url: URL) => Response | Promise<Response>,
    beads: BeadSummary[] | ((url: URL) => Response) = [],
  ) {
    ...
      if (url.pathname === "/api/beads") return Promise.resolve(typeof beads === "function" ? beads(url) : json(beads));
    ...
  }
  ```

- [ ] **Step 2: Write the failing unit test** `UnassignedEpics.test.tsx`:
  ```tsx
  import { describe, expect, it } from "vitest";
  import { bead } from "@/features/beads/beadFixtures";
  import { unassignedEpics } from "./UnassignedEpics";

  describe("unassignedEpics", () => {
    const beads = [
      bead("e-b", { issue_type: "epic", priority: 2 }),
      bead("e-a", { issue_type: "epic", priority: 2, labels: ["roadmap"] }),
      bead("e-p0", { issue_type: "epic", priority: 0 }),
      bead("e-in", { issue_type: "epic", parent: "m-1" }),
      bead("e-child", { issue_type: "epic", parent: "e-a" }),
      bead("t-1", { issue_type: "task" }),
      bead("e-done", { issue_type: "epic", status: "closed" }),
    ];

    it("REQ-MILESTONE-UI-010 keeps open parent-less epics, by priority then id", () => {
      expect(unassignedEpics(beads, false).map((b) => b.id)).toEqual(["e-p0", "e-a", "e-b"]);
    });

    it("REQ-MILESTONE-UI-010 adds closed epics when asked", () => {
      expect(unassignedEpics(beads, true).map((b) => b.id)).toEqual(["e-p0", "e-a", "e-b", "e-done"]);
    });
  });
  ```
  Run `pnpm -C frontend test --run src/features/milestones/UnassignedEpics.test.tsx`. Expected: it fails because `./UnassignedEpics` does not exist.

- [ ] **Step 3: Create `UnassignedEpics.tsx`:**
  ```tsx
  import { useState } from "react";
  import { Link } from "@/app/Link";
  import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import type { BeadSummary } from "@/features/beads/api";
  import { StateMark } from "@/features/beads/StateMark";
  import { useBeads } from "@/features/beads/useBeads";
  import { cn } from "@/lib/utils";

  const enc = encodeURIComponent;

  /** REQ-MILESTONE-UI-010: epics without a parent. An epic in a milestone has it as parent; a child epic follows its parent epic. */
  export function unassignedEpics(beads: BeadSummary[], showClosed: boolean): BeadSummary[] {
    return beads
      .filter((b) => b.issue_type === "epic" && b.parent === null && (showClosed || b.status !== "closed"))
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  /** REQ-MILESTONE-UI-010: loads on its own, so a beads failure leaves the milestones above untouched. */
  export function UnassignedEpics({ project }: { project: string }) {
    const [showClosed, setShowClosed] = useState(false);
    const { state, retry } = useBeads(project, showClosed);
    // filtering on `showClosed` too hides closed rows at once, before the refetch answers
    const rows = state.status === "ok" ? unassignedEpics(state.beads, showClosed) : [];
    return (
      <section aria-labelledby="unassigned-epics" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="unassigned-epics" className="font-semibold">
            {state.status === "ok" ? `Epics not in a milestone (${rows.length})` : "Epics not in a milestone"}
          </h2>
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm">
            <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} className="rounded border" />
            <span>Show closed</span>
          </label>
        </div>
        {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading epics…</p>}
        {state.status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Epics couldn't be loaded</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>{state.message}</span>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {state.status === "ok" && state.error !== null && (
          <p role="status" className="text-sm text-destructive">{`Refresh failed: ${state.error}`}</p>
        )}
        {state.status === "ok" &&
          (rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every epic is in a milestone.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{"Add them with /roadmap --milestone <id>."}</p>
              <ul aria-label="Epics not in a milestone" className="flex flex-col divide-y rounded border bg-card">
                {rows.map((epic) => (
                  <li
                    key={epic.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm",
                      epic.status === "closed" && "text-muted-foreground",
                    )}
                  >
                    <StateMark bead={epic} />
                    <span className="font-mono text-xs text-muted-foreground">{epic.id}</span>
                    <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="min-w-0 truncate font-medium underline-offset-2 hover:underline">
                      {epic.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{`P${epic.priority}`}</span>
                    {epic.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </li>
                ))}
              </ul>
            </>
          ))}
      </section>
    );
  }
  ```
  Run the unit test again. Expected: 2 passed.

- [ ] **Step 4: Write the failing page tests.** In `MilestonesPage.test.tsx`:
  1. Let `open` take beads: `function open(body: Response, beads: Parameters<typeof stubMilestones>[1] = [])` and pass `beads` to `stubMilestones(() => body, beads)`. Import `bead` from `@/features/beads/beadFixtures`, `userEvent` from `@testing-library/user-event`, and `waitFor`.
  2. Replace the test "REQ-MILESTONE-UI-001 shows the epics not yet in a milestone" with:
  ```tsx
  it("REQ-MILESTONE-UI-001 does not show the unassigned_epics count", async () => {
    open(json(list([entry("m-1", { title: "Beta" })], { unassigned_epics: 4 })));
    await rowOf("Beta");
    expect(screen.queryByText(/roadmap epics? (isn't|aren't) in a milestone/)).toBeNull();
  });
  ```
  3. Add:
  ```tsx
  const epic = (id: string, overrides: Parameters<typeof bead>[1] = {}) => bead(id, { issue_type: "epic", title: `Epic ${id}`, ...overrides });

  it("REQ-MILESTONE-UI-010 lists the epics without a parent, with links and a matching count", async () => {
    open(json(list([entry("m-1")])), [
      epic("e-a", { labels: ["roadmap"] }),
      epic("e-b"),
      epic("e-c", { parent: "m-1" }),
      epic("e-d", { parent: "e-a" }),
      bead("t-1", { title: "Task t-1" }),
    ]);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (2)" })).toBeInTheDocument();
    const section = within(screen.getByRole("list", { name: "Epics not in a milestone" }));
    expect(section.getAllByRole("listitem")).toHaveLength(2);
    expect(section.getByRole("link", { name: "Epic e-a" })).toHaveAttribute("href", "/beads/alpha/e-a");
    expect(section.getByRole("link", { name: "Epic e-b" })).toHaveAttribute("href", "/beads/alpha/e-b");
    expect(section.getByText("roadmap")).toBeInTheDocument();
    expect(screen.getByText("Add them with /roadmap --milestone <id>.")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-010 Show closed fetches closed beads and lists closed epics dimmed", async () => {
    const fetchMock = stubMilestones(() => json(list([entry("m-1")])), [epic("e-a"), epic("e-e", { status: "closed" })]);
    window.history.replaceState(null, "", "/milestones?project=alpha");
    render(<MilestonesPage />);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (1)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (2)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Epic e-e" }).closest("li")).toHaveClass("text-muted-foreground");
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/beads?project=alpha&closed=1"))).toBe(true),
    );
  });

  it("REQ-MILESTONE-UI-010 says every epic is in a milestone when none is left", async () => {
    open(json(list([entry("m-1")])), [epic("e-c", { parent: "m-1" })]);
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (0)" })).toBeInTheDocument();
    expect(screen.getByText("Every epic is in a milestone.")).toBeInTheDocument();
  });

  it("REQ-MILESTONE-UI-010 a beads failure stays in the section and Retry refetches", async () => {
    let fail = true;
    open(json(list([entry("m-1", { title: "Beta" })])), () => (fail ? json({ error: "bd failed" }, 502) : json([epic("e-a")])));
    expect(await screen.findByText("Epics couldn't be loaded")).toBeInTheDocument();
    expect(await rowOf("Beta")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Epics not in a milestone (1)" })).toBeInTheDocument();
  });
  ```
  Run `pnpm -C frontend test --run src/features/milestones/MilestonesPage.test.tsx`. Expected: the new REQ-MILESTONE-UI-010 tests fail because there is no section, and the REQ-MILESTONE-UI-001 count test fails because the sentence is still shown.

- [ ] **Step 5: Wire the section into `MilestonesPage.tsx`.**
  - Import `UnassignedEpics` from `./UnassignedEpics`.
  - In `MilestoneTable`, change `const { milestones, unassigned_epics: unassigned, today } = state.data;` to `const { milestones, today } = state.data;`.
  - Delete the `{unassigned > 0 && (<p …>…</p>)}` block.
  - After the closing `)}` of the `rows.length === 0 ? … : <ul …>` expression, inside the outer `div`, add `<UnassignedEpics project={project} />`.
  - Keep the `plural` import: `Row` still uses it for warnings.
  Run the page tests again. Expected: all pass.

- [ ] **Step 6: Verify.** Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`. Expected: all exit 0. Commit on the feature branch: `feat(milestones): list epics not in a milestone (gin-console-l69)`.

### Track 2: Look at it in a browser
- **Dependencies**: Track 1
- **Requirements**: REQ-MILESTONE-UI-010 (manual evidence)
- **Files**:
  - Modify `docs/changes/gin-console-l69-unassigned-epics/05-tests.md` (TC-1 evidence)
- **Provider role**: `frontend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** the agent only prepares the run and records what the person reports.
- **Human gate**: a person with a browser runs the built console against a real project. They compare the section with `bd list --type epic --no-parent`, first with open epics only and then with "Show closed". They open a title link and check the page on a laptop and a phone, in light and dark themes. The agent has no browser, so `/goal` stops before this track.
- **Acceptance criteria**: TC-1 in `05-tests.md` has the person's evidence, or "not run: <reason>".
- **Estimated complexity**: low

- [ ] **Step 1: Prepare the run.** Run `pnpm -C frontend build`, then `uv run --directory backend -m gin_console`, and open `http://127.0.0.1:8700/milestones`. Print `bd -C <project> list --type epic --no-parent --json` and `bd -C <project> list --type epic --no-parent --all --json` for the person to compare against.
- [ ] **Step 2: Record.** Write what the person reports in TC-1's evidence column (for example "ok, laptop + phone, light + dark, 2026-11-02, project gin-console"), or "not run: <reason>".

## Integration
- **Branch**: `feat/gin-console-l69-unassigned-epics`, cut from `spec/gin-console-l69-unassigned-epics`, which holds the change folder.
- **Merge strategy**: sequential. Track 1, then Track 2.

## Validation
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` pass.
- [ ] `gin-workflow specs trace --change gin-console-l69` reports no `missing` REQ.
- [ ] TC-1 is recorded in `05-tests.md`.

## Notes
- `Model:` and `Effort:` come from the main harness catalog (`haiku`, `sonnet`, `opus`; `low`..`max`), chosen with the route rubric.
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- The Parent Bead `gin-console-l69` stays open until the human-confirmed merge. Track beads close when their tests and review pass, so that dependents unblock.
- The backend is untouched, so the backend verify commands are not needed. The pre-push hook still runs them.
