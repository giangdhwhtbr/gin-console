# Design: Bugs view

Epic: gin-console-rm-bugs-view

## Architecture

Backend (`backend/src/gin_console/reports`):
- `source.py`: `read_beads` fills `ReportBead.found_in`, the sorted ids of the bead's `discovered-from` targets, from the dependencies of the snapshot. Nothing else reads it.
- `bugs.py` (new): pure functions over `list[ReportBead]`, as `team.py` and `status.py` are. `source_epic(tree, bug)` applies REQ-REPORTS-040 with `Tree.epics_of`; `build_bugs(beads, now, project, scope)` returns the `BugsReport` of REQ-REPORTS-039 to REQ-REPORTS-042. It takes the milestone from `list_milestones` and `select_milestone`, and every date from `day_of`.
- `models.py`: `BugsReport`, `BugFigures`, `BugWeek`, `BugEpic`, `OpenBug`.
- `router.py`: `GET /reports/bugs`, with `find`, `parse_scope`, `beads_of` and one `KeyedCache` cleared on refresh, as `/reports/team`.

Frontend (`frontend/src/features/reports`):
- `sections.ts`: `bugs` joins `ReportSection`, `SECTIONS` (last) and `SECTION_LABELS`; the sidebar, the row of links, the paths and the page title follow from it.
- `bugs/bugsApi.ts`: the types and `fetchBugs(project, scope)`.
- `bugs/BugsSection.tsx`: `Figures`, the weekly `BarRows` with a legend, the epic table and the open bugs table (`components/ui/table`).
- `headlines.ts`: `bugsHeadline(report)`.
- `ReportsView.tsx`: loads the bugs report with the others and publishes its headline.
- `lib/definitions.ts`: one sentence per Bugs figure, shown by `Figures` hints.

Rules of the change: the server decides the source epic and every count; the frontend only renders and formats. `BarRows` has no caller today and is reused as it is.

## Data Flow

- [Bugs section activity](docs/specs/reports/diagrams/bugs-section-activity.md) (use case: [See where bugs come from](docs/specs/reports/use-cases/see-where-bugs-come-from.md)).

## Error Handling

- The export cannot be read, or is nested too deeply: 502 with an `error`, not cached; the section shows the error with Retry, and the headline is left out (REQ-UI-095).
- A `discovered-from` target that is missing from the export, is a merge gate, or reaches no epic: the next target is tried, then the bug's parents, else the source is unknown. A parent cycle ends at the first bead seen twice (`Tree`).
- A bug closed without `closed_at`: it is neither open nor counted as closed in a period.
- A bug closed on a date before its creation date: 0 days to close.
- Naive and aware timestamps never meet: every comparison is between local dates.
- A milestone that has not started, or no milestone at all: no period, zero counts, no weeks; the open bugs are still listed.

## Testing

- `pytest`: `test_reports_bugs.py` with the source epic rules (link, first by id, target that is an epic, target without an epic, missing target, bug from a bug, parents, unknown, cycle), the period (milestone, milestone past its end, period, not started), the weeks (empty week, clipped first and last week, ISO week across a year end, sums), the figures (none open, none closed, even number of closed bugs, closed before created), the rows (order, unknown last, open only), the open bugs (order, deferred, closed left out), merge gates; `test_reports_bugs_api.py` with 404, 422, 502 not cached, the cache and the refresh. `test_reports_source.py` gains `found_in`.
- `vitest`: `BugsSection.test.tsx` (figures, bars and legend, epic rows, share note, open bugs, 20 rows and "Show all", empty and loading states, Retry, late answer), `headlines.test.ts`, `sections.test.ts` and `ReportsView.test.tsx` (path, order, headline, scope kept, title), `definitions` sentences.
- QA track (Quality line of the roadmap): gin-qa cases and Playwright specs for the section, the scope, a project without bugs and the layout at 390px, each naming its REQ.

## Open Technical Questions
