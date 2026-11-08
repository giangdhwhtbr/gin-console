# Design: Milestones forecast

Epic: gin-console-cl0

## Architecture
No new endpoint, command, or dependency. The two existing calls (`milestone list --all --json`, `milestone show <id> --json`) already return the new keys from the installed gin-workflow. The console only declares them so `response_model` stops dropping them, and draws them.

### Backend (`backend/src/gin_console/milestones/`)
- `models.py`:
  - New `Forecast(BaseModel)`: `deadline: IsoDate | None`, `lanes: int`, `start: IsoDate`, `finish: IsoDate | None`, `overflow_days: int`, `open_epics: int`, `unestimated: int`, `error: str | None`.
  - `MilestoneList.forecast: Forecast | None = None`.
  - `MilestoneEntry.lanes: int | None = None` and `MilestoneDetail.lanes: int | None = None`.
  - The defaults keep output from gin-workflow before `milestone-forecast` valid (REQ-MILESTONE-UI-008). The API answers `null` both for a missing key and for `forecast: null`.
- `source.py` and `router.py`: unchanged. `schema` stays 1, as the contract only adds keys.

### Frontend (`frontend/src/features/milestones/`)
- `api.ts`:
  - New type `Forecast`. `MilestoneList.forecast: Forecast | null`, and `MilestoneEntry.lanes` and `MilestoneDetail.lanes` are `number | null`.
  - The guards accept a missing or null key, and `fetchMilestones` and `fetchMilestone` normalize it to `null`.
  - A `forecast` that is present but malformed fails the guard, as other malformed fields do today.
- `format.ts`: `workdaysAfter(end, finish)` mirrors gin-workflow `workdays_after`: it counts the days from Monday to Friday in `(end, finish]`. The spare-days figure uses `workdaysAfter(finish, deadline)`.
- `ForecastCard.tsx` (new): renders REQ-MILESTONE-UI-016 from a `Forecast` and `today`, and returns nothing for `null`. `MilestoneTable` in `MilestonesPage.tsx` renders it above the list. The card lives in the same loaded state as the list, so it shares the list's loading, error, and refresh handling.
- `MilestonesPage.tsx`: `COLUMNS` gains a Lanes column after Period. The Period cell gains a "Finishes <date>" line, in `text-state-blocked` when `finish > end` (ISO strings compare correctly).
- `MilestonePage.tsx`: `MilestoneHeader` adds the "<n> lanes" span after the outcome when `plan.lanes !== null`.
- `GanttChart.tsx` and `gantt.ts`: unchanged. Only a test fixture with lane-bound dates is added (REQ-MILESTONE-UI-003).

### Bead text as Markdown (`frontend/src/features/beads/`)
- Dependencies: `react-markdown` 10, `remark-gfm` 4 and `remark-breaks` 4.
  - `remark-breaks` keeps a single line break as a break, as GitHub renders issue text and as the plain text did, so bead text written line by line does not run together.
  - No `rehype-raw` is added, so raw HTML is never parsed into elements: react-markdown escapes it and shows it as text. This was checked with react-markdown 10.1.0 on 2026-11-08: `<script>x</script>` and `<img onerror>` came out as text.
- New `MarkdownView.tsx`:
  - It wraps `Markdown` with `remarkPlugins={[remarkGfm, remarkBreaks]}`.
  - `urlTransform={safeUrl}` keeps only `http:`, `https:` and `mailto:` URLs. Any other URL becomes `""`, relative paths included, because they would resolve against console routes.
  - The `a` component renders `target="_blank" rel="noreferrer"` when `href` is set, and a `span` with the link text otherwise.
  - Task-list checkboxes come out `disabled` from remark-gfm.
  - Styling is a `.markdown` block in `index.css` that uses the theme tokens, as in the mockup. No typography plugin is added.
- New `MarkdownText.tsx`: `lazy()` loads `MarkdownView` behind `Suspense`.
  - The fallback is today's plain `whitespace-pre-wrap` paragraph, shown until the chunk loads.
  - The beads feature is not a separate route chunk, and the main chunk is already 499 kB. Lazy loading keeps the Markdown libraries out of it.
- `BeadDetailPage.tsx` and `TextSection.tsx`: the description paragraph and the `TextSection` body render `<MarkdownText>`. Comments in `DiscussionPanel` are unchanged.

### Contract record (gin-harness)
`gin-harness/docs/changes/gin-harness-6s4-milestones/design.md`, "## JSON contract": add `lanes` to the list entry and show examples, and `forecast` to the list example, plus their table rows. Mark them as added by `milestone-forecast` and optional for older gin-workflow. This is committed in gin-harness, separately from this repository.

## Data Flow
See `docs/specs/milestone-ui/diagrams/milestones-forecast-activity.md`. Bead text: see `docs/specs/ui/diagrams/bead-text-markdown-activity.md`; `GET /api/beads/{project}/{id}` is unchanged.

The list request runs `milestone list --all --json`. The pydantic models fill `forecast` and `lanes` with `null` when they are missing. `MilestoneTable` shows `ForecastCard` and then the rows. The milestone page runs `show` as before and reads `lanes` for the header.

## Error Handling
- Command failures and schema checks are unchanged (REQ-MILESTONE-UI-005, REQ-MILESTONE-UI-008).
- `forecast.error` is data, not a failure: it is shown inside the card, and the response stays 200.
- A malformed `forecast` fails validation. The backend then answers 502 (the existing path for invalid output), and the frontend guard rejects it the same way.

## Testing
- Backend (`backend/tests/test_milestones_source.py`, `test_milestones_api.py`, fixtures in `fake_gw.py`):
  - A list with `forecast` and `lanes` passes through unchanged.
  - A list and a show without the new keys answer `null`.
  - `forecast: null` answers `null`.
  - Test names or comments carry `REQ-MILESTONE-UI-008`.
- Frontend (vitest, fixtures in `milestoneFixtures.ts`):
  - `api.test.ts`: guards with and without the keys.
  - `format.test.ts`: `workdaysAfter` across a weekend.
  - `ForecastCard.test.tsx`: each scenario of REQ-MILESTONE-UI-016.
  - `MilestonesPage.test.tsx`: lanes, "–", and a late finish (REQ-MILESTONE-UI-001).
  - `MilestonePage.test.tsx`: header lanes, present and missing (REQ-MILESTONE-UI-017).
  - `GanttChart.test.tsx`: lane-bound bars (REQ-MILESTONE-UI-003).
- `Markdown.test.tsx` and `BeadDetailPage.test.tsx`: each scenario of REQ-UI-028 and REQ-UI-038 (Markdown elements, raw HTML as text, unsafe link as text, task checkbox). Existing plain-text tests change to the new expectations.
- Manual check: TC-1 and TC-2 in `05-tests.md` on the Tailscale deploy.

## Open Technical Questions
