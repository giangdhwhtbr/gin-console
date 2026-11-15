# Epic kind and capabilities in the Beads views

Epic: gin-console-it2
Kind: capability
Date: 2026-11-15

## Why

gin-workflow gives each roadmap epic a kind and lists its capabilities:
- The kind is the label `kind:capability`, `kind:technical` or `kind:parity`. An epic without that label counts as capability.
- The capabilities are written on a `Capabilities:` line of the epic description.
- In the SDD layout, each track also carries `req:REQ-<CAP>-NNN` labels.

The console treats `kind:` as just another label. The List shows at most three labels, so the kind can be hidden. The console does not read capabilities at all, and its bead list drops `estimated_minutes`. As a result a team member cannot see what type of epic they are looking at, cannot tell which capability it touches, and cannot narrow the views to one kind or one capability.

The 2026-11-15 audit of gin-console-workflow-catchup found these gaps and split them into this epic. Every project's `Capabilities:` line is empty today, while the `req:` labels of SDD tracks already name their capability. So the capabilities come from both sources.

## What Changes

- `GET /api/beads` adds four fields per bead: `kind` (for epics), `capabilities`, `complexity` and `estimate_minutes`.
- Capabilities come from two sources: the `Capabilities:` line and the `req:` labels. An epic's capabilities also include those of its children.
- Technical and parity epics show a badge in these places: the List row, the Board and Focus cards, the bead page and the Gantt label.
- The bead page shows capability chips and "Estimate <n>d".
- An epic's List row shows "<complexity> · <n>d".
- New "Kind" and "Capability" filters apply to every Beads view and to the milestone's Beads tab. They are kept in the URL as `kind` and `capability`.
- The example project gains kind labels, `Capabilities:` lines and `req:` labels, so the views can be checked.

## User Stories

### US-1: Know what an epic is
As a team member, I want to see whether an epic is technical or parity work, which capabilities it touches, and how big it is, so that I can read the plan without opening each description.
REQ: REQ-BEADS-001, REQ-UI-109

Acceptance criteria:
- A technical epic shows "Technical" on its row, card, bead page and Gantt label. A capability epic shows no kind badge.
- The bead page of an epic or track shows its capability chips and "Estimate <n>d".
- An epic row shows "medium · 3d" when it has a complexity and an estimate.

### US-2: Narrow the views by kind or capability
As a team lead, I want to filter the Beads views by kind and by capability, so that I can review only the technical work or only one capability's epics and tracks.
REQ: REQ-UI-108, REQ-BEADS-001

Acceptance criteria:
- Kind "Technical" shows technical epics together with their tracks. The URL has `kind=technical`.
- Capability `milestone-ui` shows the tracks and epics with that capability. The URL has `capability=milestone-ui`.
- There is no Capability filter when no bead has a capability.

## Capabilities Affected

- `beads`: MODIFIED REQ-BEADS-001.
  - Diagram: `docs/specs/beads/diagrams/kind-capabilities-activity.md`.
- `ui`: ADDED REQ-UI-108 and REQ-UI-109.
- Assets: none.

## Non-goals

- Editing kinds or capabilities. The console is read-only.
- Grouping or swimlanes by capability.
- A gin-workflow JSON field for capabilities.
- The project card, which belongs to gin-console-5ox.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with the example project, checked by Playwright with screenshots.
