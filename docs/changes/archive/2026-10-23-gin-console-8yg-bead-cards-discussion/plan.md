# Plan: Bead cards and discussion on beads

Epic: gin-console-8yg
Spec: `docs/changes/gin-console-8yg-bead-cards-discussion/` (`proposal.md`, `spec-delta.md`, `design.md`, `tests.md`)

## Objective
One card language on the Board, Focus, List and Tree (state icon, word and edge; coloured type pill; comment and dependency indicators only above 0), In progress moved to blue, and a Discussion area on the bead page (sticky side column from 1024px with Hide/Show, tabs below that and in the embedded panel, each comment a block of its own).

**Goal:** REQ-UI-064 to 071 and the modified REQ-UI-031, 039, 040, 059 pass their scenarios.
**Architecture:** three small shared components (`StateMark`, `TypeBadge`, `CountBadge`) extracted or added in `features/beads/`; a tiny external store for the hidden state of the discussion; `BeadDetailPage` lays out details and discussion in one DOM and lets Tailwind breakpoints choose side column or tabs.
**Tech Stack:** React 19, TypeScript 6, Tailwind 4, lucide-react, vitest + Testing Library (all installed). No new dependency.

**Global Constraints (verbatim from the spec):**
- Frontend only, in `frontend/src/features/beads/` and `frontend/src/index.css`. No backend change, no new dependency.
- Non-goals: writing or editing comments, markdown or avatars in comments, unread markers, the bug and reopen indicators (epic gin-console-le3), the "View dependencies" button and the per-bead graph (epic gin-console-s77), merging the List and Tree views (epic gin-console-3yc), the Beads filters (epic gin-console-r4m).
- Storage that throws is ignored: the Hide control still works for the visit.
- Colours (light / dark): `--state-progress` `#1d4ed8` / `#93c5fd`; `--type-epic` `#7e22ce` / `#c084fc`; `--type-bug` `#b91c1c` / `#f87171`; `--type-feature` `#be185d` / `#f472b6`; each at least 4.5:1 as text on background, card and muted, and on its own 8% tint.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: cards say nothing at a glance, the graph node and the Board card look unrelated, and comments sit faded at the bottom of the bead page.
- Success criteria: a card shows state, type, comments and dependencies without opening it; an epic in progress does not show two near hues; comments can be read beside the fields on a laptop and one tap away on a phone; `pnpm -C frontend typecheck`, `lint`, `test --run`, `build` pass.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Shared components, one DOM with breakpoint classes (chosen)
- Summary: `StateMark`, `TypeBadge`, `CountBadge` used by every card form; the bead page renders details and discussion once and CSS picks column or tabs.
- Pros: one source for state and type looks, no width measuring in JS, tests see the same DOM at every width.
- Cons: jsdom cannot check which form is visible, so layout is verified by the manual cases.

### Option 2: Separate components per width and `useMediaQuery`
- Summary: render a column component or a tab component by window width.
- Pros: each form is easy to read alone.
- Cons: repeated markup, JS measuring, flicker, tests must fake the window size.

### Recommended Approach
- Selected option: 1.
- Reasoning: same choice as the shell (one navigation element); smaller and testable.

## Scope
- In scope: `frontend/src/index.css`, `frontend/src/features/beads/` (new `StateMark.tsx`, `TypeBadge.tsx`, `CountBadge.tsx`, `DetailTabs.tsx`, `DiscussionPanel.tsx`, `discussion.ts`; edits to `GraphNode.tsx`, `BeadCard.tsx`, `BeadTable.tsx`, `TreeRow.tsx`, `CommentList.tsx`, `BeadDetailPage.tsx` and the tests that name the old text), `frontend/src/app/tokens.test.ts`.
- Out of scope: see Global Constraints.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three code tracks that build on each other in one feature folder, then one track that only a person with a browser can finish; no independent parallel work.
```

## Tasks

### Track 1: Colour tokens and the shared badges
- **Dependencies**: none
- **Requirements**: REQ-UI-059, REQ-UI-064, REQ-UI-066, REQ-UI-067
- **Files**: modify `frontend/src/index.css`, `frontend/src/app/tokens.test.ts`, `frontend/src/features/beads/GraphNode.tsx`; create `frontend/src/features/beads/StateMark.tsx`, `TypeBadge.tsx`, `CountBadge.tsx` and `StateMark.test.tsx`, `TypeBadge.test.tsx`, `CountBadge.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the new and changed tokens pass the contrast tests in both themes, the three components behave as the tests say, and the graph node looks the same except that its state line now comes from `StateMark` and its edge from `stateEdge`.
- **Estimated complexity**: medium

**Interfaces produced** (exact):
```ts
// StateMark.tsx
export function stateEdge(state: GraphState): string;               // "border-l-4 border-l-state-<x>"
export function StateMark(props: { bead: BeadSummary; className?: string }): JSX.Element; // icon + name, data-state
// TypeBadge.tsx
export function TypeBadge(props: { type: string; className?: string }): JSX.Element;      // data-type
// CountBadge.tsx
export function CountBadge(props: { kind: "comments" | "dependencies"; count: number }): JSX.Element | null;
```
Tailwind colours added: `type-epic`, `type-bug`, `type-feature`.

- [ ] **Step 1: Failing tests.** In `tokens.test.ts` add, next to `STATUS`: `const TYPES = ["type-epic", "type-bug", "type-feature"] as const;`; add `...TYPES` to the "every token is defined" list and to the `text` list of the 4.5:1 test; add this helper and test:
```ts
function blend(fg: string, bg: string, alpha: number): string {
  const channel = (i: number) =>
    Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
```
and inside the `describe.each` block:
```ts
  it(`REQ-UI-067 ${name}: a type colour reads on its own 8% tint over every surface`, () => {
    for (const surface of SURFACES) {
      for (const type of TYPES) {
        const tint = blend(get(type), get(surface), 0.08);
        expect(ratio(get(type), tint), `${type} on its tint over ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
```
`frontend/src/features/beads/CountBadge.test.tsx`:
```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CountBadge } from "./CountBadge";

afterEach(cleanup);

describe("CountBadge", () => {
  it("REQ-UI-066 draws nothing for 0", () => {
    const { container } = render(<CountBadge kind="comments" count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-UI-066 labels the comment count", () => {
    render(<CountBadge kind="comments" count={3} />);
    expect(screen.getByRole("img", { name: "3 comments" })).toHaveTextContent("3");
  });

  it("REQ-UI-066 uses the singular and the dependency noun", () => {
    render(
      <>
        <CountBadge kind="comments" count={1} />
        <CountBadge kind="dependencies" count={2} />
      </>,
    );
    expect(screen.getByRole("img", { name: "1 comment" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 dependencies" })).toBeInTheDocument();
  });

  it("REQ-UI-066 makes the comment indicator the stronger one", () => {
    render(
      <>
        <CountBadge kind="comments" count={2} />
        <CountBadge kind="dependencies" count={2} />
      </>,
    );
    expect(screen.getByRole("img", { name: "2 comments" })).toHaveClass("font-semibold");
    expect(screen.getByRole("img", { name: "2 dependencies" })).not.toHaveClass("font-semibold");
  });
});
```
`TypeBadge.test.tsx`:
```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TypeBadge } from "./TypeBadge";

afterEach(cleanup);

describe("TypeBadge", () => {
  it.each([
    ["epic", "text-type-epic"],
    ["bug", "text-type-bug"],
    ["feature", "text-type-feature"],
    ["task", "text-muted-foreground"],
    ["chore", "text-muted-foreground"],
  ])("REQ-UI-067 %s is coloured with %s and always names the type", (type, tone) => {
    render(<TypeBadge type={type} />);
    const pill = screen.getByText(type);
    expect(pill).toHaveClass(tone);
    expect(pill).toHaveAttribute("data-type", type);
  });
});
```
`StateMark.test.tsx`:
```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { StateMark, stateEdge } from "./StateMark";

afterEach(cleanup);

describe("StateMark", () => {
  it.each([
    [bead("a", { ready: true }), "Ready", "ready"],
    [bead("b", { status: "in_progress" }), "In progress", "in_progress"],
    [bead("c", { blocked: true }), "Blocked", "blocked"],
    [bead("d", { status: "closed" }), "Done", "done"],
    [bead("e", { status: "deferred" }), "Deferred", "deferred"],
  ])("REQ-UI-064 %# shows %s", (item, label, state) => {
    render(<StateMark bead={item} />);
    expect(screen.getByText(label)).toHaveAttribute("data-state", state);
  });

  it("REQ-UI-064 the edge is 4px wide in the colour of the state", () => {
    expect(stateEdge("blocked")).toBe("border-l-4 border-l-state-blocked");
    expect(stateEdge("in_progress")).toBe("border-l-4 border-l-state-progress");
  });
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run tokens.test CountBadge TypeBadge StateMark`
- [ ] **Step 3: `index.css`.** In `@theme inline {` add `--color-type-epic: var(--type-epic);`, `--color-type-bug: var(--type-bug);`, `--color-type-feature: var(--type-feature);` next to the `--color-state-*` lines. In `:root` change `--state-progress` to `#1d4ed8` and add `--type-epic: #7e22ce; --type-bug: #b91c1c; --type-feature: #be185d;` (one declaration per line); in `.dark` change `--state-progress` to `#93c5fd` and add `--type-epic: #c084fc; --type-bug: #f87171; --type-feature: #f472b6;`.
- [ ] **Step 4: Components.**

`StateMark.tsx`:
```tsx
import { Ban, Check, CircleCheck, CircleDot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { STATE_LABEL, stateOf, type GraphState } from "./graph";

const ICON = { ready: CircleCheck, in_progress: CircleDot, blocked: Ban, done: Check, deferred: Clock } as const;
const TEXT: Record<GraphState, string> = {
  ready: "text-state-ready",
  in_progress: "text-state-progress",
  blocked: "text-state-blocked",
  done: "text-state-done",
  deferred: "text-state-deferred",
};
const EDGE: Record<GraphState, string> = {
  ready: "border-l-state-ready",
  in_progress: "border-l-state-progress",
  blocked: "border-l-state-blocked",
  done: "border-l-state-done",
  deferred: "border-l-state-deferred",
};

/** The 4px left edge of a card or a node, in the colour of the state. */
export const stateEdge = (state: GraphState) => `border-l-4 ${EDGE[state]}`;

export function StateMark({ bead, className }: { bead: BeadSummary; className?: string }) {
  const state = stateOf(bead);
  const Icon = ICON[state];
  return (
    <span data-state={state} className={cn("inline-flex items-center gap-1 font-medium", TEXT[state], className)}>
      <Icon aria-hidden className="size-3.5" />
      {STATE_LABEL[state]}
    </span>
  );
}
```
`TypeBadge.tsx`:
```tsx
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  epic: "bg-type-epic/8 text-type-epic",
  bug: "bg-type-bug/8 text-type-bug",
  feature: "bg-type-feature/8 text-type-feature",
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span
      data-type={type}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[type] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {type}
    </span>
  );
}
```
`CountBadge.tsx`:
```tsx
import { Link2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const KINDS = {
  comments: { icon: MessageSquare, nouns: ["comment", "comments"], tone: "bg-muted font-semibold text-foreground" },
  dependencies: { icon: Link2, nouns: ["dependency", "dependencies"], tone: "text-muted-foreground" },
} as const;

export function CountBadge({ kind, count }: { kind: keyof typeof KINDS; count: number }) {
  if (count <= 0) return null;
  const { icon: Icon, nouns, tone } = KINDS[kind];
  return (
    <span
      role="img"
      aria-label={`${count} ${count === 1 ? nouns[0] : nouns[1]}`}
      className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs", tone)}
    >
      <Icon className="size-3.5" />
      {count}
    </span>
  );
}
```
`GraphNode.tsx`: delete the local `ICON` and `TONE` constants and their lucide import; `import { StateMark, stateEdge } from "./StateMark";`; keep `stateOf` for the edge: `className={cn("absolute flex flex-col justify-center gap-0.5 rounded border bg-card px-2 text-left text-xs transition-opacity motion-reduce:transition-none", stateEdge(state), node.external && …, dimmed && …, selected && …)}` (the old `border-l-4` and the `TONE[state]` string go); replace the last `<span>` (icon and `STATE_LABEL`) with `<StateMark bead={node.bead} className="text-xs" />`; drop `STATE_LABEL` from the import if unused.
- [ ] **Step 5: Run, expect PASS.** If a contrast assertion names a token, change that one value a few steps and rerun (never the threshold). Then `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`. GraphView tests (state words, `data-*`) must still pass.
- [ ] **Step 6: Commit:** `git add frontend && git commit -m "feat(frontend): add the state, type and count badges and the type colours"`

### Track 2: Cards and rows
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-031, REQ-UI-064, REQ-UI-065, REQ-UI-066, REQ-UI-067
- **Files**: modify `frontend/src/features/beads/BeadCard.tsx`, `BeadTable.tsx`, `TreeRow.tsx`, `BoardView.test.tsx:131-133`; create `BeadCard.test.tsx`, `BeadTable.test.tsx`; add one test to `TreeView.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: Board and Focus cards, list rows and Tree rows show the state mark, the type pill and the indicators as the REQs say, with no "0 comments", no "0 deps" and no raw `status` word; every existing test that named the old text is updated to the REQ it serves, none deleted.
- **Estimated complexity**: medium

- [ ] **Step 1: Failing tests.** `BeadCard.test.tsx`:
```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { BeadCard } from "./BeadCard";

afterEach(cleanup);

const card = (item: ReturnType<typeof bead>) => {
  render(
    <ul>
      <BeadCard project="alpha" bead={item} />
    </ul>,
  );
  return screen.getByRole("listitem");
};

describe("BeadCard", () => {
  it("REQ-UI-065 shows the id, priority, title link, state, type, indicators and assignee", () => {
    const li = card(bead("a-1", { title: "Fix it", ready: true, priority: 1, assignee: "alice", comment_count: 2, dependency_count: 1 }));
    expect(li).toHaveTextContent("a-1");
    expect(li).toHaveTextContent("P1");
    expect(screen.getByRole("link", { name: "Fix it" })).toHaveAttribute("href", "/beads/alpha/a-1");
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 comments" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 dependency" })).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("REQ-UI-065 a bare card has only the state and the type on its last line", () => {
    const li = card(bead("a-2"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(li).not.toHaveTextContent(/0 comments|0 deps/);
  });

  it("REQ-UI-064 the left edge has the colour of the state", () => {
    expect(card(bead("a-3", { blocked: true }))).toHaveClass("border-l-4", "border-l-state-blocked");
  });
});
```
`BeadTable.test.tsx`:
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { BeadTable } from "./BeadTable";

afterEach(cleanup);

describe("BeadTable", () => {
  it("REQ-UI-064 REQ-UI-066 REQ-UI-067 a row shows the state name, the type pill and the indicators", () => {
    render(<BeadTable project="alpha" beads={[bead("a-1", { blocked: true, issue_type: "bug", comment_count: 3 }), bead("a-2")]} />);
    const rows = screen.getAllByRole("row");
    const first = within(rows[1] as HTMLElement);
    expect(first.getByText("Blocked")).toBeInTheDocument();
    expect(first.getByText("bug")).toHaveAttribute("data-type", "bug");
    expect(first.getByRole("img", { name: "3 comments" })).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).queryByRole("img")).toBeNull();
  });
});
```
(drop the two `as HTMLElement` casts if lint says they are unnecessary.) Add to `TreeView.test.tsx` (same file pattern as its other tests):
```tsx
  it("REQ-UI-064 REQ-UI-066 tree rows show the state, the type pill and the indicators", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
    stubBeads(() => json([bead("t-1", { title: "Task One", blocked: true, comment_count: 2 })]));
    render(<BeadsPage />);
    const row = await screen.findByRole("treeitem");
    expect(within(row).getByText("Blocked")).toBeInTheDocument();
    expect(within(row).getByRole("img", { name: "2 comments" })).toBeInTheDocument();
  });
```
In `BoardView.test.tsx` replace `getByText("2 deps")` with `getByRole("img", { name: "2 dependencies" })` and `getByText("3 comments")` with `getByRole("img", { name: "3 comments" })`.
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run BeadCard BeadTable TreeView BoardView`
- [ ] **Step 3: Implement.**

`BeadCard.tsx`:
```tsx
import { Link } from "@/app/Link";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { CountBadge } from "./CountBadge";
import { stateOf } from "./graph";
import { StateMark, stateEdge } from "./StateMark";
import { TypeBadge } from "./TypeBadge";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  return (
    <li data-card className={cn("flex flex-col gap-1.5 rounded border bg-card p-2.5 text-sm", stateEdge(stateOf(bead)))}>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{bead.id}</span>
        <span>{`P${bead.priority}`}</span>
      </div>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium">
        {bead.title}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} />
        <CountBadge kind="comments" count={bead.comment_count} />
        <CountBadge kind="dependencies" count={bead.dependency_count} />
        {(bead.assignee ?? "") !== "" && <span className="text-muted-foreground">{bead.assignee}</span>}
      </div>
    </li>
  );
}
```
`BeadTable.tsx`: remove the `Badge` import use for status; in the row: the Title cell becomes
```tsx
<TableCell className="font-medium">
  <div className="flex flex-wrap items-center gap-2">
    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>{bead.title}</Link>
    <CountBadge kind="comments" count={bead.comment_count} />
    <CountBadge kind="dependencies" count={bead.dependency_count} />
  </div>
</TableCell>
<TableCell><TypeBadge type={bead.issue_type} /></TableCell>
<TableCell><StateMark bead={bead} /></TableCell>
```
(keep `Badge` for labels; add the imports `CountBadge`, `StateMark`, `TypeBadge`; the header names stay.) `TreeRow.tsx`: replace `<Badge variant="secondary">{bead.status}</Badge>` with `<StateMark bead={bead} />`, replace `<span className="text-muted-foreground">{bead.issue_type}</span>` with `<TypeBadge type={bead.issue_type} />`, and add `<CountBadge kind="comments" count={bead.comment_count} />` and `<CountBadge kind="dependencies" count={bead.dependency_count} />` right after the type pill; drop the `Badge` import if it is no longer used.
- [ ] **Step 4: Run the whole suite.** `pnpm -C frontend test --run`. Any test that still reads the old raw status word (`open`, `in_progress`) or `N deps` from a card, row or tree row now fails: change that assertion to the state name or the indicator of REQ-UI-064/066 (the state of the fixture is the one `stateOf` gives) and keep the test's REQ-ID; do not delete a test and do not touch tests that do not fail. Then `pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`.
- [ ] **Step 5: Commit:** `git add frontend && git commit -m "feat(frontend): give the cards, rows and tree rows the new state, type and count marks"`

### Track 3: Discussion on the bead page
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-039, REQ-UI-040, REQ-UI-067, REQ-UI-068, REQ-UI-069, REQ-UI-070, REQ-UI-071
- **Files**: create `frontend/src/features/beads/discussion.ts`, `DetailTabs.tsx`, `DiscussionPanel.tsx`, `Discussion.test.tsx`; modify `CommentList.tsx`, `BeadDetailPage.tsx`, `BeadDetailPage.test.tsx:284-410` (the comments tests)
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**: a bead with comments has the tabs "Details" and "Discussion (N)" (the side column form from 1024px is chosen by classes), Hide/Show works, is remembered and survives refused storage; a bead without comments has none of it; each comment is its own block; REQ-UI-039 and 040 behave as before under the name "Discussion"; the header shows the type pill.
- **Estimated complexity**: high

**Interfaces produced** (exact):
```ts
// discussion.ts
export const DISCUSSION_KEY: "gin-console-discussion";
export function setDiscussionHidden(hidden: boolean): void;
export function useDiscussionHidden(): [boolean, () => void];   // value, toggle
// DetailTabs.tsx
export type DetailTab = "details" | "discussion";
export function DetailTabs(props: { tab: DetailTab; onChange: (tab: DetailTab) => void; count: number; className?: string }): JSX.Element;
// DiscussionPanel.tsx
export function DiscussionPanel(props: { project: string; id: string; onHide?: () => void }): JSX.Element;
```

- [ ] **Step 1: Failing tests.** `Discussion.test.tsx` (the fetch stub copies the one at the top of `BeadDetailPage.test.tsx`; copy `json`, `stubFetch`, `note`, `beadDetail` from there into this file, unchanged):
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeadDetailPage } from "./BeadDetailPage";
import { DISCUSSION_KEY, setDiscussionHidden } from "./discussion";
// ... json, stubFetch, note, beadDetail copied from BeadDetailPage.test.tsx ...

beforeEach(() => {
  window.localStorage.clear();
  setDiscussionHidden(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const open = async (comments: number, embedded = false) => {
  stubFetch(beadDetail("a-5", { comment_count: comments }), () => json([note("c-1"), note("c-2")].slice(0, comments)));
  render(<BeadDetailPage project="alpha" id="a-5" embedded={embedded} />);
  await screen.findByRole("heading", { name: "Title a-5" });
};

describe("Discussion", () => {
  it("REQ-UI-069 a bead with comments has the tabs, Details first", async () => {
    await open(2);
    const tabs = screen.getByRole("tablist");
    expect(within(tabs).getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "false");
  });

  it("REQ-UI-069 selecting Discussion shows it instead of the details", async () => {
    await open(2);
    await userEvent.click(screen.getByRole("tab", { name: "Discussion (2)" }));
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Details" })).toHaveClass("hidden");
    expect(await screen.findByText("Text of c-1")).toBeInTheDocument();
  });

  it("REQ-UI-069 the arrow keys change tab", async () => {
    await open(2);
    screen.getByRole("tab", { name: "Details" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Discussion (2)" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-069 REQ-UI-068 the page form hides the tabs from 1024px, the panel form never does", async () => {
    await open(2);
    expect(screen.getByRole("tablist")).toHaveClass("lg:hidden");
    cleanup();
    await open(2, true);
    expect(screen.getByRole("tablist")).not.toHaveClass("lg:hidden");
  });

  it("REQ-UI-069 a bead without comments has no tabs, no discussion and no comments request", async () => {
    await open(0);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("region", { name: "Discussion" })).toBeNull();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/comments"))).toBe(false);
  });

  it("REQ-UI-070 Hide discussion hides it, Show brings it back, and the choice is kept", async () => {
    await open(2);
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(window.localStorage.getItem(DISCUSSION_KEY)).toBe("hidden");
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
    cleanup();
    await open(2);
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show discussion (2)" }));
    expect(screen.getByRole("button", { name: "Hide discussion" })).toBeInTheDocument();
    expect(window.localStorage.getItem(DISCUSSION_KEY)).toBeNull();
  });

  it("REQ-UI-070 hides without an error when storage refuses", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await open(2);
    await userEvent.click(screen.getByRole("button", { name: "Hide discussion" }));
    expect(screen.getByRole("button", { name: "Show discussion (2)" })).toBeInTheDocument();
  });

  it("REQ-UI-071 each comment is a block with the author in bold, the time and the text apart", async () => {
    await open(2);
    const author = await screen.findAllByText("alice");
    expect(author).toHaveLength(2);
    expect(author[0]).toHaveClass("font-semibold");
    const text = screen.getByText("Text of c-1");
    expect(text).not.toHaveClass("text-muted-foreground");
    expect(text.closest("li")).toHaveClass("border");
  });

  it("REQ-UI-067 the header shows the type pill", async () => {
    stubFetch(beadDetail("a-5", { issue_type: "epic" }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText("epic")).toHaveAttribute("data-type", "epic");
  });
});
```
In `BeadDetailPage.test.tsx` update the comments tests: every `{ name: "Comments (N)" }` heading becomes `{ name: "Discussion (N)" }`; every query of the section by the name "Comments" becomes "Discussion"; the two time assertions that look for the text `alice · <time>` become `screen.getAllByText("alice")` and `screen.getByText(new Date("2026-10-06T10:00:00Z").toLocaleString())` (and the 05 one), because author and time are now separate elements; keep every test's REQ-ID. If the same header text `epic` or `task` made an old assertion ambiguous, scope it with `within`.
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run Discussion BeadDetailPage`
- [ ] **Step 3: `discussion.ts`:**
```ts
import { useSyncExternalStore } from "react";

export const DISCUSSION_KEY = "gin-console-discussion";

const listeners = new Set<() => void>();
let fallback = false; // used only when the browser refuses to store the choice

function read(): boolean {
  try {
    return window.localStorage.getItem(DISCUSSION_KEY) === "hidden";
  } catch {
    return fallback; // storage refused: the choice lasts for this visit only
  }
}

export function setDiscussionHidden(hidden: boolean): void {
  fallback = hidden;
  try {
    if (hidden) window.localStorage.setItem(DISCUSSION_KEY, "hidden");
    else window.localStorage.removeItem(DISCUSSION_KEY);
  } catch {
    // storage refused: `fallback` holds the choice for this visit
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useDiscussionHidden(): [boolean, () => void] {
  const hidden = useSyncExternalStore(subscribe, read);
  return [hidden, () => setDiscussionHidden(!hidden)];
}
```
`DetailTabs.tsx`:
```tsx
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type DetailTab = "details" | "discussion";

export function DetailTabs({
  tab,
  onChange,
  count,
  className,
}: {
  tab: DetailTab;
  onChange: (tab: DetailTab) => void;
  count: number;
  className?: string;
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const other = event.currentTarget.parentElement?.querySelector<HTMLElement>('[role="tab"][aria-selected="false"]');
    onChange(tab === "details" ? "discussion" : "details");
    other?.focus();
  };
  const item = (value: DetailTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={tab === value}
      aria-controls={`panel-${value}`}
      tabIndex={tab === value ? 0 : -1}
      onClick={() => onChange(value)}
      onKeyDown={move}
      className={cn(
        "min-h-11 border-b-2 px-3 text-sm font-medium md:min-h-9",
        tab === value ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Bead sections" className={cn("flex gap-2 border-b", className)}>
      {item("details", "Details")}
      {item("discussion", `Discussion (${count})`)}
    </div>
  );
}
```
`DiscussionPanel.tsx`:
```tsx
import { Button } from "@/components/ui/button";
import { CommentList } from "./CommentList";

export function DiscussionPanel({ project, id, onHide }: { project: string; id: string; onHide?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      {onHide !== undefined && (
        <div className="hidden justify-end lg:flex">
          <Button variant="ghost" size="sm" onClick={onHide}>
            Hide discussion
          </Button>
        </div>
      )}
      <CommentList project={project} id={id} />
    </div>
  );
}
```
`CommentList.tsx`: `aria-label="Comments"` to `aria-label="Discussion"`; the heading text to ``state.status === "ok" ? `Discussion (${state.comments.length})` : "Discussion"``; the list item to
```tsx
<li key={comment.id} className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
    <span className="font-semibold">{comment.author}</span>
    <span className="text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
  </div>
  <p className="whitespace-pre-wrap break-words text-sm">{comment.text}</p>
  {comment.truncated && <p className="text-xs text-muted-foreground">Comment truncated</p>}
</li>
```
`BeadDetailPage.tsx`: add imports (`cn` from `@/lib/utils`, `useState` already imported, `DetailTabs`/`DetailTab`, `DiscussionPanel`, `TypeBadge`, `useDiscussionHidden`); in the component add `const [tab, setTab] = useState<DetailTab>("details"); const [hidden, toggleHidden] = useDiscussionHidden();`. In the header replace `<span>{bead.issue_type}</span>` with `<TypeBadge type={bead.issue_type} />`. Wrap the body (everything after the header, plus the header itself) like this, with `const hasDiscussion = bead.comment_count > 0; const page = !embedded;`:
```tsx
<div className={cn(hasDiscussion && page && !hidden && "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8")}>
  <div className="flex flex-col gap-4">
    {hasDiscussion && (
      <DetailTabs tab={tab} onChange={setTab} count={bead.comment_count} className={page ? "lg:hidden" : undefined} />
    )}
    <div
      role={hasDiscussion ? "tabpanel" : undefined}
      id={hasDiscussion ? "panel-details" : undefined}
      aria-label={hasDiscussion ? "Details" : undefined}
      className={cn("flex flex-col gap-4", hasDiscussion && tab !== "details" && cn("hidden", page && "lg:flex"))}
    >
      {hasDiscussion && page && hidden && (
        <Button variant="outline" size="sm" className="hidden self-start lg:inline-flex" onClick={toggleHidden}>
          {`Show discussion (${bead.comment_count})`}
        </Button>
      )}
      {/* header, description, text sections, relations, children progress: unchanged, moved in here */}
    </div>
  </div>
  {hasDiscussion && (
    <div
      role="tabpanel"
      id="panel-discussion"
      aria-label="Discussion"
      className={cn(
        tab !== "discussion" && "hidden",
        page && !hidden && "lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto",
        page && hidden && "lg:hidden",
      )}
    >
      <DiscussionPanel project={project} id={bead.id} onHide={page ? toggleHidden : undefined} />
    </div>
  )}
</div>
```
The `back` link and the loading and error blocks stay where they are, above this wrapper. Remove the old `{bead.comment_count > 0 && <CommentList … />}` line and the `CommentList` import. The details block is a `tabpanel` only when there are tabs (a tab panel without a tab list is wrong); a tab panel needs an accessible name, hence the `aria-label`.
- [ ] **Step 4: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`. Check the built CSS holds the long classes: `grep -c "lg\\\\:grid-cols-\\\\\[minmax" frontend/dist/assets/*.css` should print 1.
- [ ] **Step 5: Commit:** `git add frontend && git commit -m "feat(frontend): put the comments in a discussion column and tabs on the bead page"`

### Track 4: Look at it in a browser
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-UI-064, REQ-UI-067, REQ-UI-068, REQ-UI-069
- **Human gate**: a person with a browser looks at the live console at 1280, 820 and 390px, in light and dark, and says what they saw. The agent has no browser; without that person the cases stay "not run".
- **Files**: modify `docs/changes/gin-console-8yg-bead-cards-discussion/tests.md` (evidence)
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**: TC-1 to TC-4 each have an evidence line that says what was seen, where, in which theme, or "not run" with the reason.
- **Estimated complexity**: low

- [ ] **Step 1:** build and put the result in the running service (`pnpm -C frontend build`, then the live `frontend/dist` as in `deploy/README.md`), so the person can open it.
- [ ] **Step 2 (the person):** TC-1: a bead with comments at 1280px has details left and a sticky discussion right, and Hide/Show works; TC-2: tabs at 820 and 390px and in the Tree and Graph panels; TC-3: a Board card next to a graph node of the same bead; TC-4: epic, bug, feature, task and chore pills in light and dark, and an epic in progress does not show two near hues.
- [ ] **Step 3:** write one evidence line per case in `tests.md` and commit: `git add docs && git commit -m "docs(specs): record the manual checks of the bead cards"`.

## Integration
- **Branch**: `feat/bead-cards-discussion` (from the updated base)
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (`pnpm -C frontend test --run`; the 2100-bead Tree test can time out on a loaded machine: rerun it alone before calling it a failure)
- [ ] Type checks clean (`pnpm -C frontend typecheck`), lint (`pnpm -C frontend lint`), build (`pnpm -C frontend build`)
- [ ] Manual TC-1 to TC-4 recorded in `tests.md` (Track 4, needs a person)
- [ ] `gin-workflow specs trace --change gin-console-8yg` reports no missing REQ

## Notes
- Model guidance is planning metadata, not Beads state.
- Only the Parent Bead (the epic) stays open until the human-confirmed merge; track beads close after tests and review pass.
- Tracks 1 to 3 are code only. Track 4 needs a person: a goal that runs this epic unattended should stop after Track 3.
