# Spec Delta: Unassigned epics

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-MILESTONE-UI-010: Epics not in a milestone
gin-console SHALL show, below the milestones of the Milestones page, a section "Epics not in a milestone" listing each bead of type `epic` without a parent from `GET /api/beads` for the project, each row with its state, id, title linked to `/beads/<project>/<id>`, priority, and labels, ordered by priority then id, SHALL show in the section heading the number of listed rows, SHALL list only open epics unless a "Show closed" checkbox is checked, which adds closed epics shown dimmed, and IF the beads request fails, THEN SHALL show the error and a Retry button in the section without changing the milestones.

#### Scenario: epics without a parent
- GIVEN project P with open epics A (labelled `roadmap`) and B (no labels) without a parent, open epic C whose parent is milestone M1, open epic D whose parent is epic A, and open task T without a parent
- WHEN the user opens Milestones for P
- THEN the section heading shows 2, and the section lists A and B only, each title linking to its bead page

#### Scenario: show closed
- GIVEN project P with open epic A and closed epic E, both without a parent
- WHEN the user checks "Show closed"
- THEN the section lists A and E with E dimmed, and the heading shows 2

#### Scenario: every epic in a milestone
- GIVEN project P whose open epics all have a milestone parent
- WHEN the user opens Milestones for P
- THEN the section heading shows 0 and the section says every epic is in a milestone

#### Scenario: beads request fails
- GIVEN project P whose milestones load and whose `GET /api/beads` responds 502
- WHEN the user opens Milestones for P
- THEN the milestones are listed, the section shows the error with a Retry button, and Retry requests the beads again

## MODIFIED

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: 46d4025a664ba687d2a0a4256465566fb39c9c81e9e3a1c7f19711dfadacb628 -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), epic progress, and warning count, from `gin-workflow milestone list --all --json`, SHALL show a list entry's `error` in place of its progress and warnings, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, progress, and warning count

#### Scenario: unassigned count not shown
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page does not show a sentence counting roadmap epics outside milestones

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

## REMOVED
