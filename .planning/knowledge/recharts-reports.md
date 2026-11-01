# Recharts in the Reports page

## Context
The Reports page (`frontend/src/features/reports/`) draws its charts with Recharts 3.10.1, loaded only in the lazy `ReportsPage` chunk. Two behaviors are not obvious from the API.

## Decision/Solution
- Recharts' default legend colors each label with its series color (`entry.color`), so the text fails the "text in text tokens" rule and loses contrast. Every `<Legend>` takes `formatter={legendText}` from `ChartBox.tsx`, which wraps the label in `span.text-foreground`; `sections.test.tsx` (REQ-UI-089) asserts it.
- jsdom has no layout, so `ResponsiveContainer` measures 0 and draws nothing. `ChartBox` passes `initialDimension={{ width: 640, height }}`, which makes the charts render in vitest without stubbing Recharts.
- Scatter points are reachable only with a mouse; each scatter has a table of the same beads with links (`QualitySection.tsx`, "Beads by rework", REQ-UI-091).

## Consequences
The look of the charts in light and dark stays a manual check on the Tailscale build (TC-1 of the ce5 change); vitest proves markup only.

## References
- Epic gin-console-ce5, track gin-console-ce5.4 (review findings F-1, F-2, fixed in 7d69705)
- `docs/changes/archive/2026-11-01-gin-console-ce5-team-reports/`

## Scope
gin-console frontend, any chart built with Recharts.
