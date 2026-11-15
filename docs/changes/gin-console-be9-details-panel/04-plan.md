# Plan: Details panel only while a bead is selected

Epic: gin-console-be9
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder.

## Objective
From 1024px, the List view, the Graph view and the Dependencies page show the details panel only while a bead is selected. The content takes the full width otherwise. A "Close details" button and Escape clear the selection and return focus to the row or node:
- In the List view, Escape on a row clears the selection, and the search box keeps its Escape.
- In graphs, the first Escape returns to the scope bead and the second sets `select=none`.

Every scenario of the 4 MODIFIED REQs has a test naming its REQ. `gin-qa cases check --change gin-console-be9` prints `ok`. TC-1 passes on the deployed console.

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
- **Problem statement:** the empty details panel ("Select a bead to see its details") takes two fifths of the List view and a third of the graph from 1024px, and gives the user nothing.
- **Success criteria:**
  - Everything in the Objective.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-be9 --against master` prints `ok`, and `gin specs trace --change gin-console-be9` lists no missing REQ.
- **Global constraints** (from the spec):
  - Frontend only. No API change and no new dependency.
  - The selection stays in the URL (`select`) and is changed with `replace: true`.
  - `select=none` is reserved in the Graph view and on the Dependencies page. It means nothing is selected, with no fallback to the scope bead. A missing `select` keeps today's fallback (the scope bead, or nothing on the project scope).
  - The panel shows only while a bead is selected. The grid has two columns only then.
  - "Close details" (`aria-label`) and Escape clear the selection, then focus the row (`[role="treeitem"][data-id=…]`) or node (`[data-node=…]`) that was selected. If it is gone, focus goes to the first row or the canvas tab stop.
  - List Escape works only on tree rows. The search box keeps REQ-UI-037.
  - In graphs, Escape first returns to the scope bead when another node is selected (unchanged). Otherwise it sets `select=none`.
  - Under 1024px nothing changes, and no animation is added.
  - Read-only. New and changed tests carry their REQ-ID.
- **Non-goals:**
  - Panel content or scrolling changes.
  - A resizable panel.
  - Animation.

## Approach Options
### Option 1: a shared `DetailsPanel` component rendered only while a bead is selected
- **Summary:** extract the repeated `<aside>` into `DetailsPanel.tsx` with a close button. Each view renders it conditionally and toggles its grid columns.
- **Pros:** one place for the panel markup and the close button. Each view keeps its own selection logic.
- **Cons:** three call sites change.

### Option 2: hide the empty panel with CSS only
- **Pros:** a tiny diff.
- **Cons:**
  - The grid columns stay, so the content does not widen.
  - There is no close button and no Escape.
  - It does not meet the spec.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-15 (`03-design.md`).

## Scope
- **In scope:**
  - `frontend/src/features/beads/DetailsPanel.tsx` (new), with its test;
  - `ListView.tsx`, `treeKeys.ts`, `GraphView.tsx`, `GraphPage.tsx`, with their tests;
  - QA cases;
  - `05-tests.md`.
- **Out of scope:**
  - the bead page;
  - Board and Focus (they have no panel);
  - the milestone Gantt.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (DetailsPanel and the List view) and Track 3 (QA cases) share no file and run together; Track 2 (Graph view and Dependencies page) reuses Track 1's DetailsPanel and waits for it; Track 4 checks the merged branch.
```

## Tasks

### Track 1: DetailsPanel and the List view
- **Dependencies**: none
- **Requirements**: REQ-UI-045
- **Files**:
  - Create `frontend/src/features/beads/DetailsPanel.tsx` and `DetailsPanel.test.tsx`.
  - Modify `frontend/src/features/beads/ListView.tsx`:
    - lines 75 and 125-136: the grid columns only while selected, and render `DetailsPanel`;
    - around line 104: the `treeKeyDown` actions gain `clear`.
  - Modify `frontend/src/features/beads/treeKeys.ts`, lines 7-23 and the switch: an optional `clear` action, called on Escape.
  - Test `ListView.test.tsx`, `ListKeys.test.tsx`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded component extraction plus conditional layout and one key, with written scenarios. Focus return after closing needs care.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-045, new and existing, has a passing test naming the REQ.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces produced (Track 2 consumes `DetailsPanel`):
```tsx
// DetailsPanel.tsx
export function DetailsPanel(props: {
  project: string;
  id: string;
  graphScope?: string | null;   // passed through to BeadDetailPage (as GraphPage/GraphView do today)
  note?: string;                // e.g. "Not in the current list"
  className?: string;           // extra classes, e.g. "hidden lg:block" in the List view
  onClose: () => void;          // the caller clears the selection and returns focus
}): JSX.Element;
// renders <aside aria-label="Bead details" tabIndex={0} className={cn("min-w-0 rounded border p-3", SIDE_PANEL, className)}>
//   a header row with <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X aria-hidden /></Button>
//   the note when given, then <BeadDetailPage key={`${project}/${id}`} project={project} id={id} embedded graphScope={graphScope} />

// treeKeys.ts
export function treeKeyDown(
  event: KeyboardEvent<HTMLElement>,
  actions: { toggle: (id: string, open: boolean) => void; select: (id: string) => void; clear?: () => void },
): void; // case "Escape": when actions.clear exists, preventDefault and call it
```

Steps:
1. **`DetailsPanel.test.tsx`** (REQ-UI-045). Check four things:
   - the panel renders the landmark "Bead details";
   - it has a button named "Close details" that calls `onClose`;
   - it shows the note when one is given;
   - it embeds the bead, with the fetch stubbed as in `BeadDetailPage.test.tsx`.
   
   Run `pnpm -C frontend test --run src/features/beads/DetailsPanel.test.tsx` and expect it to fail. Implement, then run it again and expect it to pass.
2. **`ListView.test.tsx`** (REQ-UI-045). Cover these scenarios:
   - "Nothing selected": there is no "Bead details" landmark, and the grid container has no `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` class.
   - "Select a row": the panel shows.
   - "Close the panel": `onChange` is called with `select: ""`, and focus moves to `[role="treeitem"][data-id="t-1"]`. Rerender with the new filters to check the focus.
   - "Escape closes the panel": Escape on the focused row calls `onChange` with `select: ""`.
   - "Escape in the search box": this lives in `ListKeys.test.tsx`, because the search box lives in BeadsView. Escape clears the text and leaves `select`.
3. **Implement `ListView`:**
   - The grid class is `cn("grid gap-4", filters.select !== "" && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")`.
   - Render `DetailsPanel` with `className="hidden lg:block"`. Keep today's `hidden lg:block` behaviour: below lg a click opens the bead page, so the panel never shows there.
   - `onClose` remembers the id, calls `onChange({ ...filters, select: "" })`, then focuses `[data-id=…]` in a `requestAnimationFrame` or a `useEffect` keyed on the cleared selection. Fall back to the first treeitem.
   - Pass `clear: close` to `treeKeyDown`. Clearing only applies while something is selected.
4. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build`. Expect all to pass. Commit with `git commit -m "feat(beads): List details panel only while a bead is selected (gin-console-be9)"`.

### Track 2: Graph view and Dependencies page
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-051, REQ-UI-052, REQ-UI-106
- **Files**:
  - Modify `frontend/src/features/beads/GraphView.tsx`:
    - line 52: the grid columns;
    - line 93: `onEscape`;
    - lines 97-103: the panel uses `DetailsPanel`;
    - the selection: `select=none`.
  - Modify `frontend/src/features/beads/GraphPage.tsx`:
    - line 52: the grid columns;
    - line 112: `onEscape`;
    - lines 131-137: the panel uses `DetailsPanel`;
    - lines 25-26: `select` handling of `none`.
  - Test `GraphView.test.tsx`, `GraphPage.test.tsx`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded changes in two views with the same rules. The fallback to the scope bead and the two-step Escape need care.
- **Acceptance criteria**:
  - Every new and changed scenario of REQ-UI-051, REQ-UI-052 and REQ-UI-106 has a passing test naming its REQ.
  - The four frontend checks pass.
- **Estimated complexity**: medium

Interfaces consumed: `DetailsPanel` from Track 1.

Rules for both views:
```ts
// asked = the select value from the URL ("" when absent)
// selected = asked === "none" ? "" : asked !== "" && (known.has(asked) || asked === scopeId) ? asked : focus   // focus = scope id or ""
// panel open = selected !== ""
// onEscape: selected !== "" && selected !== focus ? choose(focus || "none") : choose("none")
//   where choose(x) writes select=x (GraphView via onChange; GraphPage via navigate(..., {replace:true})), and "" focus on the project scope means "none"
// onClose: choose("none") then focus the node [data-node="<old>"] or the canvas tab stop
```

Steps:
1. **`GraphView.test.tsx`** (REQ-UI-106, REQ-UI-051, REQ-UI-052). Cover these scenarios:
   - "No panel on the project scope": with milestone `all` and no `select`, there is no "Bead details" landmark.
   - Milestone scope `m2` with no `select`: the panel shows `m2`.
   - "Close the panel": calls `onChange` with `select: "none"`. Rerendering with `select: "none"` shows no panel and focuses the node.
   - "Escape" from `e1`: calls `onChange` with `select: "m2"`.
   - "Second Escape" with `m2` selected: calls `onChange` with `select: "none"`.
   
   Implement.
2. **`GraphPage.test.tsx`** (REQ-UI-051, REQ-UI-052). Cover these scenarios:
   - "Project page": there is no panel.
   - "Close the panel" on the page of epic `e-1`: the URL becomes `?select=none` and there is no panel.
   - A reload with `?select=none` keeps no panel.
   - "Second Escape" from `e-1` selected gives `?select=none`.
   - Keep the existing "Escape" test, where another node goes back to the viewed bead.
   
   Implement.
3. Run the four frontend checks and expect all to pass. Commit with `git commit -m "feat(beads): graph details panel only while a bead is selected (gin-console-be9)"`.

### Track 3: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106
- **Files**: cases under `qa/cases/ui/`: new ones, plus updated and re-pinned stale ones.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-be9` prints `ok`.
  - `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. Record the output of `gin-qa cases check`. Then run `gin-qa cases plan --change gin-console-be9 --format json`.
2. Add one e2e case per new or changed scenario. Each case has concrete URLs (`/beads?project=alpha&milestone=all`), one action per step, and Expected stated as the scenario states it.
3. Update the stale cases and re-pin them. The cases that expected "Select a bead to see its details" now expect no panel.
4. Repeat until the check prints `ok` with no new finding. Commit with `git commit -m "test(qa): cases for the details panel only while selected (gin-console-be9)"`.

### Track 4: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106
- **Files**: modify `docs/changes/gin-console-be9-details-panel/05-tests.md` with the TC-1 result.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and walk TC-1 with Playwright. The user delegated manual validation on 2026-11-15.
- **Acceptance criteria**: TC-1 is recorded as `pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-be9-tc1)`.
- **Estimated complexity**: low

Steps:
1. Deploy from the main checkout on `feat/gin-console-be9-details-panel`:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/projects` should print `200`.
   
   Report the rollback command.
2. Write and run a Playwright script at 1440×900 against the example project.
   - Measure the List rows' width without and with a selection. With no selection, the widest row reaches the content width minus the padding.
   - Walk every clause of TC-1, and capture screenshots of each open and closed state into `qa/evidence/<date>-be9-tc1/`.
3. Record TC-1 in `05-tests.md` and commit with `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-be9)"`.

## Integration
- **Branch**: `feat/gin-console-be9-details-panel`
- **Merge strategy**: parallel-then-merge. Tracks 1 and 3 merge in any order, Track 2 follows Track 1, and Track 4 checks the merged branch.

## Validation
- [ ] Frontend test, typecheck, lint and build pass
- [ ] `gin specs lint --change gin-console-be9 --against master` prints `ok`, and `gin specs trace --change gin-console-be9` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-be9` prints `ok`
- [ ] TC-1 passes on the deployed console

## Notes
- The Parent Bead `gin-console-be9` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval. Ship merges locally and then pushes `master`.
