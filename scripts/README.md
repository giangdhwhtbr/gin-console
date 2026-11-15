# Scripts

## Example project

`make_example_project.py` builds `examples/example-project/`, a gin-console project with sample beads for testing new pages and checking them in the browser. The `examples/` folder is git-ignored; run the script again to rebuild it.

```bash
python3 scripts/make_example_project.py
python3 scripts/make_example_project.py --today 2026-11-12   # fix the anchor date
python3 scripts/make_example_project.py --out /tmp/example   # another folder
```

The script needs `bd` on `PATH`. It runs `bd init` and `bd import` in a temporary folder outside any repository, exports `.beads/issues.jsonl`, writes a minimal `.agent-workflow/config.yaml` (`providers.task_tracking: beads`), and moves the result to the output folder. It replaces the output folder only when the folder is missing, empty, or was built by this script (it leaves `.agent-workflow/example-project` as a marker), and never when the folder is the repository, the current folder, the home folder, or a parent of one. It then checks the export against the generated rows and, when `gin` is on `PATH`, that `gin milestone list` sees the milestones. It prints the absolute path to add to the gin-console config:

```yaml
projects:
  - name: example
    path: /absolute/path/to/gin-console/examples/example-project
```

Restart gin-console after editing the config.

Dates are relative to the anchor date (today by default), so the charts always show recent work. The data is the same for the same anchor date and `--seed`:

| Case | Beads |
|---|---|
| Members | `ann`, `bao`, `chi`, `dung`, a long email assignee (see Long text), and unassigned beads |
| Milestone closed late | `ex-m1` "Onboarding revamp", epics `ex-e1` and `ex-e2`, every child closed, up to the milestone's close date, which is after its end date |
| Active milestone | `ex-m2` "Checkout v2" |
| Epic split into tasks | `ex-e3` (closed, in progress, blocked and open tasks, a `blocks` dependency, a `discovered-from` bug, comments), `ex-e4` (tasks and a closed prep task) |
| Epics not split into tasks | `ex-e5`, `ex-e6` (open) and `ex-e7` (in progress), each assigned to a member |
| Epic with only prep tasks | `ex-e8` (an open `prep:mockup` and a closed `prep:spike`) |
| Planned milestone | `ex-m3` "Mobile parity", epics `ex-e9` (unassigned open tasks) and `ex-e10` (no tasks) |
| Outside any milestone | epic `ex-e11` (tasks including a deferred one), chore `ex-t1`, bug `ex-t2` |
| Usage | every closed child bead, except the spike in `ex-e8`, has a version 1 `ai_usage` with tokens, cost, and some reopens and bugs |
| Planned milestone with a long title | `ex-m4` "Platform hardening: …", after `ex-m3`, no epics |
| Long text | epic `ex-payments-provider-migration-and-reconciliation-2026` in `ex-m2`: a long title, a long email assignee, five long labels, a description with a wide table, a code block and long URLs; tasks with an unbroken CamelCase token, a Vietnamese title, a URL, a very long title and a two-letter title; a long-titled prep task; a comment with a stack trace; tasks nested three levels deep (`….2.1.1`) |
| Sprints and estimates | `sprint:s13` and `sprint:s15` labels; `estimated_minutes` on several epics |

To add a case for a new feature, edit `build()` in the script and run it again.
