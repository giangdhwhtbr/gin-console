# Recharts in the Reports page

## Context
The Reports page (`frontend/src/features/reports/`) draws its charts with Recharts 3.10.1, loaded only in the lazy `ReportsPage` chunk. Two behaviors are not obvious from the API.

## Decision/Solution
- Recharts' default legend colors each label with its series color (`entry.color`), so the text fails the "text in text tokens" rule and loses contrast. Every `<Legend>` takes `formatter={legendText}` from `ChartBox.tsx`, which wraps the label in `span.text-foreground`; `sections.test.tsx` (REQ-UI-089) asserts it.
- jsdom has no layout, so `ResponsiveContainer` measures 0 and draws nothing. `ChartBox` passes `initialDimension={{ width: 640, height }}`, which makes the charts render in vitest without stubbing Recharts.
- Tailwind 4 emits a `@theme` variable (`--color-*`) only when its full name appears in the sources, so `var(--color-series-${n})` built at run time pointed at undefined variables and the SVG fell back to black. Chart colors name the plain `--series-N` variables declared in `:root` and `.dark` (`colors.ts`); `colors.test.ts` checks every slot against `index.css`.
- The Quality scatter draws two `<Scatter>` series ("No rework", "Some rework") so the legend names both colors; the "Beads by rework" table of ce5 was dropped in gin-console-xza.4, and REQ-UI-091 now requires each point to name its bead on hover and on focus. vitest cannot reach points by keyboard, so focus stays a manual check on the Tailscale build.
- Horizontal bars and ranges (`BarRows.tsx`, `RangeChart.tsx`, gin-console-xza.3) are plain DOM, not Recharts, so they render in jsdom without `ChartBox`. The Team tab's closed-per-day chart (`team/ClosedPerDayChart.tsx`, gin-console-slc.3) follows the same pattern: an `ol` of focusable columns with a `role="tooltip"` shown on hover and focus, so its tooltip and keyboard focus are tested in vitest, which Recharts points cannot be.

## Consequences
The look of the charts in light and dark stays a manual check on the Tailscale build (TC-1 of the ce5 change); vitest proves markup only.

## References
- Epic gin-console-ce5, track gin-console-ce5.4 (review findings F-1, F-2, fixed in 7d69705)
- `docs/changes/archive/2026-11-01-gin-console-ce5-team-reports/`
- Epic gin-console-xza (tracks .3, .4), `docs/changes/archive/2026-11-05-gin-console-xza-reports-tabs/`
- Epic gin-console-slc (track .3), `docs/changes/archive/2026-11-12-gin-console-slc-team-tab/`

## Scope
gin-console frontend, any chart built with Recharts.
