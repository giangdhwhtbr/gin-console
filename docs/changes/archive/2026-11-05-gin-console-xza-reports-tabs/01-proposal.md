# Reports tabs

Epic: gin-console-xza
Date: 2026-11-05

## Why
The Reports page shows AI usage, delivery flow, quality and data coverage in one long scroll (REQ-UI-088 to REQ-UI-093). To reach one section, a reader scrolls past all the others. The page also gives no summary of the sections short of reading each one. The approved mockup is in `docs/specs/reports/assets/mockup/` (`reports-tabs.html`, `description.md` and one screenshot per tab).

This change is the first of two epics. The second adds a Milestones tab with a burndown chart and builds on the tabs added here. It is out of scope for this change (decided 2026-11-05, user).

## What Changes
1. **Tabs**: the page shows four tabs: Delivery, AI usage, Quality, Data coverage. Each tab shows a one-line headline under its name, so a reader can scan all four without opening them. The selected tab is kept in the URL (`tab=`).
2. **Figures per tab**: the KPI row above all sections goes away. Each tab opens with its own short row of figures instead.
3. **Delivery**: the cycle-time and lead-time tables become two range charts with a By type / By member switch. In-progress beads per member become bars. The estimate table gains a difference chip.
4. **AI usage**: the member table goes away, and its figures move into the bar chart's tooltip. Each top epic gets a budget meter.
5. **Quality**: the scatter plot colours beads with rework. A table of rework by member and a list of review findings by severity replace the member and epic tables.
6. **Data coverage**: one block per gap type, each with a count. Gaps that are 0 show a one-line all-clear.
7. **Backend**: the report gains an overall cycle-time and lead-time row (`delivery.overall`) and an overall cache ratio (`totals.cache_ratio`). Neither can be derived from the per-type or per-model rows.

Decided 2026-11-05 (user): drop the AI usage member table, the quality-per-epic table and the two time tables, as in the mockup. The API keeps their fields.

## User Stories

### US-1: Reach one report quickly
As a manager, I want each report section in its own tab, with a headline under each tab name, so that I can see the state of all four at a glance and open only the one I need.
REQ: REQ-UI-095, REQ-UI-088

Acceptance criteria:
- The page shows the tabs Delivery, AI usage, Quality and Data coverage, in that order, with Delivery selected when the URL names no tab.
- Under each tab name a headline is shown: "41 beads closed", "12.4M tokens, $38.20", "9% rework", "5 gaps".
- The Data coverage headline has a warning icon when the gap count is above 0.
- Picking a tab puts `tab=<name>` in the URL; reloading or sharing that URL opens the same tab with the same project, period and sprint.
- Left and Right arrow keys move between tabs.

### US-2: Read delivery flow at a glance
As a manager, I want the delivery figures and time spreads as charts, so that I see throughput and slow bead types without reading tables.
REQ: REQ-UI-090, REQ-REPORTS-004

Acceptance criteria:
- The Delivery tab opens with beads closed, median cycle time, median lead time and beads in progress now.
- Cycle time and lead time are shown as range charts (dot at the median, tick at the 85th percentile), switchable between By type and By member.
- In-progress beads per member are shown as bars next to the oldest in-progress beads.
- Each estimated epic shows a chip with the difference between actual and estimated working days.

### US-3: See AI usage and cost per tab
As a manager, I want the AI usage tab to open with its totals and show cost against budget, so that I see where tokens went and which epics overran.
REQ: REQ-UI-089, REQ-REPORTS-003

Acceptance criteria:
- The AI usage tab opens with tokens, estimated cost, tokens per closed bead and cache reads.
- Hovering or focusing a member's bar shows that member's beads, tokens, cost, tokens per bead and cache ratio.
- Each top epic with a budget shows a meter of its cost against the budget, in the warning colour above 100%; an epic without a budget shows "No budget".

### US-4: See rework and review findings
As a manager, I want the Quality tab to show rework per bead and per member, so that I see where work came back.
REQ: REQ-UI-091

Acceptance criteria:
- The Quality tab opens with rework rate, reopens, bugs found later and review cycles per bead.
- Scatter points with rework above 0 have a second colour, named in a legend.
- A table shows rework per member, and a list shows review findings per severity and the waivers.

### US-5: Find data gaps
As a manager, I want the Data coverage tab to count each kind of gap, so that I know what to fix before trusting the other tabs.
REQ: REQ-UI-092

Acceptance criteria:
- Each gap type (not collected, unreadable usage, models without a price, incomplete logs, projects that failed) is a block with its count.
- A block with a count of 0 shows a one-line all-clear instead of an empty list.
- The tab headline's gap count is the sum of the five counts.

## Capabilities Affected
- `ui`:
  - REQ-UI-095 added (report tabs).
  - REQ-UI-088 to REQ-UI-092 modified.
- `reports`: REQ-REPORTS-003 and REQ-REPORTS-004 modified, adding `totals.cache_ratio` and `delivery.overall`.

## Non-goals
- The Milestones tab, the burndown, and any milestone data. These belong to the second epic.
- Changing how the report is computed, other than the two added fields.
- Removing fields from the API. The frontend stops using `usage.members` and `quality.epics`, and both stay in the response.
- Loading tabs separately. The page still makes one report request.

## Success Criteria
- The four tabs match the mockup screenshots `reports-delivery.png`, `reports-ai-usage.png`, `reports-quality.png` and `reports-data-coverage.png`, with the Milestones tab left out.
- Every scenario of the added and modified REQs has an automated test, or a manual case in `05-tests.md`.
- `uv run --directory backend pytest`, `ruff`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
