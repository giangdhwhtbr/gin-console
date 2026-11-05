# Plan: Reports tabs

Epic: gin-console-xza
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder.

## Objective
The Reports page shows four tabs: Delivery, AI usage, Quality and Data coverage. Each tab shows a headline under its name and opens with its own row of figures. The selected tab is kept in the URL. Each tab's content matches the approved mockup in `docs/specs/reports/assets/mockup/`. The report API gains `totals.cache_ratio` and `delivery.overall`. Every scenario of REQ-UI-088 to REQ-UI-092, REQ-UI-095, REQ-REPORTS-003 and REQ-REPORTS-004 has a test, or a manual case in `05-tests.md`.

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
- **Problem statement:** the Reports page is one long scroll (REQ-UI-088 to REQ-UI-093). A reader scrolls past every section to reach one, and nothing summarizes the sections.
- **Success criteria:** see Objective. In addition:
  - the four tabs match `reports-delivery.png`, `reports-ai-usage.png`, `reports-quality.png` and `reports-data-coverage.png`, with the Milestones tab left out;
  - `uv run --directory backend pytest`, `ruff`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Global constraints** (from the spec and `AGENTS.md`):
  - The console is read-only.
  - The page makes one `GET /api/reports` per project, period and sprint; a tab change makes no request.
  - No new dependency is added.
  - The API keeps `usage.members` and `quality.epics`.
  - Costs are labelled "estimated", and an absent cost reads "no price".
  - The warning color is the `state-blocked` token.
  - The code keeps working on Linux, macOS and Windows.
- **Non-goals:**
  - The Milestones tab, the burndown, and any milestone data (epic 2).
  - Loading tabs separately.
  - Removing fields from the API.

## Approach Options
### Option 1: one request, tabs only in the frontend, two small backend fields
- **Summary:** keep the report endpoint and add `totals.cache_ratio` and `delivery.overall`. Split the page into tabs from the one answer.
- **Pros:**
  - Smallest change.
  - Instant tab switches.
  - Headlines need no extra requests.
- **Cons:** each tab draws only part of a report that is fully computed.

### Option 2: one endpoint per tab
- **Summary:** `/api/reports/delivery`, `/api/reports/usage`, and so on.
- **Pros:** each tab computes only its own part.
- **Cons:**
  - The headlines would need all four requests anyway.
  - It duplicates the cache.
  - The report is already cached for 60 s.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the headlines need every section, and the backend already builds every section in one pass and caches it. The two added fields cannot be derived in the frontend: a median cannot be rebuilt from per-type medians, and the `models` rows can miss tokens that are not under a role.

## Scope
- **In scope:**
  - `backend/src/gin_console/reports/models.py` and `service.py`, with their tests.
  - `frontend/src/components/Tabs.tsx`.
  - `frontend/src/features/reports/*`.
- **Out of scope:**
  - Other pages.
  - The milestones code.
  - Living specs, which are merged at ship by `specs archive`.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Tracks 2 to 4 edit the same frontend folder and test files (ReportsPage, sections.test.tsx, reportFixtures.ts), and Track 2 needs the API fields of Track 1; one track at a time avoids merge conflicts and keeps each track reviewable on its own.
```

## Tasks

### Track 1: Report API gains overall times and total cache ratio
- **Dependencies**: none
- **Requirements**: REQ-REPORTS-003, REQ-REPORTS-004
- **Files**:
  - Modify `backend/src/gin_console/reports/models.py:81-87` (`Totals` adds `cache_ratio`), `backend/src/gin_console/reports/models.py:184-191` (`DeliverySection` adds `overall`)
  - Modify `backend/src/gin_console/reports/service.py:222-249` (`_cache_ratio` helper; `_totals` and `_member_usage` use it), `backend/src/gin_console/reports/service.py:371-375` (`_delivery` sets `overall`)
  - Test `backend/tests/test_reports_service.py`
  - Test `backend/tests/test_reports_api.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** two fields, built from helpers that already exist (`_times`, and the member cache-ratio formula), with the expected values given in the spec scenarios.
- **Acceptance criteria**:
  - `totals.cache_ratio` is `sum(cache_read) / sum(input + cache_read + cache_write)` over `m.own.models` of every measured bead, rounded to 4 places, or `None` when the denominator is 0.
  - `delivery.overall` is a `TimeRow` with key `all`: the cycle and lead stats over all closed beads, with each stat `None` when no bead has that time.
  - The new tests pass, and so does the existing backend suite.
- **Estimated complexity**: low

Interfaces produced (consumed by Track 2):
```python
class Totals(BaseModel):
    tokens: int
    cost: float | None
    closed: int
    tokens_per_bead: float | None
    cache_ratio: float | None
    rework_rate: float | None

class DeliverySection(BaseModel):
    weeks: list[WeekRow]
    by_type: list[TimeRow]
    by_member: list[TimeRow]
    overall: TimeRow  # key "all"
    wip: list[WipRow]
    oldest: list[WipBead]
    estimates: list[EstimateRow]
```

Steps:

1. Write the failing tests. Append to `backend/tests/test_reports_service.py`, under the `# REQ-REPORTS-003` block, after `test_reports_003_nested_epics_roll_up`:
   ```python
   def test_reports_003_total_cache_ratio() -> None:
       a = usage(100)
       a["models"]["m"] = {"input": 100, "output": 0, "cache_read": 300, "cache_write": 0, "cost": None}
       b = usage(100)
       b["models"]["m"] = {"input": 100, "output": 0, "cache_read": 0, "cache_write": 0, "cost": None}
       r = report([closed("a-1", ago(2), ai=a), closed("a-2", ago(2), ai=b)])
       assert r.totals.cache_ratio == 0.6


   def test_reports_003_total_cache_ratio_absent_without_reads() -> None:
       r = report([closed("a-1", ago(2), ai=usage(100))])
       assert r.totals.cache_ratio is None
   ```
   Under the `# REQ-REPORTS-004` block, after `test_reports_004_missing_start_and_inverted_times`:
   ```python
   def test_reports_004_overall_over_all_types() -> None:
       r = report(
           [
               closed("a-1", ago(5), started_at=ago(6), created_at=ago(6)),
               closed("b-1", ago(5), issue_type="bug", started_at=ago(8), created_at=ago(8)),
           ]
       )
       overall = r.delivery.overall
       assert overall.key == "all"
       assert overall.cycle is not None and (overall.cycle.n, overall.cycle.median) == (2, 2.0)
       assert overall.lead is not None and overall.lead.median == 2.0


   def test_reports_004_overall_absent_when_nothing_closed() -> None:
       r = report([row("a-1", status="open")])
       assert r.delivery.overall.key == "all"
       assert r.delivery.overall.cycle is None and r.delivery.overall.lead is None
   ```
   Append to `backend/tests/test_reports_api.py`, after `test_reports_001_default_period_is_30_days`:
   ```python
   # REQ-REPORTS-003, REQ-REPORTS-004
   def test_reports_003_004_new_fields_in_json(tmp_path: Path) -> None:
       fake = FakeBd([closed("a-1", 3)])
       body = make(tmp_path, {"alpha": fake}).get("/api/reports", params={"project": "alpha"}).json()
       assert "cache_ratio" in body["totals"]
       assert body["delivery"]["overall"]["key"] == "all"
   ```
2. Run the tests and check that they fail:
   ```bash
   uv run --directory backend pytest tests/test_reports_service.py tests/test_reports_api.py -k "cache_ratio or overall or new_fields"
   ```
   Expected: 5 failures (`AttributeError` / `KeyError` on `cache_ratio` and `overall`).
3. Implement.
   - In `models.py`, add `cache_ratio: float | None` to `Totals` after `tokens_per_bead`. Add `overall: TimeRow` to `DeliverySection` after `by_member`.
   - In `service.py`, add a helper above `_totals`:
     ```python
     def _cache_ratio(models: list[Tokens]) -> float | None:
         read_side = sum(t.input + t.cache_read + t.cache_write for t in models)
         return round(sum(t.cache_read for t in models) / read_side, 4) if read_side else None
     ```
   - In `_totals`, pass `cache_ratio=_cache_ratio([t for m in measured for t in m.own.models.values()])`.
   - In `_member_usage`, replace the `read_side` line and the `cache_ratio=` expression with `cache_ratio=_cache_ratio(models)`.
   - In `_delivery`'s `DeliverySection(...)`, after `by_member=...`, add:
     ```python
     overall=(_times(closed, lambda _: "all") or [TimeRow(key="all", cycle=None, lead=None)])[0],
     ```
4. Run the tests again:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expected: all tests pass, and ruff and mypy are clean.
5. Commit on the track branch:
   ```bash
   git commit -m "feat(reports): overall times and total cache ratio (gin-console-xza)"
   ```

### Track 2: Report tabs, headlines and figures
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-095, REQ-UI-088
- **Files**:
  - Modify `frontend/src/components/Tabs.tsx` (optional `hint`, sideways scroll)
  - Modify `frontend/src/features/reports/filters.ts` (`ReportTab`, `TABS`, `tab` in filters)
  - Modify `frontend/src/features/reports/api.ts:3-9,62-69,128-133` (`Totals.cache_ratio`, `DeliverySection.overall`, `fetchReport` parameter type)
  - Create `frontend/src/features/reports/headlines.ts`
  - Create `frontend/src/features/reports/Figures.tsx`
  - Delete `frontend/src/features/reports/KpiRow.tsx`
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (header, tabs, panel)
  - Modify `frontend/src/features/reports/reportFixtures.ts` (new fields)
  - Test `frontend/src/features/reports/filters.test.ts`
  - Test `frontend/src/features/reports/headlines.test.ts`
  - Test `frontend/src/features/reports/ReportsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded page restructure in one feature folder plus one shared component, with exact headline and figure rules in the spec; the risk is breaking the other users of `Tabs` and the late-answer behaviour, both covered by existing tests.
- **Acceptance criteria**:
  - The REQ-UI-095 scenarios pass as vitest cases: shared link, unknown tab, change tab without a new request, headlines, no gaps, and the keyboard.
  - The REQ-UI-088 cases are updated for `tab=delivery` in the URL, and the new case "period kept across tabs" passes.
  - The REQ-UI-093 cases still pass.
  - `MilestonePage.test.tsx` and the bead detail tests pass without changes.
- **Estimated complexity**: medium

Interfaces produced (consumed by Tracks 3 and 4):
```ts
// filters.ts
export type ReportTab = "delivery" | "usage" | "quality" | "coverage";
export const TABS: readonly ReportTab[];
export type ReportFilters = { project: string; days: Period; sprint: string; tab: ReportTab };
// api.ts
export type Totals = { tokens: number; cost: number | null; closed: number; tokens_per_bead: number | null; cache_ratio: number | null; rework_rate: number | null };
export type DeliverySection = { weeks; by_type; by_member; overall: TimeRow; wip; oldest; estimates };
export async function fetchReport(filters: Pick<ReportFilters, "project" | "days" | "sprint">): Promise<Report>;
// headlines.ts
export type Headline = { text: string; warn: boolean };
export function gapCount(report: Report): number;
export function headlines(report: Report): Record<ReportTab, Headline>;
export function figures(tab: ReportTab, report: Report): [string, string][];
// Figures.tsx
export function Figures({ items }: { items: [string, string][] }): JSX.Element | null;
// Tabs.tsx
export type TabItem<T extends string> = { value: T; label: string; hint?: ReactNode };
```
The panel renders the sections with their current props: `<DeliverySection delivery={r.delivery} />`, `<UsageSection usage={r.usage} project={r.project} />`, `<QualitySection quality={r.quality} />` and `<CoverageSection coverage={r.coverage} errors={r.errors} />`.

Steps:

1. Before editing, run `gin-workflow rules --files frontend/src/components/Tabs.tsx frontend/src/features/reports/ReportsPage.tsx` and follow its output.
2. Update the fixture so it matches the new API.
   - In `reportFixtures.ts`, set `totals` to `{ tokens: 51136800, cost: 12.34, closed: 4, tokens_per_bead: 12784200, cache_ratio: 0.9, rework_rate: 0.25 }`.
   - Add `overall: { key: "all", cycle: null, lead: null }` to `delivery`.
   - In `api.ts`, add `cache_ratio: number | null;` to `Totals`, after `tokens_per_bead`. Add `overall: TimeRow;` to `DeliverySection`, after `by_member`. Change the `fetchReport` parameter type to `Pick<ReportFilters, "project" | "days" | "sprint">`.
3. Write the failing tests.
   - In `filters.test.ts`, change the expectations to:
     ```ts
     it("REQ-UI-088 parses a shared link", () => {
       expect(parseReportSearch("?project=all&days=7")).toEqual({ project: "all", days: 7, sprint: "", tab: "delivery" });
     });
     it("REQ-UI-095 parses the tab and falls back to delivery", () => {
       expect(parseReportSearch("?tab=quality").tab).toBe("quality");
       expect(parseReportSearch("?tab=nope").tab).toBe("delivery");
     });
     it("REQ-UI-088 writes and encodes the search", () => {
       expect(reportSearch({ project: "alpha", days: 90, sprint: "", tab: "delivery" })).toBe("?project=alpha&days=90&tab=delivery");
       expect(reportSearch({ project: "alpha", days: 90, sprint: "s7", tab: "usage" })).toBe("?project=alpha&days=90&sprint=s7&tab=usage");
       expect(reportSearch({ project: "a b", days: 7, sprint: "x&y", tab: "coverage" })).toBe("?project=a+b&days=7&sprint=x%26y&tab=coverage");
     });
     ```
     Keep the "falls back to 30 days" case.
   - Create `headlines.test.ts`:
     ```ts
     import { describe, expect, it } from "vitest";
     import { figures, gapCount, headlines } from "./headlines";
     import { report } from "./reportFixtures";

     const base = report();
     const bead = (id: string) => ({ project: "alpha", id, title: id, detail: "" });

     describe("report headlines", () => {
       it("REQ-UI-095 headlines", () => {
         const r = report({
           totals: { ...base.totals, closed: 41, tokens: 12_400_000, cost: 38.2, rework_rate: 0.09 },
           coverage: { ...base.coverage, not_collected: [bead("a"), bead("b"), bead("c")], invalid: [bead("d")], unpriced: ["m"] },
         });
         expect(headlines(r)).toEqual({
           delivery: { text: "41 beads closed", warn: false },
           usage: { text: "12.4M tokens, $38.20", warn: false },
           quality: { text: "9% rework", warn: false },
           coverage: { text: "5 gaps", warn: true },
         });
       });
       it("REQ-UI-095 no price, no rate, one gap, no gaps", () => {
         const r = report({ totals: { ...base.totals, cost: null, rework_rate: null }, errors: [{ project: "beta", error: "x" }] });
         expect(headlines(r).usage.text).toBe("51.1M tokens, no price");
         expect(headlines(r).quality.text).toBe("— rework");
         expect(headlines(r).coverage).toEqual({ text: "1 gap", warn: true });
         expect(gapCount(base)).toBe(0);
         expect(headlines(base).coverage).toEqual({ text: "0 gaps", warn: false });
       });
       it("REQ-UI-090 delivery figures", () => {
         const r = report({
           delivery: { ...base.delivery, overall: { key: "all", cycle: { n: 2, median: 0.7, p85: 1 }, lead: null }, wip: [{ member: "ann", count: 2 }, { member: "bao", count: 4 }] },
         });
         expect(figures("delivery", r)).toEqual([["Beads closed", "4"], ["Median cycle time", "0.7 d"], ["Median lead time", "—"], ["In progress now", "6"]]);
       });
       it("REQ-UI-089 usage figures", () => {
         expect(figures("usage", base)).toEqual([["Tokens", "51.1M"], ["Estimated cost", "$12.34"], ["Tokens per closed bead", "12.8M"], ["Cache reads", "90%"]]);
       });
       it("REQ-UI-091 quality figures", () => {
         const row = { project: null, title: null, rejections: 0, waivers: 0, findings: { critical: 0, important: 0, minor: 0, suggestion: 0 }, rework_rate: 0 };
         const r = report({
           quality: { ...base.quality, members: [{ ...row, key: "ann", beads: 4, reopens: 1, bugs: 0, review_cycles: 5 }, { ...row, key: "bao", beads: 1, reopens: 0, bugs: 1, review_cycles: 1 }] },
         });
         expect(figures("quality", r)).toEqual([["Rework rate", "25%"], ["Reopens", "1"], ["Bugs found later", "1"], ["Review cycles per bead", "1.2"]]);
         expect(figures("quality", base)[3]).toEqual(["Review cycles per bead", "—"]);
         expect(figures("coverage", base)).toEqual([]);
       });
     });
     ```
   - In `ReportsPage.test.tsx`, replace the `describe` body as follows. Keep the helpers `json`, `project`, `stub`, `requested` and `withTokens`.
     ```ts
     const reportCalls = (mock: ReturnType<typeof stub>) => requested(mock).filter((u) => u.startsWith("/api/reports"));

     describe("ReportsPage", () => {
       it("REQ-UI-088 opens a shared link", async () => {
         window.history.replaceState(null, "", "/reports?project=all&days=7");
         const mock = stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         expect(screen.getByLabelText("Project")).toHaveValue("all");
         expect(screen.getByRole("option", { name: "All projects" })).toBeInTheDocument();
         expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
         expect(requested(mock)).toContain("/api/reports?project=all&days=7");
       });

       it("REQ-UI-088 defaults to the first project and changes the period", async () => {
         const mock = stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         expect(requested(mock)).toContain("/api/reports?project=alpha&days=30");
         await userEvent.click(screen.getByRole("button", { name: "90 days" }));
         expect(window.location.search).toBe("?project=alpha&days=90&tab=delivery");
         await screen.findByText("Beads closed");
         expect(requested(mock)).toContain("/api/reports?project=alpha&days=90");
       });

       it("REQ-UI-088 filters by sprint", async () => {
         const mock = stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         await userEvent.type(screen.getByLabelText("Sprint"), "s7{Enter}");
         expect(window.location.search).toBe("?project=alpha&days=30&sprint=s7&tab=delivery");
         await screen.findByText("Beads closed");
         expect(requested(mock)).toContain("/api/reports?project=alpha&days=30&sprint=s7");
       });

       it("REQ-UI-088 keeps the period across tabs", async () => {
         stub();
         render(<ReportsPage />);
         await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
         await userEvent.click(screen.getByRole("tab", { name: /^Quality/ }));
         expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
       });

       it("REQ-UI-088 shows 'no price' when the cost is unknown", async () => {
         window.history.replaceState(null, "", "/reports?tab=usage");
         stub(() => json(report({ totals: { ...report().totals, cost: null } })));
         render(<ReportsPage />);
         expect(await screen.findByText("no price")).toBeInTheDocument();
       });

       it("REQ-UI-095 opens the tab of a shared link", async () => {
         window.history.replaceState(null, "", "/reports?project=alpha&days=7&tab=quality");
         const mock = stub();
         render(<ReportsPage />);
         expect(await screen.findByText("Rework rate")).toBeInTheDocument();
         expect(screen.getByRole("tab", { name: /^Quality/ })).toHaveAttribute("aria-selected", "true");
         expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-quality");
         expect(requested(mock)).toContain("/api/reports?project=alpha&days=7");
       });

       it("REQ-UI-095 selects Delivery for an unknown tab", async () => {
         window.history.replaceState(null, "", "/reports?project=alpha&tab=nope");
         stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         expect(screen.getByRole("tab", { name: /^Delivery/ })).toHaveAttribute("aria-selected", "true");
       });

       it("REQ-UI-095 changes tab without a new request", async () => {
         window.history.replaceState(null, "", "/reports?project=alpha&days=90");
         const mock = stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         const before = reportCalls(mock).length;
         await userEvent.click(screen.getByRole("tab", { name: /^AI usage/ }));
         expect(window.location.search).toBe("?project=alpha&days=90&tab=usage");
         expect(await screen.findByText("Cache reads")).toBeInTheDocument();
         expect(reportCalls(mock)).toHaveLength(before);
       });

       it("REQ-UI-095 shows a headline under each tab", async () => {
         const base = report();
         stub(() => json(report({ coverage: { ...base.coverage, unpriced: ["m1", "m2"] } })));
         render(<ReportsPage />);
         expect(await screen.findByRole("tab", { name: /Delivery\s*4 beads closed/ })).toBeInTheDocument();
         expect(screen.getByRole("tab", { name: /AI usage\s*51\.1M tokens, \$12\.34/ })).toBeInTheDocument();
         expect(screen.getByRole("tab", { name: /Quality\s*25% rework/ })).toBeInTheDocument();
         expect(screen.getByRole("tab", { name: /Data coverage\s*2 gaps/ })).toBeInTheDocument();
       });

       it("REQ-UI-095 moves between tabs with the arrow keys", async () => {
         stub();
         render(<ReportsPage />);
         await screen.findByText("Beads closed");
         screen.getByRole("tab", { name: /^Delivery/ }).focus();
         await userEvent.keyboard("{ArrowRight}");
         const usage = screen.getByRole("tab", { name: /^AI usage/ });
         expect(usage).toHaveAttribute("aria-selected", "true");
         expect(usage).toHaveFocus();
         expect(window.location.search).toContain("tab=usage");
       });

       it("REQ-UI-093 shows a loading state without headlines", async () => {
         stub(() => new Promise<Response>(() => {}));
         render(<ReportsPage />);
         expect(await screen.findByText("Loading report…")).toBeInTheDocument();
         expect(screen.getByRole("tab", { name: "Delivery" })).toBeInTheDocument();
       });

       it("REQ-UI-093 shows an error and retries", async () => {
         let calls = 0;
         const mock = stub(() => (++calls === 1 ? json({ error: "boom" }, 502) : json(report())));
         render(<ReportsPage />);
         expect(await screen.findByText("boom")).toBeInTheDocument();
         await userEvent.click(screen.getByRole("button", { name: "Retry" }));
         expect(await screen.findByText("Beads closed")).toBeInTheDocument();
         expect(reportCalls(mock)).toHaveLength(2);
       });

       it("REQ-UI-093 warns about a partial failure and still shows the figures", async () => {
         stub(() => json(report({ errors: [{ project: "beta", error: "bd failed" }] })));
         render(<ReportsPage />);
         expect((await screen.findAllByText(/beta: bd failed/)).length).toBeGreaterThan(0);
         expect(screen.getByText("Some projects could not be read")).toBeInTheDocument();
         expect(screen.getByText("Beads closed")).toBeInTheDocument();
       });

       it("REQ-UI-093 drops a late answer", async () => {
         window.history.replaceState(null, "", "/reports?tab=usage");
         let release: (response: Response) => void = () => {};
         stub((url) =>
           url.searchParams.get("days") === "30"
             ? new Promise<Response>((resolve) => {
                 release = resolve;
               })
             : json(withTokens(7000)),
         );
         render(<ReportsPage />);
         await userEvent.click(await screen.findByRole("button", { name: "7 days" }));
         expect(await screen.findByText("7K")).toBeInTheDocument();
         release(json(withTokens(9000000)));
         await new Promise((resolve) => setTimeout(resolve, 20));
         expect(screen.getByText("7K")).toBeInTheDocument();
         expect(screen.queryByText("9M")).not.toBeInTheDocument();
       });
     });
     ```
4. Run the tests and check that they fail:
   ```bash
   pnpm -C frontend test --run src/features/reports
   ```
   Expected: the new filters, headlines and ReportsPage cases fail. `headlines.ts` is missing, `tab` is not parsed, and there is no tab list.
5. Implement.
   - `filters.ts`:
     ```ts
     export type Period = 7 | 30 | 90;
     export const PERIODS: readonly Period[] = [7, 30, 90];
     export type ReportTab = "delivery" | "usage" | "quality" | "coverage";
     export const TABS: readonly ReportTab[] = ["delivery", "usage", "quality", "coverage"];
     export type ReportFilters = { project: string; days: Period; sprint: string; tab: ReportTab };

     export function parseReportSearch(search: string): ReportFilters {
       const params = new URLSearchParams(search);
       const days = PERIODS.find((p) => String(p) === params.get("days")) ?? 30;
       const tab = TABS.find((t) => t === params.get("tab")) ?? "delivery";
       return { project: params.get("project") ?? "", days, sprint: params.get("sprint") ?? "", tab };
     }

     export function reportSearch(filters: ReportFilters): string {
       const params = new URLSearchParams({ project: filters.project, days: String(filters.days) });
       if (filters.sprint !== "") params.set("sprint", filters.sprint);
       params.set("tab", filters.tab);
       return `?${params.toString()}`;
     }
     ```
   - `headlines.ts`:
     ```ts
     import type { QualityRow, Report } from "./api";
     import type { ReportTab } from "./filters";
     import { formatCost, formatDays, formatPercent, formatTokens } from "./format";

     export type Headline = { text: string; warn: boolean };

     export function gapCount(report: Report): number {
       const c = report.coverage;
       return c.not_collected.length + c.invalid.length + c.unpriced.length + c.sources.length + report.errors.length;
     }

     export function headlines(report: Report): Record<ReportTab, Headline> {
       const { totals } = report;
       const gaps = gapCount(report);
       return {
         delivery: { text: `${totals.closed} beads closed`, warn: false },
         usage: { text: `${formatTokens(totals.tokens)} tokens, ${formatCost(totals.cost)}`, warn: false },
         quality: { text: `${formatPercent(totals.rework_rate)} rework`, warn: false },
         coverage: { text: gaps === 1 ? "1 gap" : `${gaps} gaps`, warn: gaps > 0 },
       };
     }

     export function figures(tab: ReportTab, report: Report): [string, string][] {
       const { totals, delivery, quality } = report;
       const sum = (pick: (r: QualityRow) => number) => quality.members.reduce((n, r) => n + pick(r), 0);
       switch (tab) {
         case "delivery":
           return [
             ["Beads closed", String(totals.closed)],
             ["Median cycle time", formatDays(delivery.overall.cycle?.median ?? null)],
             ["Median lead time", formatDays(delivery.overall.lead?.median ?? null)],
             ["In progress now", String(delivery.wip.reduce((n, w) => n + w.count, 0))],
           ];
         case "usage":
           return [
             ["Tokens", formatTokens(totals.tokens)],
             ["Estimated cost", formatCost(totals.cost)],
             ["Tokens per closed bead", totals.tokens_per_bead === null ? "—" : formatTokens(totals.tokens_per_bead)],
             ["Cache reads", formatPercent(totals.cache_ratio)],
           ];
         case "quality": {
           const beads = sum((r) => r.beads);
           return [
             ["Rework rate", formatPercent(totals.rework_rate)],
             ["Reopens", String(sum((r) => r.reopens))],
             ["Bugs found later", String(sum((r) => r.bugs))],
             ["Review cycles per bead", beads === 0 ? "—" : (sum((r) => r.review_cycles) / beads).toFixed(1)],
           ];
         }
         case "coverage":
           return [];
       }
     }
     ```
   - `Figures.tsx`:
     ```tsx
     /** A row of report figures: the value large, its label under it. */
     export function Figures({ items }: { items: [string, string][] }) {
       if (items.length === 0) return null;
       return (
         <dl className="flex flex-wrap gap-x-10 gap-y-3">
           {items.map(([label, value]) => (
             <div key={label} className="flex flex-col-reverse">
               <dt className="text-xs text-muted-foreground">{label}</dt>
               <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
             </div>
           ))}
         </dl>
       );
     }
     ```
   - `Tabs.tsx`:
     - Import `type ReactNode`.
     - Set `TabItem<T>` to `{ value: T; label: string; hint?: ReactNode }`.
     - Add `overflow-x-auto` to the tab list's class list.
     - Add `shrink-0 whitespace-nowrap text-left` to each tab button's base classes.
     - Destructure `hint` in the map and render the button content as:
       ```tsx
       {hint === undefined ? (
         text
       ) : (
         <span className="flex flex-col items-start py-2">
           <span>{text}</span>
           <span className="text-xs font-normal text-muted-foreground">{hint}</span>
         </span>
       )}
       ```
   - `ReportsPage.tsx`:
     - Imports to add: `TriangleAlert` from `lucide-react`, `Tabs` from `@/components/Tabs`, `cn` from `@/lib/utils`, `Figures`, `figures`, `headlines` and `type Headline` from `./headlines`, and `TABS` and `type ReportTab` from `./filters`.
     - Import to remove: `KpiRow`.
     - Add a constant:
       ```tsx
       const LABELS: Record<ReportTab, string> = { delivery: "Delivery", usage: "AI usage", quality: "Quality", coverage: "Data coverage" };
       const hintOf = (h: Headline) => (
         <span className={cn("inline-flex items-center gap-1", h.warn && "text-state-blocked")}>
           {h.warn && <TriangleAlert aria-hidden className="size-3.5" />}
           {h.text}
         </span>
       );
       ```
     - Read `tab` from `filters`. The `useEffect` and `key` stay on `selected`, `days`, `sprint` and `attempt`. `change` stays as it is; it already spreads `filters`, so `tab` is carried along.
     - Render, in this order, inside `<section className="flex flex-col gap-4">`:
       1. The header:
          ```tsx
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Reports</h1>
              {loaded.status === "ok" && (<p className="text-sm text-muted-foreground">Generated <time dateTime={loaded.report.generated_at}>{new Date(loaded.report.generated_at).toLocaleString()}</time></p>)}
            </div>
            {selected !== "" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Project
                <select aria-label="Project" ...existing select props and options... />
              </label>
            )}
          </div>
          ```
       2. The existing "Loading projects…", "Projects could not be loaded" and "No projects configured." states.
       3. When `selected !== ""`:
          - the `errors` warning, only when `loaded.status === "ok"` and errors are present (the existing markup);
          - then:
            ```tsx
            <Tabs
              label="Report"
              tab={tab}
              onChange={(next) => change({ ...filters, project: selected, tab: next })}
              tabs={TABS.map((value) => ({
                value,
                label: LABELS[value],
                hint: loaded.status === "ok" ? hintOf(headlines(loaded.report)[value]) : undefined,
              }))}
            />
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                {/* existing period buttons and sprint form, unchanged */}
                <p className="text-sm text-muted-foreground">Beads closed in the last {days} days, or the epics of a sprint</p>
              </div>
              {/* existing loading text and error Alert with Retry, unchanged */}
              {loaded.status === "ok" && (
                <>
                  <Figures items={figures(tab, loaded.report)} />
                  {tab === "delivery" && <DeliverySection delivery={loaded.report.delivery} />}
                  {tab === "usage" && <UsageSection usage={loaded.report.usage} project={loaded.report.project} />}
                  {tab === "quality" && <QualitySection quality={loaded.report.quality} />}
                  {tab === "coverage" && <CoverageSection coverage={loaded.report.coverage} errors={loaded.report.errors} />}
                </>
              )}
            </div>
            ```
     - Remove `<KpiRow …/>` and the `data-testid="report-sections"` wrapper.
   - Delete `KpiRow.tsx`.
6. Run all checks:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   ```
   Expected: everything passes, including `MilestonePage.test.tsx`. In `sections.test.tsx`, only fixture shape can fail; fix any fixture typing it reports by adding `overall` or `cache_ratio`.
7. Commit:
   ```bash
   git commit -m "feat(reports): tabs with headlines and figures (gin-console-xza)"
   ```

### Track 3: Delivery and AI usage tabs
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-090, REQ-UI-089
- **Files**:
  - Create `frontend/src/features/reports/BarRows.tsx`
  - Create `frontend/src/features/reports/RangeChart.tsx`
  - Modify `frontend/src/features/reports/format.ts` (`estimateDiff`)
  - Modify `frontend/src/features/reports/DeliverySection.tsx` (whole component)
  - Modify `frontend/src/features/reports/UsageSection.tsx` (whole component)
  - Test `frontend/src/features/reports/format.test.ts`
  - Test `frontend/src/features/reports/sections.test.tsx` (the REQ-UI-089 and REQ-UI-090 cases)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** two section rewrites with two small new chart components; the layout rules and edge cases (no budget, no price, empty rows, rounding) are spelled out in the spec.
- **Acceptance criteria**:
  - REQ-UI-090:
    - the "by member" scenario passes;
    - the "estimate chip" scenario passes (`+2 d` with `text-state-blocked`, `−2 d`, `−0.5 d`);
    - the "no estimates" scenario passes.
  - REQ-UI-089:
    - the member bar's `aria-label` holds beads, tokens, cost, tokens per bead and cache ratio;
    - a 117% budget meter has `aria-valuenow="117"` and `text-state-blocked`;
    - "No budget" and "no price" show where they should.
  - The REQ-UI-093 empty-section case still passes.
- **Estimated complexity**: medium

Interfaces produced:
```ts
// BarRows.tsx
export type Segment = { name: string; value: number; color: string };
export type BarRow = { key: string; segments: Segment[]; total: string; detail: string };
export function BarRows({ rows }: { rows: BarRow[] }): JSX.Element;
// RangeChart.tsx
export type Range = { key: string; n: number; median: number; p85: number };
export function RangeChart({ title, ranges }: { title: string; ranges: Range[] }): JSX.Element;
// format.ts
export function estimateDiff(estimateDays: number, actualDays: number): { text: string; late: boolean };
```

Steps:

1. Run `gin-workflow rules --files frontend/src/features/reports/DeliverySection.tsx frontend/src/features/reports/UsageSection.tsx` and follow its output.
2. Write the failing tests.
   - Create `format.test.ts`:
     ```ts
     import { describe, expect, it } from "vitest";
     import { estimateDiff } from "./format";

     describe("estimateDiff", () => {
       it("REQ-UI-090 estimate chip", () => {
         expect(estimateDiff(5, 7)).toEqual({ text: "+2 d", late: true });
         expect(estimateDiff(5, 3)).toEqual({ text: "−2 d", late: false });
         expect(estimateDiff(5, 4.5)).toEqual({ text: "−0.5 d", late: false });
         expect(estimateDiff(4.5, 4.5)).toEqual({ text: "on estimate", late: false });
         expect(estimateDiff(5, 4.96)).toEqual({ text: "on estimate", late: false });
       });
     });
     ```
   - In `sections.test.tsx`, replace the three REQ-UI-089 cases and the REQ-UI-090 case with:
     ```tsx
     it("REQ-UI-089 member bars carry each member's figures", () => {
       const base = report();
       const m = base.usage.members[0];
       const r = report({
         usage: {
           ...base.usage,
           members: [
             { ...m, member: "ann", stages: { execute: 30, review: 10 } },
             { ...m, member: "Unassigned", closed: 1, tokens: 50, cost: null, tokens_per_bead: 50, cache_ratio: null, stages: { execute: 5 } },
           ],
         },
       });
       render(usageOf(r));
       expect(screen.getByLabelText("ann: 4 beads closed, 51.1M tokens, $12.34 estimated, 12.8M tokens per bead, 90% cache reads")).toHaveAttribute("tabindex", "0");
       expect(screen.getByLabelText(/^Unassigned: 1 beads closed, 50 tokens, no price estimated/)).toBeTruthy();
       expect(screen.getByText("execute")).toBeTruthy();
       expect(screen.getByText("review")).toBeTruthy();
     });

     it("REQ-UI-089 epic budget meter, no budget, no price; top beads listed", () => {
       const base = report();
       const e = base.usage.epics[0];
       const r = report({
         usage: {
           ...base.usage,
           epics: [
             { ...e, id: "a-1", title: "Over", children: 4, closed_children: 3, budget: { budget_usd: 10, cost: 11.7, status: "over" } },
             { ...e, id: "a-2", title: "Free", budget: null },
             { ...e, id: "a-3", title: "Unpriced", budget: { budget_usd: 10, cost: null, status: "ok" } },
           ],
         },
       });
       render(usageOf(r));
       const meter = screen.getByRole("meter");
       expect(meter).toHaveAttribute("aria-valuenow", "117");
       expect(screen.getByText("117%")).toHaveClass("text-state-blocked");
       expect(screen.getByRole("link", { name: /Over/ }).getAttribute("href")).toBe("/beads/alpha/a-1");
       expect(screen.getByText("3/4")).toBeTruthy();
       expect(within(screen.getByRole("row", { name: /a-2 — Free/ })).getByText("No budget")).toBeTruthy();
       expect(within(screen.getByRole("row", { name: /a-3 — Unpriced/ })).getByText("no price")).toBeTruthy();
       expect(screen.getByText(/a-2 — Bead two/)).toBeTruthy();
     });

     it("REQ-UI-089 stage share as text; model table", () => {
       render(usageOf(report()));
       expect(screen.getByText("implement 78%, review 22%")).toBeTruthy();
       expect(screen.getByRole("row", { name: /opus developer 10 \$1\.00/ })).toBeTruthy();
     });

     it("REQ-UI-090 delivery: weeks, ranges by type and member, in progress, oldest", async () => {
       const base = report();
       const d: Delivery = {
         ...base.delivery,
         weeks: [
           { week: "2026-W43", counts: { task: 1, bug: 2 } },
           { week: "2026-W44", counts: { task: 3 } },
         ],
         by_type: [{ key: "task", cycle: { n: 3, median: 2, p85: 4 }, lead: null }],
         by_member: [{ key: "ann", cycle: { n: 3, median: 1.5, p85: 4 }, lead: { n: 3, median: 5, p85: 6 } }],
         wip: [{ member: "ann", count: 2 }],
         oldest: [{ project: "alpha", id: "a-7", title: "Old", assignee: "ann", age_days: 10 }],
       };
       const { container } = render(<DeliverySection delivery={d} />);
       expect(container.querySelectorAll(".recharts-bar").length).toBeGreaterThan(0);
       expect(screen.getByLabelText("task: 3 beads, median 2.0 d, 85th percentile 4.0 d")).toBeTruthy();
       fireEvent.click(screen.getByRole("button", { name: "By member" }));
       expect(screen.getByRole("button", { name: "By member" })).toHaveAttribute("aria-pressed", "true");
       expect(screen.getByLabelText("ann: 3 beads, median 1.5 d, 85th percentile 4.0 d")).toBeTruthy();
       expect(screen.getByLabelText("ann: 3 beads, median 5.0 d, 85th percentile 6.0 d")).toBeTruthy();
       expect(screen.getByLabelText("ann: 2 in progress")).toBeTruthy();
       const old = screen.getByRole("row", { name: /a-7/ });
       expect(within(old).getByText("10.0 d")).toBeTruthy();
       expect(within(old).getByRole("link").getAttribute("href")).toBe("/beads/alpha/a-7");
       expect(screen.queryByText("Estimate and actual")).toBeNull();
     });

     it("REQ-UI-090 estimate table with difference chips", () => {
       const base = report();
       const est = (id: string, actual: number) => ({ project: "alpha", id, title: id, estimate_days: 5, actual_days: actual });
       render(<DeliverySection delivery={{ ...base.delivery, estimates: [est("e-1", 7), est("e-2", 3)] }} />);
       expect(screen.getByText("Estimate and actual")).toBeTruthy();
       expect(screen.getByText("+2 d")).toHaveClass("text-state-blocked");
       expect(screen.getByText("−2 d")).not.toHaveClass("text-state-blocked");
     });
     ```
     Keep the REQ-UI-093 "empty sections" case. It expects 3 × "No data in this period" from Usage (no members), Delivery (no closed beads in the weeks) and Quality (no points), with no `.recharts-surface`.
3. Run the tests and check that they fail:
   ```bash
   pnpm -C frontend test --run src/features/reports/format.test.ts src/features/reports/sections.test.tsx
   ```
   Expected: the new REQ-UI-089 and REQ-UI-090 cases fail.
4. Implement.
   - `format.ts`, append:
     ```ts
     /** Actual minus estimated working days, to one decimal: late above 0. */
     export function estimateDiff(estimateDays: number, actualDays: number): { text: string; late: boolean } {
       const diff = Math.round((actualDays - estimateDays) * 10) / 10;
       if (diff === 0) return { text: "on estimate", late: false };
       return diff > 0 ? { text: `+${diff} d`, late: true } : { text: `−${-diff} d`, late: false };
     }
     ```
   - `BarRows.tsx`:
     ```tsx
     export type Segment = { name: string; value: number; color: string };
     export type BarRow = { key: string; segments: Segment[]; total: string; detail: string };

     const sumOf = (row: BarRow) => row.segments.reduce((n, s) => n + s.value, 0);

     /** Horizontal bars on one scale, stacked by segment; each row is focusable and shows its detail on hover and focus. */
     export function BarRows({ rows }: { rows: BarRow[] }) {
       const max = Math.max(1, ...rows.map(sumOf));
       return (
         <ul className="flex flex-col gap-2">
           {rows.map((row) => (
             <li
               key={row.key}
               tabIndex={0}
               aria-label={`${row.key}: ${row.detail}`}
               className="group relative grid grid-cols-[6rem_1fr] items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-ring"
             >
               <span aria-hidden className="truncate text-right text-sm">{row.key}</span>
               <span aria-hidden className="flex min-w-0 items-center gap-2">
                 <span className="flex h-4 overflow-hidden rounded-sm" style={{ width: `${(sumOf(row) / max) * 85}%` }}>
                   {row.segments
                     .filter((s) => s.value > 0)
                     .map((s) => (
                       <span key={s.name} className="border-r-2 border-background last:border-r-0" style={{ flexGrow: s.value, background: s.color }} />
                     ))}
                 </span>
                 <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{row.total}</span>
               </span>
               <span role="tooltip" className="pointer-events-none absolute left-28 top-full z-10 hidden rounded border bg-popover p-2 text-xs text-popover-foreground group-hover:block group-focus:block">
                 {row.detail}
               </span>
             </li>
           ))}
         </ul>
       );
     }
     ```
   - `RangeChart.tsx`:
     ```tsx
     import { formatDays } from "./format";

     export type Range = { key: string; n: number; median: number; p85: number };

     const pct = (value: number, max: number) => `${(value / max) * 100}%`;
     const COLOR = "var(--series-1)";

     /** One row per key on a shared day axis: a dot at the median, a line to a tick at the 85th percentile. */
     export function RangeChart({ title, ranges }: { title: string; ranges: Range[] }) {
       if (ranges.length === 0) {
         return (
           <figure className="flex flex-col gap-2">
             <figcaption className="text-sm text-muted-foreground">{title}</figcaption>
             <p className="text-sm text-muted-foreground">No data in this period</p>
           </figure>
         );
       }
       const max = Math.max(1, Math.ceil(Math.max(...ranges.map((r) => r.p85))));
       return (
         <figure className="flex flex-col gap-2">
           <figcaption className="text-sm text-muted-foreground">{title}</figcaption>
           <ul className="flex flex-col gap-1">
             {ranges.map((r) => {
               const label = `${r.key}: ${r.n} beads, median ${formatDays(r.median)}, 85th percentile ${formatDays(r.p85)}`;
               return (
                 <li key={r.key} tabIndex={0} aria-label={label} className="group relative grid grid-cols-[6rem_1fr] items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-ring">
                   <span aria-hidden className="truncate text-right text-sm">{r.key}</span>
                   <span aria-hidden className="relative h-5">
                     <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ left: pct(r.median, max), width: pct(r.p85 - r.median, max), background: COLOR }} />
                     <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2" style={{ left: pct(r.p85, max), background: COLOR }} />
                     <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: pct(r.median, max), background: COLOR }} />
                   </span>
                   <span role="tooltip" className="pointer-events-none absolute left-28 top-full z-10 hidden rounded border bg-popover p-2 text-xs text-popover-foreground group-hover:block group-focus:block">
                     {label}
                   </span>
                 </li>
               );
             })}
           </ul>
           <div aria-hidden className="relative ml-[6.5rem] h-4 text-xs text-muted-foreground">
             {[0, 0.25, 0.5, 0.75, 1].map((f) => (
               <span key={f} className="absolute -translate-x-1/2" style={{ left: `${f * 100}%` }}>
                 {`${+(f * max).toFixed(1)}d`}
               </span>
             ))}
           </div>
         </figure>
       );
     }
     ```
   - `DeliverySection.tsx`:
     - Keep the imports for recharts, `Link`, `Table*`, `ChartBox`, `legendText`, `TYPES`, `present`, `typeColor`, `beadPath` and `formatDays`, plus the `tick`, `tooltipStyle` and `heads` helpers.
     - Add the imports `useState` from `react`, `Badge`, `Button`, `cn` from `@/lib/utils`, `BarRows`, `RangeChart` and `type Range`, `estimateDiff`, and `type Stat`.
     - Remove `timeTable`.
     - Add:
       ```tsx
       const rangesOf = (rows: TimeRow[], pick: (r: TimeRow) => Stat | null): Range[] =>
         rows.flatMap((r) => {
           const s = pick(r);
           return s === null ? [] : [{ key: r.key, ...s }];
         });
       ```
     - Component body:
       ```tsx
       export function DeliverySection({ delivery }: { delivery: Delivery }) {
         const [by, setBy] = useState<"type" | "member">("type");
         const types = present(TYPES, delivery.weeks.flatMap((w) => Object.keys(w.counts)));
         if (!delivery.weeks.some((w) => Object.values(w.counts).some((n) => n > 0))) {
           return <p className="text-muted-foreground">No data in this period</p>;
         }
         const times = by === "type" ? delivery.by_type : delivery.by_member;
         return (
           <div className="flex flex-col gap-8">
             <section className="flex flex-col gap-3">
               <h2 className="font-semibold">Closed per week</h2>
               {/* the existing <ChartBox height={240}><BarChart …/></ChartBox>, unchanged */}
             </section>
             <section className="flex flex-col gap-3">
               <div className="flex flex-wrap items-center justify-between gap-2">
                 <h2 className="font-semibold">Cycle and lead time</h2>
                 <div role="group" aria-label="Group times" className="flex gap-1">
                   {(["type", "member"] as const).map((value) => (
                     <Button key={value} type="button" size="sm" variant={by === value ? "default" : "outline"} aria-pressed={by === value} onClick={() => setBy(value)}>
                       {value === "type" ? "By type" : "By member"}
                     </Button>
                   ))}
                 </div>
               </div>
               <p className="text-sm text-muted-foreground">Dot is the median, the end tick is the 85th percentile. Cycle runs from start to close, lead from creation to close.</p>
               <div className="grid gap-6 md:grid-cols-2">
                 <RangeChart title="Cycle time" ranges={rangesOf(times, (r) => r.cycle)} />
                 <RangeChart title="Lead time" ranges={rangesOf(times, (r) => r.lead)} />
               </div>
             </section>
             <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
               <section className="flex min-w-0 flex-col gap-3">
                 <h2 className="font-semibold">Oldest in progress</h2>
                 {delivery.oldest.length === 0 ? (
                   <p className="text-sm text-muted-foreground">Nothing in progress</p>
                 ) : (
                   <Table>
                     {heads(["Bead", "Assignee", "Age"])}
                     <TableBody>
                       {delivery.oldest.map((b) => (
                         <TableRow key={`${b.project}/${b.id}`}>
                           <TableCell><Link to={beadPath(b.project, b.id)} className="underline">{b.id} — {b.title}</Link></TableCell>
                           <TableCell>{b.assignee ?? "Unassigned"}</TableCell>
                           <TableCell>{formatDays(b.age_days)}</TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 )}
               </section>
               <section className="flex min-w-0 flex-col gap-3">
                 <h2 className="font-semibold">In progress by member</h2>
                 {delivery.wip.length === 0 ? (
                   <p className="text-sm text-muted-foreground">Nothing in progress</p>
                 ) : (
                   <BarRows
                     rows={delivery.wip.map((w) => ({
                       key: w.member,
                       segments: [{ name: "In progress", value: w.count, color: "var(--series-1)" }],
                       total: String(w.count),
                       detail: `${w.count} in progress`,
                     }))}
                   />
                 )}
               </section>
             </div>
             {delivery.estimates.length > 0 && (
               <section className="flex flex-col gap-3">
                 <h2 className="font-semibold">Estimate and actual</h2>
                 <Table>
                   {heads(["Epic", "Estimate (working days)", "Actual (working days)", "Difference"])}
                   <TableBody>
                     {delivery.estimates.map((e) => {
                       const diff = estimateDiff(e.estimate_days, e.actual_days);
                       return (
                         <TableRow key={`${e.project}/${e.id}`}>
                           <TableCell><Link to={beadPath(e.project, e.id)} className="underline">{e.id} — {e.title}</Link></TableCell>
                           <TableCell>{e.estimate_days}</TableCell>
                           <TableCell>{e.actual_days}</TableCell>
                           <TableCell><Badge variant="outline" className={cn(diff.late && "text-state-blocked")}>{diff.text}</Badge></TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </section>
             )}
           </div>
         );
       }
       ```
   - `UsageSection.tsx`:
     - Remove the imports `Bar`, `BarChart`, `CartesianGrid`, `Legend`, `Tooltip`, `XAxis`, `YAxis`, `ChartBox`, `legendText`, and the `tick` and `tooltipStyle` helpers.
     - Add the imports `cn`, `BarRows`, and `type Budget`.
     - Add:
       ```tsx
       function BudgetCell({ budget }: { budget: Budget | null }) {
         if (budget === null || budget.budget_usd <= 0) return <span className="text-muted-foreground">No budget</span>;
         if (budget.cost === null) return <span className="text-muted-foreground">no price</span>;
         const percent = Math.round((budget.cost / budget.budget_usd) * 100);
         const over = percent > 100;
         return (
           <span className="flex items-center gap-2">
             <span
               role="meter"
               aria-label="Budget used"
               aria-valuemin={0}
               aria-valuemax={Math.max(100, percent)}
               aria-valuenow={percent}
               aria-valuetext={`${percent}% of $${budget.budget_usd}`}
               className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
             >
               <span className={cn("block h-full", over && "bg-state-blocked")} style={{ width: `${Math.min(percent, 100)}%`, background: over ? undefined : "var(--series-1)" }} />
             </span>
             <span className={cn("text-xs tabular-nums", over && "text-state-blocked")}>{percent}%</span>
           </span>
         );
       }
       ```
     - Component body:
       ```tsx
       export function UsageSection({ usage, project }: { usage: Usage; project: string }) {
         if (usage.members.length === 0) return <p className="text-muted-foreground">No data in this period</p>;
         const memberStages = present(STAGES, usage.members.flatMap((m) => Object.keys(m.stages)));
         const total = usage.stages.reduce((sum, s) => sum + s.tokens, 0);
         const share = usage.stages.map((s) => `${s.stage} ${total === 0 ? 0 : Math.round((s.tokens / total) * 100)}%`).join(", ");
         const all = project === "all";
         return (
           <div className="flex flex-col gap-8">
             <section className="flex flex-col gap-3">
               <h2 className="font-semibold">Tokens by member and stage</h2>
               <ul className="flex flex-wrap gap-3 text-xs">
                 {memberStages.map((stage) => (
                   <li key={stage} className="flex items-center gap-1">
                     <span aria-hidden className="size-2.5 rounded-sm" style={{ background: stageColor(stage) }} />
                     {stage}
                   </li>
                 ))}
               </ul>
               <BarRows
                 rows={usage.members.map((m) => ({
                   key: m.member,
                   segments: memberStages.map((stage) => ({ name: stage, value: m.stages[stage] ?? 0, color: stageColor(stage) })),
                   total: formatTokens(m.tokens),
                   detail: `${m.closed} beads closed, ${formatTokens(m.tokens)} tokens, ${formatCost(m.cost)} estimated, ${m.tokens_per_bead === null ? "—" : formatTokens(m.tokens_per_bead)} tokens per bead, ${formatPercent(m.cache_ratio)} cache reads`,
                 }))}
               />
             </section>
             <section className="flex flex-col gap-3">
               <h2 className="font-semibold">Stage share</h2>
               <div role="img" aria-label={share} className="flex h-5 overflow-hidden rounded">
                 {usage.stages.filter((s) => s.tokens > 0).map((s) => (
                   <span key={s.stage} className="border-r-2 border-background last:border-r-0" style={{ flexGrow: s.tokens, background: stageColor(s.stage) }} />
                 ))}
               </div>
               <p className="text-sm text-muted-foreground">{share}</p>
             </section>
             <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
               <section className="flex min-w-0 flex-col gap-3">
                 <h2 className="font-semibold">Top epics</h2>
                 <Table>
                   {heads(all ? ["Epic", "Project", "Tokens", "Budget", "Children"] : ["Epic", "Tokens", "Budget", "Children"])}
                   <TableBody>
                     {usage.epics.map((e) => (
                       <TableRow key={`${e.project}/${e.id}`}>
                         <TableCell><Link to={beadPath(e.project, e.id)} className="underline">{e.id} — {e.title}</Link></TableCell>
                         {all && <TableCell>{e.project}</TableCell>}
                         <TableCell>{formatTokens(e.tokens)}</TableCell>
                         <TableCell><BudgetCell budget={e.budget} /></TableCell>
                         <TableCell>{e.closed_children}/{e.children}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </section>
               <section className="flex min-w-0 flex-col gap-3">
                 <h2 className="font-semibold">Models</h2>
                 <Table>
                   {heads(["Model", "Role", "Tokens", "Est. cost"])}
                   <TableBody>
                     {usage.models.map((m) => (
                       <TableRow key={`${m.model}/${m.role}`}>
                         <TableCell className="font-mono">{m.model}</TableCell>
                         <TableCell>{m.role}</TableCell>
                         <TableCell>{formatTokens(m.tokens)}</TableCell>
                         <TableCell>{formatCost(m.cost)}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </section>
             </div>
             <section className="flex flex-col gap-3">
               <h2 className="font-semibold">Top beads</h2>
               {/* the existing top beads Table, unchanged */}
             </section>
           </div>
         );
       }
       ```
     - The `Badge` import goes once the old budget badge is gone.
5. Run all checks:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   ```
   Expected: everything passes.
6. Commit:
   ```bash
   git commit -m "feat(reports): delivery and AI usage tabs (gin-console-xza)"
   ```

### Track 4: Quality and Data coverage tabs
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-091, REQ-UI-092
- **Files**:
  - Modify `frontend/src/features/reports/QualitySection.tsx` (whole component)
  - Modify `frontend/src/features/reports/CoverageSection.tsx` (whole component)
  - Test `frontend/src/features/reports/sections.test.tsx` (the REQ-UI-091 and REQ-UI-092 cases)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** rearranging two sections from data they already receive; the sums and fixed sentences are given below, with no new chart type (the scatter stays on recharts).
- **Acceptance criteria**:
  - REQ-UI-091:
    - the "open a point" scenario passes;
    - the legend names "No rework" and "Some rework";
    - the member table shows review cycles per bead;
    - the findings list sums the members.
  - REQ-UI-092:
    - the "copy command" scenario passes;
    - the "empty block" scenario passes ("Projects that failed" with count 0 and its sentence).
  - The REQ-UI-093 cases still pass.
- **Estimated complexity**: low

Steps:

1. Run `gin-workflow rules --files frontend/src/features/reports/QualitySection.tsx frontend/src/features/reports/CoverageSection.tsx` and follow its output.
2. Write the failing tests. In `sections.test.tsx`, replace the two REQ-UI-091 cases, the REQ-UI-093 "member rows without points" case, and the REQ-UI-092 case with:
   ```tsx
   const qrow = (key: string, over: Partial<QualityRow> = {}): QualityRow => ({
     key, project: null, title: null, beads: 1, reopens: 0, bugs: 0, review_cycles: 0, rejections: 0, waivers: 0,
     findings: { critical: 0, important: 0, minor: 0, suggestion: 0 }, rework_rate: 0, ...over,
   });

   it("REQ-UI-091 clicking a point opens its bead page", () => {
     const r = report({ quality: { members: [], epics: [], points: [{ project: "alpha", id: "a-3", title: "T", tokens: 100, rework: 2 }] } });
     const { container } = render(<QualitySection quality={r.quality} />);
     const symbol = container.querySelector(".recharts-scatter-symbol");
     expect(symbol).not.toBeNull();
     fireEvent.click(symbol?.firstElementChild ?? symbol ?? container);
     expect(window.location.pathname).toBe("/beads/alpha/a-3");
   });

   it("REQ-UI-091 two point colors with a legend, member table and findings", () => {
     const points = [
       { project: "alpha", id: "a-1", title: "Clean", tokens: 100, rework: 0 },
       { project: "alpha", id: "a-2", title: "Reworked", tokens: 200, rework: 1 },
     ];
     const members = [
       qrow("ann", { beads: 4, reopens: 1, review_cycles: 5, rework_rate: 0.25, findings: { critical: 1, important: 2, minor: 0, suggestion: 3 }, waivers: 1 }),
       qrow("bao", { beads: 1, bugs: 1, review_cycles: 1, findings: { critical: 0, important: 1, minor: 4, suggestion: 0 } }),
     ];
     const { container } = render(<QualitySection quality={{ members, epics: [], points }} />);
     const legend = container.querySelector(".recharts-legend-wrapper");
     expect(legend?.textContent).toContain("No rework");
     expect(legend?.textContent).toContain("Some rework");
     expect(screen.getByRole("row", { name: /ann 1 0 1\.3 0 25%/ })).toBeTruthy();
     const findings = screen.getByRole("region", { name: "Review findings" });
     expect(within(findings).getByText("Critical").nextElementSibling?.textContent).toBe("1");
     expect(within(findings).getByText("Important").nextElementSibling?.textContent).toBe("3");
     expect(within(findings).getByText("Minor").nextElementSibling?.textContent).toBe("4");
     expect(within(findings).getByText("Waivers").nextElementSibling?.textContent).toBe("1");
     expect(screen.queryByText("By epic")).toBeNull();
   });

   it("REQ-UI-093 member rows without points still show the table and no chart", () => {
     const { container } = render(<QualitySection quality={{ members: [qrow("ann")], epics: [], points: [] }} />);
     expect(screen.getByText("ann")).toBeTruthy();
     expect(screen.queryByText("No data in this period")).toBeNull();
     expect(container.querySelector(".recharts-surface")).toBeNull();
   });

   it("REQ-UI-092 coverage blocks with counts, copy command, unassigned share and fixed note", () => {
     const writeText = vi.fn().mockResolvedValue(undefined);
     vi.stubGlobal("navigator", { clipboard: { writeText } });
     const coverage = {
       not_collected: [{ project: "alpha", id: "a-9", title: "t", detail: "gin-workflow usage collect --bead a-9" }],
       invalid: [],
       unpriced: ["m1", "m2"],
       unassigned_share: 0.25,
       sources: [{ project: "alpha", id: "a-5", title: "x", sources: { claude: "missing", codex: "ok" }, skipped_lines: 3 }],
     };
     render(<CoverageSection coverage={coverage} errors={[{ project: "beta", error: "boom" }]} />);
     fireEvent.click(screen.getByRole("button", { name: "Copy" }));
     expect(writeText).toHaveBeenCalledWith("gin-workflow usage collect --bead a-9");
     expect(screen.getByRole("link", { name: "a-9" }).getAttribute("href")).toBe("/beads/alpha/a-9");
     expect(screen.getByRole("heading", { name: "Not collected 1" })).toBeTruthy();
     expect(screen.getByRole("heading", { name: "Unreadable usage 0" })).toBeTruthy();
     expect(screen.getByText("Every AI usage record is readable.")).toBeTruthy();
     expect(screen.getByRole("heading", { name: "Models without a price 2" })).toBeTruthy();
     expect(screen.getByText("m1")).toBeTruthy();
     expect(screen.getByText(/a-5, claude: missing, skipped lines: 3/)).toBeTruthy();
     expect(screen.getByText("beta: boom")).toBeTruthy();
     expect(screen.getByText("25% of tokens have no assignee and show under Unassigned.")).toBeTruthy();
     expect(
       screen.getByText("Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured."),
     ).toBeTruthy();
   });

   it("REQ-UI-092 a block with no gap says so", () => {
     render(<CoverageSection coverage={report().coverage} errors={[]} />);
     expect(screen.getByRole("heading", { name: "Projects that failed 0" })).toBeTruthy();
     expect(screen.getByText("Every project answered.")).toBeTruthy();
     expect(screen.queryByText(/of tokens have no assignee/)).toBeNull();
   });
   ```
   - Add `QualityRow` to the type import from `./api`.
   - Delete the old "REQ-UI-091 beads by rework table links to the bead" case.
3. Run the tests and check that they fail:
   ```bash
   pnpm -C frontend test --run src/features/reports/sections.test.tsx
   ```
   Expected: the new REQ-UI-091 and REQ-UI-092 cases fail.
4. Implement.
   - `QualitySection.tsx`:
     - Keep `isObject`, `isPoint`, `openPoint` and `PointTip`.
     - Remove `Link` and the `table` helper.
     - Add `Legend` to the recharts import, plus `legendText` from `./ChartBox`.
     - Component body:
       ```tsx
       export function QualitySection({ quality }: { quality: Quality }) {
         if (quality.points.length + quality.members.length === 0) return <p className="text-muted-foreground">No data in this period</p>;
         const sum = (pick: (r: QualityRow) => number) => quality.members.reduce((n, r) => n + pick(r), 0);
         const findings: [string, number][] = [
           ["Critical", sum((r) => r.findings.critical)],
           ["Important", sum((r) => r.findings.important)],
           ["Minor", sum((r) => r.findings.minor)],
           ["Suggestion", sum((r) => r.findings.suggestion)],
           ["Waivers", sum((r) => r.waivers)],
         ];
         return (
           <div className="flex flex-col gap-8">
             {quality.points.length > 0 && (
               <section className="flex flex-col gap-3">
                 <h2 className="font-semibold">Tokens and rework per bead</h2>
                 <p className="text-sm text-muted-foreground">Rework counts reopens, bugs and rejections.</p>
                 <ChartBox height={280}>
                   <ScatterChart>
                     <CartesianGrid stroke="var(--color-border)" />
                     <XAxis type="number" dataKey="tokens" name="Tokens" tickFormatter={formatTokens} tick={tick} />
                     <YAxis type="number" dataKey="rework" name="Rework" allowDecimals={false} tick={tick} />
                     <Tooltip contentStyle={tooltipStyle} content={<PointTip />} />
                     <Legend formatter={legendText} />
                     <Scatter name="No rework" data={quality.points.filter((p) => p.rework === 0)} fill="var(--series-1)" onClick={openPoint} isAnimationActive={false} />
                     <Scatter name="Some rework" data={quality.points.filter((p) => p.rework > 0)} fill="var(--series-2)" onClick={openPoint} isAnimationActive={false} />
                   </ScatterChart>
                 </ChartBox>
               </section>
             )}
             <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
               <section className="flex min-w-0 flex-col gap-3">
                 <h2 className="font-semibold">Rework by member</h2>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       {["Member", "Reopens", "Bugs", "Review cycles per bead", "Rejections", "Rework rate"].map((h) => (
                         <TableHead key={h}>{h}</TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {quality.members.map((r) => (
                       <TableRow key={r.key}>
                         <TableCell>{r.key}</TableCell>
                         <TableCell>{r.reopens}</TableCell>
                         <TableCell>{r.bugs}</TableCell>
                         <TableCell>{r.beads === 0 ? "—" : (r.review_cycles / r.beads).toFixed(1)}</TableCell>
                         <TableCell>{r.rejections}</TableCell>
                         <TableCell>{formatPercent(r.rework_rate)}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </section>
               <section aria-labelledby="review-findings" className="flex flex-col gap-3">
                 <h2 id="review-findings" className="font-semibold">Review findings</h2>
                 <dl className="divide-y text-sm">
                   {findings.map(([label, value]) => (
                     <div key={label} className="flex justify-between py-2">
                       <dt>{label}</dt>
                       <dd className="font-semibold tabular-nums">{value}</dd>
                     </div>
                   ))}
                 </dl>
               </section>
             </div>
           </div>
         );
       }
       ```
     - Remove `beadPath` from the `./format` import if lint reports it unused. `openPoint` still uses it, so it most likely stays.
   - `CoverageSection.tsx`:
     ```tsx
     import type { ReactNode } from "react";
     import { Link } from "@/app/Link";
     import { Badge } from "@/components/ui/badge";
     import { CopyCommand } from "@/features/milestones/CopyCommand";
     import type { Coverage, ProjectError } from "./api";
     import { beadPath, formatPercent } from "./format";

     function Block({ id, title, count, empty, children }: { id: string; title: string; count: number; empty: string; children: ReactNode }) {
       return (
         <section aria-labelledby={id} className="flex flex-col gap-2">
           <h2 id={id} className="flex items-center gap-2 font-semibold">
             {title}
             <Badge variant="secondary">{count}</Badge>
           </h2>
           {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
         </section>
       );
     }

     export function CoverageSection({ coverage, errors }: { coverage: Coverage; errors: ProjectError[] }) {
       const share = coverage.unassigned_share;
       return (
         <div className="flex flex-col gap-6">
           <p className="text-sm text-muted-foreground">These gaps leave beads out of the other tabs. Fix them in the project, then reload the report.</p>
           <Block id="coverage-not-collected" title="Not collected" count={coverage.not_collected.length} empty="Every closed bead has AI usage.">
             <p className="text-sm text-muted-foreground">Closed beads without AI usage. Run the command in the project to collect it.</p>
             <ul className="flex flex-col gap-2 text-sm">
               {coverage.not_collected.map((b) => (
                 <li key={`${b.project}/${b.id}`} className="flex flex-wrap items-center gap-3">
                   <Link to={beadPath(b.project, b.id)} className="font-mono underline">{b.id}</Link>
                   <CopyCommand command={b.detail} />
                 </li>
               ))}
             </ul>
           </Block>
           <Block id="coverage-unreadable" title="Unreadable usage" count={coverage.invalid.length} empty="Every AI usage record is readable.">
             <ul className="text-sm">
               {coverage.invalid.map((b) => (
                 <li key={`${b.project}/${b.id}`}>{b.id} — {b.detail}</li>
               ))}
             </ul>
           </Block>
           <Block id="coverage-unpriced" title="Models without a price" count={coverage.unpriced.length} empty="Every model has a price.">
             <ul className="text-sm">
               {coverage.unpriced.map((m) => (
                 <li key={m}><code className="font-mono">{m}</code> counts tokens but no cost.</li>
               ))}
             </ul>
             <p className="text-sm text-muted-foreground">Add them to <code>.agent-workflow/usage-prices.yaml</code>.</p>
           </Block>
           <Block id="coverage-logs" title="Incomplete logs" count={coverage.sources.length} empty="Every collected bead read its session logs fully.">
             <ul className="text-sm">
               {coverage.sources.map((s) => (
                 <li key={`${s.project}/${s.id}`}>
                   {s.id}
                   {Object.entries(s.sources).filter(([, value]) => value !== "ok").map(([name, value]) => `, ${name}: ${value}`).join("")}
                   {s.skipped_lines > 0 && `, skipped lines: ${s.skipped_lines}`}
                 </li>
               ))}
             </ul>
           </Block>
           <Block id="coverage-failed" title="Projects that failed" count={errors.length} empty="Every project answered.">
             <ul className="text-sm">
               {errors.map((e) => (
                 <li key={e.project}>{e.project}: {e.error}</li>
               ))}
             </ul>
           </Block>
           {share !== null && share > 0 && (
             <p className="text-sm">{formatPercent(share)} of tokens have no assignee and show under Unassigned.</p>
           )}
           <p className="text-sm text-muted-foreground">
             Estimates from local Claude Code and Codex logs on the machine that collected them. Antigravity and OpenCode are not measured.
           </p>
         </div>
       );
     }
     ```
5. Run all checks:
   ```bash
   pnpm -C frontend test --run
   pnpm -C frontend typecheck
   pnpm -C frontend lint
   pnpm -C frontend build
   ```
   Expected: everything passes, and the build writes `frontend/dist`.
6. Commit:
   ```bash
   git commit -m "feat(reports): quality and data coverage tabs (gin-console-xza)"
   ```

### Track 5: Check the Reports tabs in a browser
- **Dependencies**: Track 4
- **Requirements**: REQ-UI-095, REQ-UI-089, REQ-UI-090, REQ-UI-091, REQ-UI-092
- **Files**:
  - Modify `docs/changes/gin-console-xza-reports-tabs/05-tests.md` (record each TC's result in its evidence column)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with fixed commands and record the user's verdicts; no code changes.
- **Human gate**: the user opens the Reports page on the Tailscale deploy (https://instance-20260515-2304.tail5ca54e.ts.net:8443/reports) and checks TC-1 to TC-3 of `05-tests.md` against the mockup screenshots.
- **Acceptance criteria**:
  - The deploy is active, and `/api/health` answers 200.
  - The user's verdict for TC-1, TC-2 and TC-3 is written in `05-tests.md`.
  - A failed TC becomes a bug bead under `gin-console-xza`, with the screenshot or the user's words.
- **Estimated complexity**: low

Steps:

1. Deploy the epic branch. Run each command on its own:
   ```bash
   git -C /home/gin/gin-fam/gin-console merge --ff-only feat/reports-tabs
   pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile
   pnpm -C /home/gin/gin-fam/gin-console/frontend build
   systemctl --user restart gin-console
   systemctl --user is-active gin-console
   curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health
   ```
   Expected: `active` and `200`.
   - Run the merge only if the workspace is on the branch the deploy serves. Otherwise build from the current checkout of `feat/reports-tabs`, and report which commit is served.
   - Rollback: `git -C /home/gin/gin-fam/gin-console checkout master && pnpm -C /home/gin/gin-fam/gin-console/frontend build && systemctl --user restart gin-console`.
2. Ask the user to run TC-1 to TC-3. Run `gin-workflow notify --event needs_input "Reports tabs ready to check on Tailscale"` first.
3. Write each verdict into the evidence column of `05-tests.md`, as "pass, user, 2026-11-DD" or "fail: <what>". Commit:
   ```bash
   git commit -m "docs(specs): record reports tabs check (gin-console-xza)"
   ```

## Integration
- **Branch**: `feat/reports-tabs`. The tracks run one at a time on this branch or on track branches cut from it, as `orchestrate` sets up.
- **Merge strategy**: sequential.

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .`, `mypy` pass.
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- [ ] Every scenario of REQ-UI-088 to REQ-UI-092, REQ-UI-095, REQ-REPORTS-003 and REQ-REPORTS-004 has a test named with its REQ-ID, or a TC in `05-tests.md` (`gin-workflow specs trace --change gin-console-xza`).
- [ ] TC-1 to TC-3 checked by the user on the Tailscale deploy.

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog using the route rubric.
- The user may override `Model:` and `Effort:` before plan approval.
- Only the Parent Bead (`gin-console-xza`) stays open until the human-confirmed merge. Each track bead closes once its tests and review pass.
- Line ranges are as of `master` at 883d4ec. Re-check them before editing.
