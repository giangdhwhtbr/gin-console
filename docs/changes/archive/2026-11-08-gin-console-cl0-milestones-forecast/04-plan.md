# Plan: Milestones forecast and bead Markdown

Epic: gin-console-cl0
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Mockups: `docs/specs/milestone-ui/assets/2026-11-08/mockup/index.html` and `docs/specs/ui/assets/2026-11-08/mockup/index.html`.

## Objective
The changes:
- **Milestones list:** shows the project forecast card from `gin-workflow milestone list --json` `forecast`, and lanes plus forecast finish per milestone.
- **Milestone page:** the header shows the milestone's lanes. The Gantt keeps drawing the lane-bound dates as given.
- **Older gin-workflow:** output without the new keys still loads.
- **Bead page:** renders the description, acceptance criteria, design, notes and close reason as Markdown, with raw HTML shown as text and only `http`, `https` and `mailto` links.
- **Contract record:** the gin-harness JSON contract lists `lanes` and `forecast`.

Every scenario of REQ-MILESTONE-UI-001, 003, 008, 016, 017 and REQ-UI-028, 038 has a test. TC-1 and TC-2 in `05-tests.md` pass on the Tailscale deploy.

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
- **Problem statement:** the Milestones page does not show any of the new schedule data:
  - **Project level:** when the open roadmap work will finish, compared with the deadline. The API drops `forecast` and `lanes`, because `response_model` removes undeclared fields.
  - **Per milestone:** how many lanes each milestone runs on.

  Separately, bead text written in Markdown shows as raw markup.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - The main frontend chunk does not grow by the Markdown libraries: they load in their own chunk.
- **Global constraints** (from the spec and `AGENTS.md`):
  - The console is read-only. It never edits lanes, the deadline or beads.
  - `forecast` and `lanes` are optional. Output from gin-workflow before `milestone-forecast` keeps loading, and the API answers `null` for each missing key.
  - The console does not reschedule: the Gantt draws `planned_start`/`planned_end` as given.
  - Spare working days are counted Monday to Friday in `(finish, deadline]`, the same as gin-workflow `workdays_after`.
  - Raw HTML in bead text never becomes an element. Links other than `http:`, `https:` and `mailto:` render as text.
  - The warning color is the `state-blocked` token; errors use `destructive`.
  - New and changed tests carry their REQ-ID in the test name or a comment.
  - Linux, macOS and Windows paths are untouched.
- **Non-goals:**
  - A page layout redesign.
  - Lane rows on the Gantt.
  - Editing lanes or the deadline.
  - Forecast on the Reports page.
  - Markdown in comments or titles.

## Approach Options
### Option 1: declare the new keys as optional fields and render them in place
- **Summary:**
  - The backend models gain `forecast` and `lanes` with `None` defaults.
  - The frontend guards accept missing keys and normalize them to `null`.
  - A new `ForecastCard`, a Lanes column, and a header span.
  - For bead text, `react-markdown` + `remark-gfm` + `remark-breaks` in a lazily loaded component.
- **Pros:**
  - Small, additive change.
  - Works with both gin-workflow versions.
  - The Markdown libraries stay out of the main chunk.
- **Cons:**
  - Three new frontend dependencies.
  - The bead text shows plain for a moment until the chunk loads.

### Option 2: pass the gin-workflow JSON through unvalidated, and render Markdown with a hand-written parser
- **Summary:** drop `response_model` for the list, and write a small Markdown subset renderer.
- **Pros:** no dependencies.
- **Cons:**
  - Loses the boundary validation the API relies on (REQ-MILESTONE-UI-008).
  - A hand-written parser is the riskier place for XSS mistakes, and tables and task lists would be partial.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:**
  - It keeps the typed boundary.
  - It matches the design confirmed on 2026-11-08.
  - react-markdown 10.1.0 was checked on 2026-11-08 to escape `<script>` and `<img onerror>` and to apply `urlTransform` to links.

## Scope
- **In scope:**
  - `backend/src/gin_console/milestones/models.py` and its tests.
  - `frontend/src/features/milestones/*`.
  - `frontend/src/features/beads/{BeadDetailPage,TextSection,MarkdownText,MarkdownView}.tsx` and their tests.
  - `frontend/src/index.css` (`.markdown` block).
  - `frontend/package.json` and `pnpm-lock.yaml`.
  - `../gin-harness/docs/changes/gin-harness-6s4-milestones/design.md`.
- **Out of scope:**
  - `milestones/source.py` and `router.py`.
  - `GanttChart.tsx` and `gantt.ts`.
  - `DiscussionPanel`.
  - Living specs, which are merged at ship by `specs archive`.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Tracks 1, 2 and 3 touch disjoint files (backend milestones, frontend milestones, frontend beads plus package.json and index.css) and none consumes another's output, since the frontend tests use their own fixtures; they run together and Track 4 follows once all three are merged.
```

## Tasks

### Track 1: Milestones API carries forecast and lanes
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-008
- **Files**:
  - Modify `backend/src/gin_console/milestones/models.py:18-72` (add `Forecast`; `lanes` on `MilestoneEntry` and `MilestoneDetail`; `forecast` on `MilestoneList`)
  - Test `backend/tests/test_milestones_api.py`
  - Test `backend/tests/test_milestones_source.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** three optional pydantic fields and one new model, with the exact JSON shape given by the contract; no logic.
- **Acceptance criteria**:
  - A list with `forecast` and per-entry `lanes`, and a show with `lanes`, pass through unchanged.
  - Without those keys, or with `forecast: null`, the API answers `null`.
  - A malformed `forecast` fails validation as other unexpected output does (502, `cause: null`).
  - The full backend suite, ruff and mypy pass.
- **Estimated complexity**: low

Interfaces produced (the JSON Track 2 reads):
```python
class Forecast(BaseModel):
    deadline: IsoDate | None
    lanes: int
    start: IsoDate
    finish: IsoDate | None
    overflow_days: int
    open_epics: int
    unestimated: int
    error: Text | None

class MilestoneEntry(BaseModel):  # existing fields, then
    lanes: int | None = None

class MilestoneList(BaseModel):  # existing fields, then
    forecast: Forecast | None = None

class MilestoneDetail(BaseModel):  # existing fields, then
    lanes: int | None = None
```

Steps:

1. Write the failing tests. Append to `backend/tests/test_milestones_api.py`. Add `from fake_gw import LIST, SHOW, FakeGw` in place of `from fake_gw import FakeGw`.
   ```python
   FORECAST: dict[str, Any] = {
       "deadline": "2026-12-31",
       "lanes": 1,
       "start": "2026-11-08",
       "finish": "2026-12-23",
       "overflow_days": 0,
       "open_epics": 5,
       "unestimated": 1,
       "error": None,
   }


   # REQ-MILESTONE-UI-008 forecast and lanes
   def test_milestone_ui_008_forecast_and_lanes(tmp_path: Path) -> None:
       listed = {**LIST, "forecast": FORECAST, "milestones": [{**LIST["milestones"][0], "lanes": 2}]}
       api = make(tmp_path, FakeGw({"list": listed, "show": {**SHOW, "lanes": 2}}))
       body = api.get("/api/milestones", params={"project": "proj"}).json()
       assert body["forecast"] == FORECAST
       assert body["milestones"][0]["lanes"] == 2
       assert api.get("/api/milestones/proj/gw-ab1").json()["lanes"] == 2


   # REQ-MILESTONE-UI-008 output from an older gin-workflow
   def test_milestone_ui_008_older_output_answers_null(tmp_path: Path) -> None:
       api = make(tmp_path, FakeGw())
       body = api.get("/api/milestones", params={"project": "proj"}).json()
       assert body["forecast"] is None
       assert body["milestones"][0]["lanes"] is None
       assert api.get("/api/milestones/proj/gw-ab1").json()["lanes"] is None


   # REQ-MILESTONE-UI-008
   def test_milestone_ui_008_forecast_null(tmp_path: Path) -> None:
       api = make(tmp_path, FakeGw({"list": {**LIST, "forecast": None}, "show": SHOW}))
       assert api.get("/api/milestones", params={"project": "proj"}).json()["forecast"] is None
   ```
   In `backend/tests/test_milestones_source.py`, extend the parametrize list of `test_milestone_ui_008_unexpected_output` to:
   ```python
   @pytest.mark.parametrize(
       "output",
       [[], {**LIST, "milestones": [{"id": 1}]}, {**LIST, "forecast": {"lanes": "two"}}],
   )
   ```
2. Run the tests and check that they fail:
   ```bash
   uv run --directory backend pytest tests/test_milestones_api.py tests/test_milestones_source.py -k "forecast or older or unexpected"
   ```
   Expected failures:
   - `test_milestone_ui_008_forecast_and_lanes`, with `KeyError: 'forecast'`.
   - `test_milestone_ui_008_older_output_answers_null` and `test_milestone_ui_008_forecast_null`, with `KeyError`.
   - The new `unexpected_output` case: `DID NOT RAISE`.
3. Implement in `models.py`:
   - Add the `Forecast` class above `MilestoneList`, exactly as in Interfaces.
   - Add `lanes: int | None = None` as the last field of `MilestoneEntry` and of `MilestoneDetail`.
   - Add `forecast: Forecast | None = None` as the last field of `MilestoneList`.
   - Update the module docstring to: `"""\`gin-workflow milestone list|show --json\`, schema 1, as the console serves it; \`forecast\` and \`lanes\` are null from a gin-workflow before milestone-forecast."""`
4. Run everything:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expected: all pass, and ruff and mypy are clean.
5. Commit: `git commit -m "feat(milestones): forecast and lanes in the API (gin-console-cl0)"`

### Track 2: Forecast card, lanes and finish on the Milestones pages
- **Dependencies**: none (uses its own fixtures; the API shape is in Track 1's Interfaces)
- **Requirements**: REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-017, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-003
- **Files**:
  - Modify `frontend/src/features/milestones/api.ts:1-145` (types `Forecast`, `lanes`, `forecast`; guards; normalization in `fetchMilestones` and `fetchMilestone`)
  - Modify `frontend/src/features/milestones/format.ts` (add `workdaysAfter`)
  - Create `frontend/src/features/milestones/ForecastCard.tsx`
  - Modify `frontend/src/features/milestones/MilestonesPage.tsx:20,72-158` (card above the list; Lanes column; finish line)
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:78-100` (lanes in `MilestoneHeader`)
  - Modify `frontend/src/features/milestones/milestoneFixtures.ts:6-55` (defaults `lanes: null`, `forecast: null`)
  - Test `frontend/src/features/milestones/format.test.ts` (create)
  - Test `frontend/src/features/milestones/ForecastCard.test.tsx` (create)
  - Test `frontend/src/features/milestones/api.test.ts`
  - Test `frontend/src/features/milestones/MilestonesPage.test.tsx`
  - Test `frontend/src/features/milestones/MilestonePage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded UI work in one feature folder. It has several text states for the card and a small date count, and all of them are spelled out in the scenarios.
- **Acceptance criteria**:
  - Each scenario of REQ-MILESTONE-UI-016 and 017 has a test, as does the lanes/finish/older-output part of REQ-MILESTONE-UI-001 and the lane-bound scenario of REQ-MILESTONE-UI-003.
  - Existing milestone tests still pass with the fixture defaults.
  - Typecheck, lint and the frontend suite pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// api.ts
export type Forecast = {
  deadline: string | null; lanes: number; start: string; finish: string | null;
  overflow_days: number; open_epics: number; unestimated: number; error: string | null;
};
// MilestoneEntry gains   lanes: number | null
// MilestoneList gains    forecast: Forecast | null
// MilestoneDetail gains  lanes: number | null
// format.ts
export function workdaysAfter(end: string, finish: string): number;
// ForecastCard.tsx
export function ForecastCard({ forecast, today }: { forecast: Forecast | null; today: string }): JSX.Element | null;
```

Steps:

1. Fixtures. In `milestoneFixtures.ts`:
   - Add `lanes: null,` after `error: null,` in `entry`.
   - Add `forecast: null,` after `today: "2026-10-29",` in `list`.
   - Add `lanes: null,` after `epics,` in `detail`.
   - Add the export:
   ```ts
   export const forecast = (overrides: Partial<Forecast> = {}): Forecast => ({
     deadline: "2026-12-31",
     lanes: 2,
     start: "2026-11-08",
     finish: "2026-12-23",
     overflow_days: 0,
     open_epics: 5,
     unestimated: 0,
     error: null,
     ...overrides,
   });
   ```
   (import `Forecast` with the other types from `./api`).
2. Write the failing tests.
   - `format.test.ts`:
     ```ts
     import { describe, expect, it } from "vitest";
     import { workdaysAfter } from "./format";

     describe("workdaysAfter", () => {
       // REQ-MILESTONE-UI-016 spare days counted Monday to Friday in (end, finish]
       it("REQ-MILESTONE-UI-016 counts working days after the first date up to the second", () => {
         expect(workdaysAfter("2026-12-23", "2026-12-31")).toBe(6);
         expect(workdaysAfter("2026-12-31", "2027-01-07")).toBe(5);
         expect(workdaysAfter("2026-11-06", "2026-11-08")).toBe(0); // Friday to Sunday
         expect(workdaysAfter("2026-11-08", "2026-11-08")).toBe(0);
       });
     });
     ```
   - `ForecastCard.test.tsx`:
     ```tsx
     import { cleanup, render, screen } from "@testing-library/react";
     import { afterEach, describe, expect, it } from "vitest";
     import { ForecastCard } from "./ForecastCard";
     import { forecast } from "./milestoneFixtures";

     afterEach(cleanup);
     const TODAY = "2026-11-08";
     const card = () => screen.getByRole("region", { name: "Project forecast" });

     describe("ForecastCard", () => {
       it("REQ-MILESTONE-UI-016 on time with a deadline", () => {
         render(<ForecastCard forecast={forecast({ lanes: 2, open_epics: 5, unestimated: 0 })} today={TODAY} />);
         expect(card()).toHaveTextContent("Finishes 23 Dec");
         expect(card()).toHaveTextContent("6 working days spare");
         expect(card()).toHaveTextContent("2 lanes");
         expect(card()).toHaveTextContent("5 open epics");
         expect(card()).toHaveTextContent("0 unestimated");
         expect(screen.queryByRole("img", { name: "Warning" })).toBeNull();
       });

       it("REQ-MILESTONE-UI-016 past the deadline", () => {
         render(<ForecastCard forecast={forecast({ finish: "2027-01-07", overflow_days: 5 })} today={TODAY} />);
         const late = screen.getByText("5 working days past the deadline");
         expect(late).toHaveClass("text-state-blocked");
         expect(card()).toHaveTextContent("Finishes 7 Jan 2027");
       });

       it("REQ-MILESTONE-UI-016 on the deadline", () => {
         render(<ForecastCard forecast={forecast({ finish: "2026-12-31" })} today={TODAY} />);
         expect(card()).toHaveTextContent("on the deadline");
       });

       it("REQ-MILESTONE-UI-016 no deadline", () => {
         render(<ForecastCard forecast={forecast({ deadline: null, finish: "2026-11-20" })} today={TODAY} />);
         expect(card()).toHaveTextContent("Finishes 20 Nov");
         expect(card()).toHaveTextContent("No deadline");
         expect(screen.getByText("- Deadline: YYYY-MM-DD")).toBeInTheDocument();
       });

       it("REQ-MILESTONE-UI-016 every epic unestimated", () => {
         render(<ForecastCard forecast={forecast({ finish: null, open_epics: 2, unestimated: 2 })} today={TODAY} />);
         expect(card()).toHaveTextContent("No estimate: every open epic is unestimated");
         expect(card()).toHaveTextContent("2 unestimated");
         expect(screen.getByRole("img", { name: "Warning" })).toBeInTheDocument();
         expect(card()).not.toHaveTextContent(/spare|past the deadline|on the deadline/);
       });

       it("REQ-MILESTONE-UI-016 forecast error", () => {
         const error = "Deadline: soon is not a date (YYYY-MM-DD)";
         render(<ForecastCard forecast={forecast({ error, deadline: null, finish: "2026-11-20" })} today={TODAY} />);
         expect(screen.getByText(error)).toHaveClass("text-destructive");
         expect(card()).toHaveTextContent("Finishes 20 Nov");
       });

       it("REQ-MILESTONE-UI-016 no forecast", () => {
         const { container } = render(<ForecastCard forecast={null} today={TODAY} />);
         expect(container).toBeEmptyDOMElement();
       });
     });
     ```
   - `api.test.ts`, inside the `describe`:
     ```ts
     it("REQ-MILESTONE-UI-008 reads forecast and lanes", async () => {
       stubMilestones(() => json(list([entry("m-1", { lanes: 2 })], { forecast: forecast() })));
       const body = await fetchMilestones("alpha");
       expect(body.forecast?.finish).toBe("2026-12-23");
       expect(body.milestones[0].lanes).toBe(2);
     });

     it("REQ-MILESTONE-UI-008 older output: missing forecast and lanes become null", async () => {
       const { lanes: _l, ...old } = entry("m-1");
       const { forecast: _f, ...oldList } = list([]);
       stubMilestones((url) =>
         url.pathname.endsWith("/m-1") ? json((({ lanes: _d, ...d }) => d)(detail([epicPlan("e-a")]))) : json({ ...oldList, milestones: [old] }),
       );
       const body = await fetchMilestones("alpha");
       expect(body.forecast).toBeNull();
       expect(body.milestones[0].lanes).toBeNull();
       expect((await fetchMilestone("alpha", "m-1", null)).lanes).toBeNull();
     });

     it("REQ-MILESTONE-UI-008 refuses a malformed forecast", async () => {
       stubMilestones(() => json(list([], { forecast: { ...forecast(), lanes: "two" } as unknown as Forecast })));
       await expect(fetchMilestones("alpha")).rejects.toThrow("unexpected response");
     });
     ```
     (import `forecast` from `./milestoneFixtures` and `type Forecast` from `./api`; if lint flags the unused `_l`, `_f` and `_d` bindings, build the objects with `Object.fromEntries(Object.entries(x).filter(([k]) => k !== "lanes"))` instead).
   - `MilestonesPage.test.tsx`, inside the `describe`:
     ```tsx
     it("REQ-MILESTONE-UI-016 shows the forecast card above the list", async () => {
       open(json(list([entry("m-1", { title: "Beta" })], { forecast: forecast(), today: "2026-11-08" })));
       const card = await screen.findByRole("region", { name: "Project forecast" });
       const listEl = screen.getByRole("list", { name: "Milestones" });
       expect(card.compareDocumentPosition(listEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
     });

     it("REQ-MILESTONE-UI-016 no card without a forecast", async () => {
       open(json(list([entry("m-1", { title: "Beta" })])));
       await rowOf("Beta");
       expect(screen.queryByRole("region", { name: "Project forecast" })).toBeNull();
     });

     it("REQ-MILESTONE-UI-001 lanes and finish", async () => {
       open(
         json(
           list(
             [
               entry("m-1", { title: "Beta", lanes: 2, start: "2026-11-02", end: "2026-11-12", finish: "2026-11-23" }),
               entry("m-2", { title: "Hardening", lanes: 1, start: "2026-11-16", end: "2026-12-04", finish: "2026-12-01" }),
             ],
             { today: "2026-11-08" },
           ),
         ),
       );
       const beta = await rowOf("Beta");
       expect(beta).toHaveTextContent("2 lanes");
       expect(within(beta).getByText("Finishes 23 Nov")).toHaveClass("text-state-blocked");
       const hardening = await rowOf("Hardening");
       expect(hardening).toHaveTextContent("1 lane");
       expect(within(hardening).getByText("Finishes 1 Dec")).not.toHaveClass("text-state-blocked");
     });

     it("REQ-MILESTONE-UI-001 older gin-workflow: a dash for lanes", async () => {
       open(json(list([entry("m-1", { title: "Beta", lanes: null })])));
       expect(within(await rowOf("Beta")).getByText("–")).toBeInTheDocument();
     });
     ```
     (import `forecast` from `./milestoneFixtures`).
   - `MilestonePage.test.tsx`, inside the `describe`:
     ```tsx
     it("REQ-MILESTONE-UI-017 lanes shown in the header", async () => {
       open({ ...OVERFLOW, lanes: 2 });
       const header = (await screen.findByRole("heading", { name: "Beta readiness" })).closest("header") ?? document.body;
       expect(within(header).getByText("2 lanes")).toBeInTheDocument();
     });

     it("REQ-MILESTONE-UI-017 older gin-workflow: no lane count", async () => {
       open(OVERFLOW);
       const header = (await screen.findByRole("heading", { name: "Beta readiness" })).closest("header") ?? document.body;
       expect(within(header).queryByText(/\blanes?\b/)).toBeNull();
     });

     it("REQ-MILESTONE-UI-003 lane-bound dates: B starts after A on one lane", async () => {
       open(
         detail(
           [
             epicPlan("e-a", { planned_start: "2026-11-09", planned_end: "2026-11-10", estimate_days: 2 }),
             epicPlan("e-b", { planned_start: "2026-11-11", planned_end: "2026-11-12", estimate_days: 2 }),
           ],
           { start: "2026-11-09", end: "2026-11-13", schedule_start: "2026-11-09", finish: "2026-11-12", lanes: 1 },
         ),
       );
       expect(beads(await row("e-a"))).toEqual(["2026-11-09", "2026-11-10"]);
       expect(beads(await row("e-b"))).toEqual(["2026-11-11", "2026-11-12"]);
     });
     ```
3. Run and check that the new tests fail:
   ```bash
   pnpm -C frontend test --run src/features/milestones
   ```
   Expected:
   - `format.test.ts` and `ForecastCard.test.tsx` fail to import their subjects.
   - The new `api`, `MilestonesPage` and `MilestonePage` cases fail.
   - The lane-bound Gantt case already passes, which confirms that no Gantt change is needed. It stays as a regression test.
   - All other tests pass.
4. Implement.
   - `format.ts`, append:
     ```ts
     /** Working days (Monday to Friday) after `end` up to and including `finish`, as gin-workflow `workdays_after`. */
     export function workdaysAfter(end: string, finish: string): number {
       let count = 0;
       const day = utcOf(end);
       const last = utcOf(finish).getTime();
       for (day.setUTCDate(day.getUTCDate() + 1); day.getTime() <= last; day.setUTCDate(day.getUTCDate() + 1)) {
         if (day.getUTCDay() % 6 !== 0) count += 1;
       }
       return count;
     }
     ```
   - `api.ts`:
     - Add the `Forecast` type from Interfaces.
     - Add `lanes: number | null` to `MilestoneEntry` and `MilestoneDetail`, and `forecast: Forecast | null` to `MilestoneList`.
     - Add the guards:
     ```ts
     const isLanes = (value: unknown) => value === undefined || isNumberOrNull(value);
     function isForecast(value: unknown): value is Forecast {
       return (
         isObject(value) &&
         isString(field(value, "start")) &&
         stringsOrNull(value, ["deadline", "finish", "error"]) &&
         ["lanes", "overflow_days", "open_epics", "unestimated"].every((k) => isFiniteNumber(field(value, k)))
       );
     }
     ```
     - Append `&& isLanes(field(value, "lanes"))` to `isEntry` and `isDetail`.
     - Append to `isList`: `&& (field(value, "forecast") === undefined || field(value, "forecast") === null || isForecast(field(value, "forecast")))`.
     - In `fetchMilestones`, return:
     ```ts
     return { ...body, forecast: body.forecast ?? null, milestones: body.milestones.map((m) => ({ ...m, lanes: m.lanes ?? null })) };
     ```
     - In `fetchMilestone`, return `{ ...body, lanes: body.lanes ?? null }`.
   - `ForecastCard.tsx`:
     ```tsx
     import { TriangleAlert } from "lucide-react";
     import { cn } from "@/lib/utils";
     import type { Forecast } from "./api";
     import { plural, shortDate, workdaysAfter } from "./format";

     /** The project forecast of `milestone list --json` (REQ-MILESTONE-UI-016); nothing without one. */
     export function ForecastCard({ forecast: f, today }: { forecast: Forecast | null; today: string }) {
       if (f === null) return null;
       const date = (iso: string) => shortDate(iso, today);
       let compare: { text: string; late: boolean } | null = null;
       if (f.finish !== null && f.deadline !== null) {
         if (f.overflow_days > 0) compare = { text: `${plural(f.overflow_days, "working day")} past the deadline`, late: true };
         else if (f.finish === f.deadline) compare = { text: "on the deadline", late: false };
         else compare = { text: `${plural(workdaysAfter(f.finish, f.deadline), "working day")} spare`, late: false };
       }
       return (
         <section aria-label="Project forecast" className="grid gap-4 rounded border bg-card px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
           <div className="flex flex-col gap-0.5">
             <span className="text-xs text-muted-foreground">Project forecast · open roadmap epics</span>
             <span className="text-lg font-semibold">{f.finish === null ? "No estimate: every open epic is unestimated" : `Finishes ${date(f.finish)}`}</span>
             {compare !== null && <span className={cn("text-sm", compare.late ? "text-state-blocked" : "text-state-ready")}>{compare.text}</span>}
             {f.deadline !== null ? (
               <span className="text-sm text-muted-foreground">{`Deadline ${date(f.deadline)}`}</span>
             ) : (
               <span className="flex flex-wrap items-center gap-1 text-sm">
                 No deadline · add <code className="rounded bg-muted px-1.5 font-mono text-xs">- Deadline: YYYY-MM-DD</code> to the roadmap
               </span>
             )}
           </div>
           <Figure label="Default lanes" value={plural(f.lanes, "lane")} />
           <Figure label="Open epics" value={plural(f.open_epics, "open epic")} />
           <Figure label="Unestimated" value={`${f.unestimated} unestimated`} warn={f.unestimated > 0} />
           {f.error !== null && <p className="text-sm text-destructive md:col-span-4">{f.error}</p>}
         </section>
       );
     }

     function Figure({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
       return (
         <div className="flex flex-col gap-0.5">
           <span className="text-xs text-muted-foreground">{label}</span>
           <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", warn && "text-state-blocked")}>
             {warn && <TriangleAlert role="img" aria-label="Warning" className="size-3.5" />}
             {value}
           </span>
         </div>
       );
     }
     ```
   - `MilestonesPage.tsx`:
     - `COLUMNS` becomes `"md:grid-cols-[8rem_minmax(0,1fr)_11rem_5rem_9rem_7rem]"`.
     - In `MilestoneTable`, destructure `const { milestones, today, forecast } = state.data;`. Render `<ForecastCard forecast={forecast} today={today} />` right after the "Refresh failed" status line, before the empty state and the list.
     - In the header row, add `<span>Lanes</span>` after `<span>Period</span>`.
     - In `Row`, append to the Period `flex-col` span, after the start–end line:
     ```tsx
     {m.finish !== null && (
       <span className={cn(m.finish > m.end ? "text-state-blocked" : "text-muted-foreground")}>{`Finishes ${date(m.finish)}`}</span>
     )}
     ```
     - After that span, before the `m.error` branch, add:
     ```tsx
     <span className="text-sm">{m.lanes === null ? "–" : plural(m.lanes, "lane")}</span>
     ```
   - `MilestonePage.tsx`, in `MilestoneHeader`, after the outcome span:
     ```tsx
     {plan.lanes !== null && <span>{plural(plan.lanes, "lane")}</span>}
     ```
5. Run:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   ```
   Expected: all pass. If an existing `MilestonesPage` assertion breaks because the row text changed, fix the assertion and not the requirement. For example, `toHaveTextContent("2 Nov – 18 Dec")` still holds, because the finish is a separate span.
6. Commit: `git commit -m "feat(milestones): forecast card, lanes and finish (gin-console-cl0)"`

### Track 3: Bead text as Markdown
- **Dependencies**: none
- **Requirements**: REQ-UI-028, REQ-UI-038
- **Files**:
  - Modify `frontend/package.json` and `frontend/pnpm-lock.yaml` (add `react-markdown@^10.1.0`, `remark-gfm@^4.0.1`, `remark-breaks@^4.0.0`)
  - Create `frontend/src/features/beads/MarkdownView.tsx`
  - Create `frontend/src/features/beads/MarkdownText.tsx`
  - Modify `frontend/src/features/beads/TextSection.tsx` (body renders `MarkdownText`)
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:160-164` (description renders `MarkdownText`)
  - Modify `frontend/src/index.css` (append the `.markdown` block)
  - Test `frontend/src/features/beads/MarkdownView.test.tsx` (create)
  - Test `frontend/src/features/beads/BeadDetailPage.test.tsx:180-215,363-377` (plain-text tests become Markdown tests)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** the code is small, but it is security-relevant: raw HTML and link URLs. The library behavior was verified on 2026-11-08, and each unsafe case has a scenario and a test, so the middle model with care is enough.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-028 and REQ-UI-038 has a test.
  - Raw HTML produces no `script` or `img` element, and a `javascript:` link and a relative link render as text.
  - `pnpm -C frontend build` puts react-markdown in a separate chunk. The `index-*.js` chunk grows by under 5 kB, compared with 499.52 kB before the change.
  - The frontend suite, typecheck, lint and build pass.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// MarkdownView.tsx
export const safeUrl: (url: string) => string;
export function MarkdownView({ text }: { text: string }): JSX.Element;
// MarkdownText.tsx
export function MarkdownText({ text }: { text: string }): JSX.Element;
```

Steps:

1. Add the dependencies: `pnpm -C frontend add react-markdown@^10.1.0 remark-gfm@^4.0.1 remark-breaks@^4.0.0`.
2. Write the failing tests.
   - `MarkdownView.test.tsx`:
     ```tsx
     import { cleanup, render, screen } from "@testing-library/react";
     import { afterEach, describe, expect, it } from "vitest";
     import { MarkdownView, safeUrl } from "./MarkdownView";

     afterEach(cleanup);

     describe("MarkdownView", () => {
       it("REQ-UI-028 markdown description: heading, bold list item, code block", () => {
         const { container } = render(<MarkdownView text={"## Change\n1. Format **dates**\n\n```\nuv run pytest\n```"} />);
         expect(screen.getByRole("heading", { name: "Change" })).toBeInTheDocument();
         expect(container.querySelector("ol > li > strong")?.textContent).toBe("dates");
         expect(container.querySelector("pre > code")?.textContent).toBe("uv run pytest\n");
       });

       it("REQ-UI-028 raw HTML stays text", () => {
         const raw = "<script>x</script> and <img src=x onerror=alert(1)>";
         const { container } = render(<MarkdownView text={raw} />);
         expect(container).toHaveTextContent(raw);
         expect(container.querySelector("script")).toBeNull();
         expect(container.querySelector("img")).toBeNull();
       });

       it("REQ-UI-028 unsafe link: javascript and relative are text, https opens in a new tab", () => {
         render(<MarkdownView text={"[run](javascript:alert(1)) [rel](docs/a.md) [docs](https://example.com) [mail](mailto:a@b.c)"} />);
         expect(screen.queryByRole("link", { name: "run" })).toBeNull();
         expect(screen.queryByRole("link", { name: "rel" })).toBeNull();
         const docs = screen.getByRole("link", { name: "docs" });
         expect(docs).toHaveAttribute("href", "https://example.com");
         expect(docs).toHaveAttribute("target", "_blank");
         expect(docs).toHaveAttribute("rel", "noreferrer");
         expect(screen.getByRole("link", { name: "mail" })).toHaveAttribute("href", "mailto:a@b.c");
       });

       it("REQ-UI-038 task list item is a disabled checkbox", () => {
         render(<MarkdownView text={"- [ ] Local time"} />);
         const box = screen.getByRole("checkbox");
         expect(box).toBeDisabled();
         expect(box).not.toBeChecked();
       });

       it("REQ-UI-028 single line breaks are kept", () => {
         const { container } = render(<MarkdownView text={"first line\nsecond line"} />);
         expect(container.querySelector("br")).not.toBeNull();
       });

       it("safeUrl keeps http, https and mailto only", () => {
         expect(["https://a", "http://a", "mailto:a@b", "javascript:x", "/beads", "docs/a.md"].map(safeUrl)).toEqual([
           "https://a",
           "http://a",
           "mailto:a@b",
           "",
           "",
           "",
         ]);
       });
     });
     ```
   - In `BeadDetailPage.test.tsx`, rename `"REQ-UI-028 shows fields and description as plain text"` to `"REQ-UI-028 shows fields and the description as Markdown"`. Keep its field assertions and `rawDesc`. Replace any assertion on the description paragraph with:
     ```tsx
     expect(await screen.findByText("bold", { selector: "strong" })).toBeInTheDocument();
     expect(screen.getByText(/<script>window\.hacked = 1<\/script>/)).toBeInTheDocument();
     expect(container.querySelector("script")).toBeNull();
     ```
   - Replace the body of `"REQ-UI-038 plain text"`, renamed to `"REQ-UI-038 markdown sections"`, with:
     ```tsx
     const bead = beadDetail("a-5", {
       acceptance_criteria: "- [ ] Local time",
       design: "<script>window.hacked = 1</script> **bold**\nline two",
       comment_count: 0,
     });
     stubFetch(bead);
     const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);
     expect(await screen.findByText("bold", { selector: "strong" })).toBeInTheDocument();
     expect(await screen.findByRole("checkbox")).toBeDisabled();
     expect(screen.getByText(/<script>window\.hacked = 1<\/script>/)).toBeInTheDocument();
     expect(container.querySelector("script")).toBeNull();
     ```
3. Run and check that they fail: `pnpm -C frontend test --run src/features/beads`. Expected: `MarkdownView.test.tsx` cannot import `./MarkdownView`, and the two renamed `BeadDetailPage` tests fail to find a `strong` element.
4. Implement.
   - `MarkdownView.tsx`:
     ```tsx
     import Markdown, { type Components } from "react-markdown";
     import remarkBreaks from "remark-breaks";
     import remarkGfm from "remark-gfm";

     const SAFE = /^(https?:|mailto:)/i;
     /** Only http, https and mailto URLs survive; anything else, relative paths included, becomes "" (REQ-UI-028). */
     export const safeUrl = (url: string) => (SAFE.test(url) ? url : "");

     const components: Components = {
       a: ({ href, children }) =>
         href ? (
           <a href={href} target="_blank" rel="noreferrer">
             {children}
           </a>
         ) : (
           <span>{children}</span>
         ),
     };

     /** Bead text as GitHub-flavored Markdown; raw HTML is escaped by react-markdown (no rehype-raw). */
     export function MarkdownView({ text }: { text: string }) {
       return (
         <div className="markdown break-words">
           <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} urlTransform={safeUrl} components={components}>
             {text}
           </Markdown>
         </div>
       );
     }
     ```
   - `MarkdownText.tsx`:
     ```tsx
     import { lazy, Suspense } from "react";

     const MarkdownView = lazy(() => import("./MarkdownView").then((m) => ({ default: m.MarkdownView })));

     /** Bead text as Markdown in its own chunk; the text as typed until that chunk loads. */
     export function MarkdownText({ text }: { text: string }) {
       return (
         <Suspense fallback={<p className="whitespace-pre-wrap break-words">{text}</p>}>
           <MarkdownView text={text} />
         </Suspense>
       );
     }
     ```
   - `TextSection.tsx`: replace the `<p className="whitespace-pre-wrap break-words">{text}</p>` with `<MarkdownText text={text} />`, and import it from `./MarkdownText`.
   - `BeadDetailPage.tsx:163`: replace `<p className="whitespace-pre-wrap break-words">{bead.description}</p>` with `<MarkdownText text={bead.description} />`, and import it.
   - `index.css`, append:
     ```css
     .markdown > :first-child { margin-top: 0; }
     .markdown > :last-child { margin-bottom: 0; }
     .markdown :is(h1, h2, h3, h4) { font-weight: 600; margin: 1rem 0 0.375rem; }
     .markdown :is(p, ul, ol, pre, table, blockquote) { margin: 0 0 0.625rem; }
     .markdown :is(ul, ol) { padding-left: 1.375rem; }
     .markdown ul { list-style: disc; }
     .markdown ol { list-style: decimal; }
     .markdown li.task-list-item { list-style: none; margin-left: -1.125rem; }
     .markdown li.task-list-item input { margin-right: 0.375rem; }
     .markdown code { font-family: var(--font-mono); font-size: 0.875em; background: var(--muted); border-radius: 0.25rem; padding: 0.0625rem 0.3125rem; }
     .markdown pre { background: var(--muted); border-radius: 0.375rem; padding: 0.625rem 0.75rem; overflow-x: auto; }
     .markdown pre code { background: none; padding: 0; }
     .markdown a { color: var(--state-progress); text-decoration: underline; text-underline-offset: 2px; }
     .markdown table { border-collapse: collapse; font-size: 0.875rem; display: block; overflow-x: auto; }
     .markdown :is(th, td) { border: 1px solid var(--border); padding: 0.25rem 0.5rem; text-align: left; }
     .markdown blockquote { padding-left: 0.625rem; border-left: 3px solid var(--border); color: var(--muted-foreground); }
     ```
5. Run:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   pnpm -C frontend build
   ```
   Expected:
   - Everything passes.
   - The build lists a separate `MarkdownView-*.js` chunk.
   - `index-*.js` stays within 5 kB of 499.52 kB.
6. Commit: `git commit -m "feat(beads): render bead text as Markdown (gin-console-cl0)"`

### Track 4: Contract record and manual check on Tailscale
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-017, REQ-UI-028, REQ-UI-038 (manual cases TC-1, TC-2)
- **Files**:
  - Modify `../gin-harness/docs/changes/gin-harness-6s4-milestones/design.md:53-97` (the JSON contract: `lanes` and `forecast`)
  - Modify `docs/changes/gin-console-cl0-milestones-forecast/05-tests.md` (TC-1 and TC-2 evidence)
- **Provider role**: `docs`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a documentation edit copied from the gin-workflow contract, plus a scripted deploy. A person checks the result.
- **Human gate**: the user runs TC-1 and TC-2 on the Tailscale deploy (https://instance-20260515-2304.tail5ca54e.ts.net:8443) and gives a pass or fail. The gin-harness edit is committed in gin-harness only when the user asks.
- **Acceptance criteria**:
  - In the contract record:
    - the list example shows `"lanes": 1` on the entry and a `forecast` object;
    - the show example shows `"lanes": 1`;
    - the field table has rows for `lanes` (list entry and show), `forecast` (and each of its keys), marked "added by milestone-forecast (gin-workflow-57fw); absent before it".
  - The `05-tests.md` evidence column holds the user's result for TC-1 and TC-2.
- **Estimated complexity**: low

Steps:

1. Edit the contract record.
   - In the list example, add `"lanes": 1,` after `"kickoff": null,` in the entry. After `"today": "2026-10-29"`, add:
     ```json
      "forecast": {"deadline": "2026-12-31", "lanes": 1, "start": "2026-10-29", "finish": "2026-12-22",
                   "overflow_days": 0, "open_epics": 6, "unestimated": 0, "error": null}
     ```
   - In the show example, add `"lanes": 1,` after `"overflow_days": 2,`.
   - Add the following table rows after `today`:
     - `lanes` (list entry and show): effective lanes, never null: the milestone's `lanes` metadata, else the roadmap `AI capacity:`, else the team member count, else 1.
     - `forecast`: `null` when no open epic has the `roadmap` label. Otherwise an object with these keys:
       - `deadline`: the roadmap `- Deadline:` date or `null`.
       - `lanes`: the default lanes for epics outside milestones.
       - `start`: today.
       - `finish`: `null` only when every open epic is unestimated.
       - `overflow_days`: working days after `deadline` up to `finish`; 0 without a deadline or when on time.
       - `open_epics` and `unestimated`.
       - `error`: a bad `Deadline:` value or a cycle; the other keys are still filled.
     - A sentence under the table: "`lanes` and `forecast` were added by milestone-forecast (gin-workflow-57fw, 2026-11-08); a gin-workflow before it omits them, and gin-console reads them as null."
2. Deploy, following the `deploy-to-tailscale-for-ui-verification` memory. Run each command separately:
   ```bash
   git -C /home/gin/gin-fam/gin-console merge --ff-only <track branch holding Tracks 1-3>
   pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile
   pnpm -C /home/gin/gin-fam/gin-console/frontend build
   systemctl --user restart gin-console
   systemctl --user is-active gin-console
   curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health
   ```
   Expected: `active` and `200`. Report the rollback command (`git -C /home/gin/gin-fam/gin-console reset --hard <previous master commit>`, then rebuild and restart).
3. Ask the user to run TC-1 (Milestones for gin-workflow and gin-console against `gin-workflow milestone list --json`, light and dark) and TC-2 (a bead with Markdown, light and dark). Record each result in `05-tests.md` as `pass, <user>, <date> (Tailscale build of <commit>)` or the failure.
4. Commit the `05-tests.md` update: `git commit -m "test(specs): record TC-1 and TC-2 (gin-console-cl0)"`. Leave the gin-harness edit uncommitted unless the user asks.

## Integration
- **Branch**: `feat/gin-console-cl0-milestones-forecast`. Tracks 1–3 work on their own track branches and merge into it. Track 4 runs on it after those merges.
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass; react-markdown is in its own chunk
- [ ] `gin specs lint --change gin-console-cl0` prints `ok`; `gin specs trace --change gin-console-cl0` lists no missing REQ
- [ ] TC-1 and TC-2 pass on the Tailscale deploy

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog (`haiku`, `sonnet`, `opus`; `low` to `max`) using the route rubric. The user may override them before plan approval.
- The Parent Bead (`gin-console-cl0`) stays open until the human-confirmed merge. Each track bead closes when its tests and review pass.
- `remark-breaks` is the one implementation choice not named in the spec delta. It keeps single line breaks, as the plain text did and as GitHub renders issue text. It is recorded in `03-design.md`.
- The cross-repo parent `gin-harness-ejc` closes after this epic ships (`bd -C gin-harness close gin-harness-ejc`). That is not part of any track.
