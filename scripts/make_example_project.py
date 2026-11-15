#!/usr/bin/env python3
"""Build a gin-console example project with sample beads, for testing and demos.

The project gets a real Beads database (`bd init` + `bd import`) and a minimal
gin-workflow config, so every page works on it: Beads, My Tasks, Milestones (Gantt,
forecast), Reports (Team, Delivery, AI usage, Quality) and Projects. Dates are relative
to today, so the charts always show recent work. Running it again rebuilds the project.

    python3 scripts/make_example_project.py            # writes examples/example-project
    python3 scripts/make_example_project.py --out DIR --today 2026-11-12

Then add it to ~/.config/gin-console/config.yaml:

    projects:
      - name: example
        path: <absolute path printed by this script>

Needs `bd` (Beads) on PATH; `gin` is only used by the final check when present.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import subprocess
import tempfile
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

PREFIX = "ex"
MEMBERS = ["ann", "bao", "chi", "dung"]
OWNER = "lead@example.com"
REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "examples" / "example-project"

Row = dict[str, Any]


# ---------- dates ----------
def workday(d: date, back: bool = False) -> date:
    """The nearest Monday-to-Friday day, forward (or backward)."""
    while d.weekday() >= 5:
        d += timedelta(days=-1 if back else 1)
    return d


def stamp(d: date, hour: int = 10) -> str:
    return datetime(d.year, d.month, d.day, hour, 0, tzinfo=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------- builders ----------
class Project:
    def __init__(self, today: date, seed: int) -> None:
        self.today = today
        self.rng = random.Random(seed)
        self.rows: list[Row] = []
        self.counter: Counter[str] = Counter()

    def add(self, ident: str, title: str, issue_type: str, created: date, **extra: Any) -> Row:
        row: Row = {
            "id": ident,
            "title": title,
            "description": extra.pop(
                "description", f"Sample {issue_type} for the gin-console example project."
            ),
            "issue_type": issue_type,
            "status": extra.pop("status", "open"),
            "priority": extra.pop("priority", 2),
            "owner": OWNER,
            "created_by": "lead",
            "created_at": stamp(created, 9),
            "updated_at": stamp(created, 9),
        }
        parent = extra.pop("parent", None)
        deps: list[Row] = []
        if parent:
            deps.append(self.dep(ident, parent, "parent-child", created))
        for target, kind in extra.pop("deps", []):
            deps.append(self.dep(ident, target, kind, created))
        if deps:
            row["dependencies"] = deps
        row.update({k: v for k, v in extra.items() if v is not None})
        self.rows.append(row)
        return row

    @staticmethod
    def dep(issue: str, target: str, kind: str, when: date) -> Row:
        return {
            "issue_id": issue,
            "depends_on_id": target,
            "type": kind,
            "created_at": stamp(when, 9),
            "created_by": "lead",
            "metadata": "{}",
        }

    def child_id(self, parent: str) -> str:
        self.counter[parent] += 1
        return f"{parent}.{self.counter[parent]}"

    def usage(self, tokens: int, *, reopens: int = 0, bugs: int = 0, stage: str = "execute") -> Row:
        """An `ai_usage` (version 1) as gin-workflow `usage collect` writes it."""
        model = self.rng.choice(["sonnet", "opus", "haiku"])
        price = {"sonnet": 3e-6, "opus": 1.5e-5, "haiku": 8e-7}[model]
        cache = tokens // 2
        entry = {
            "input": tokens // 5,
            "output": tokens // 5,
            "cache_read": cache,
            "cache_write": tokens - 2 * (tokens // 5) - cache,
            "cost": round(tokens * price, 4),
        }
        return {
            "version": 1,
            "collected_at": stamp(self.today, 8),
            "models": {model: entry},
            "roles": {"developer": {model: entry}},
            "stages": {stage: {"tokens": tokens, "cost": entry["cost"]}},
            "quality": {
                "reopens": reopens,
                "bugs": bugs,
                "review_cycles": 1 + reopens,
                "rejections": reopens,
                "waivers": 0,
                "findings": {"critical": 0, "important": reopens, "minor": 1, "suggestion": 0},
            },
            "unpriced": [],
            "sources": {"claude_code": "ok", "codex": "ok"},
            "skipped_lines": 0,
        }

    def task(
        self,
        parent: str,
        title: str,
        status: str,
        *,
        start: date,
        end: date,
        assignee: str | None = "auto",
        issue_type: str = "task",
        labels: list[str] | None = None,
        collected: bool = True,
        **extra: Any,
    ) -> Row:
        """A child bead with its times between `start` and `end`; a closed one closes there."""
        ident = self.child_id(parent)
        who = self.rng.choice(MEMBERS) if assignee == "auto" else assignee
        span = max((end - start).days, 1)
        created = start - timedelta(days=self.rng.randint(1, 4))
        fields: Row = {
            "status": status,
            "parent": parent,
            "assignee": who,
            "labels": labels,
            "priority": self.rng.choice([1, 2, 2, 3]),
        }
        if status in ("in_progress", "closed", "blocked"):
            began = workday(start + timedelta(days=self.rng.randint(0, max(span - 3, 0))))
            fields["started_at"] = stamp(min(began, self.today), 11)
        if status == "closed":
            began_on = date.fromisoformat(fields["started_at"][:10])
            done = workday(began_on + timedelta(days=self.rng.randint(0, 4)), back=False)
            done = min(done, end, self.today)
            done = max(done, began_on)
            fields["closed_at"] = stamp(done, 16)
            fields["updated_at"] = stamp(done, 16)
            fields["close_reason"] = "Done"
            if collected:
                fields["metadata"] = {
                    "ai_usage": self.usage(
                        self.rng.randint(40_000, 900_000),
                        reopens=1 if self.rng.random() < 0.12 else 0,
                        bugs=1 if self.rng.random() < 0.08 else 0,
                    )
                }
        elif status == "in_progress":
            fields["updated_at"] = stamp(min(self.today, start + timedelta(days=span)), 12)
        fields.update(extra)
        return self.add(ident, title, issue_type, created, **fields)


# ---------- the story ----------
TITLES = [
    "Design API contract",
    "Add database migration",
    "Build list endpoint",
    "Wire UI table",
    "Empty and error states",
    "Keyboard navigation",
    "Mobile layout",
    "Write unit tests",
    "Write e2e test",
    "Docs update",
    "Fix rounding bug",
    "Cache invalidation",
    "Accessibility pass",
    "Loading skeleton",
    "Analytics events",
]


def build(today: date, seed: int = 7) -> list[Row]:
    p = Project(today, seed)

    def p_id(suffix: str) -> str:
        return f"{PREFIX}-{suffix}"

    # Milestones: one closed late, one active, one planned.
    m1_start, m1_end = (
        workday(today - timedelta(days=45)),
        workday(today - timedelta(days=24), back=True),
    )
    m1_closed = workday(m1_end + timedelta(days=3))
    late = sum(
        (m1_end + timedelta(days=n)).weekday() < 5 for n in range(1, (m1_closed - m1_end).days + 1)
    )
    m2_start, m2_end = (
        workday(today - timedelta(days=10)),
        workday(today + timedelta(days=11), back=True),
    )
    m3_start, m3_end = (
        workday(today + timedelta(days=14)),
        workday(today + timedelta(days=35), back=True),
    )
    p.add(
        p_id("m1"),
        "Onboarding revamp",
        "milestone",
        m1_start - timedelta(days=7),
        status="closed",
        metadata={
            "start": m1_start.isoformat(),
            "end": m1_end.isoformat(),
            "kickoff": m1_start.isoformat(),
        },
        closed_at=stamp(m1_closed, 17),
        updated_at=stamp(m1_closed, 17),
        close_reason=f"Finished {late} working days late",
    )
    p.add(
        p_id("m2"),
        "Checkout v2",
        "milestone",
        m2_start - timedelta(days=7),
        metadata={
            "start": m2_start.isoformat(),
            "end": m2_end.isoformat(),
            "kickoff": m2_start.isoformat(),
        },
    )
    p.add(
        p_id("m3"),
        "Mobile parity",
        "milestone",
        today - timedelta(days=3),
        metadata={"start": m3_start.isoformat(), "end": m3_end.isoformat()},
    )

    def epic(ident: str, title: str, milestone: str | None, created: date, **extra: Any) -> Row:
        return p.add(
            p_id(ident),
            title,
            "epic",
            created,
            parent=p_id(milestone) if milestone else None,
            **extra,
        )

    # m1: closed milestone, everything done (some closed after its end date).
    for ident, title in (("e1", "Signup flow"), ("e2", "Welcome tour")):
        e = epic(
            ident,
            title,
            "m1",
            m1_start - timedelta(days=5),
            status="closed",
            priority=1,
            estimated_minutes=480 * 6,
            labels=["sprint:s13"],
            assignee="ann",
            started_at=stamp(m1_start),
            closed_at=stamp(m1_closed, 16),
            updated_at=stamp(m1_closed, 16),
        )
        for title_ in p.rng.sample(TITLES, 7):
            p.task(e["id"], title_, "closed", start=m1_start, end=m1_closed)

    # m2: active milestone with every kind of epic.
    e3 = epic(
        "e3",
        "Payment page",
        "m2",
        m2_start - timedelta(days=4),
        status="in_progress",
        priority=1,
        estimated_minutes=480 * 8,
        labels=["sprint:s15"],
        assignee="bao",
        started_at=stamp(m2_start),
    )
    statuses = ["closed"] * 5 + ["in_progress"] * 2 + ["blocked", "open", "open"]
    tasks3 = [
        p.task(e3["id"], t, s, start=m2_start, end=today)
        for t, s in zip(p.rng.sample(TITLES, len(statuses)), statuses, strict=True)
    ]
    blocker = next(t for t in tasks3 if t["status"] == "open")
    blocked = next(t for t in tasks3 if t["status"] == "blocked")
    blocked.setdefault("dependencies", []).append(
        p.dep(blocked["id"], blocker["id"], "blocks", m2_start)
    )
    bug = p.task(
        e3["id"],
        "Bug: total shows NaN for empty cart",
        "open",
        start=m2_start,
        end=today,
        issue_type="bug",
        priority=0,
        assignee="chi",
    )
    bug["dependencies"].append(p.dep(bug["id"], tasks3[0]["id"], "discovered-from", m2_start))
    tasks3[1]["comments"] = [
        {
            "id": "ex-c1",
            "issue_id": tasks3[1]["id"],
            "author": "bao",
            "created_at": stamp(m2_start + timedelta(days=1), 14),
            "text": "The button stays disabled until the card is valid. **Agreed** with design.",
        },
        {
            "id": "ex-c2",
            "issue_id": tasks3[1]["id"],
            "author": "ann",
            "created_at": stamp(m2_start + timedelta(days=2), 9),
            "text": "Done in the last commit; see `CheckoutButton.tsx`.",
        },
    ]

    e4 = epic(
        "e4",
        "Address book",
        "m2",
        m2_start - timedelta(days=3),
        status="in_progress",
        estimated_minutes=480 * 5,
        labels=["sprint:s15"],
        assignee="chi",
        started_at=stamp(m2_start),
    )
    for t, s in zip(
        p.rng.sample(TITLES, 5), ["closed", "closed", "in_progress", "open", "open"], strict=True
    ):
        p.task(e4["id"], t, s, start=m2_start, end=today)
    p.task(
        e4["id"],
        "Capture the legacy address form",
        "closed",
        start=m2_start - timedelta(days=6),
        end=m2_start,
        labels=["prep", "prep:capture"],
        assignee="chi",
    )

    # Epics assigned but not yet split into tasks (they count in the Team tab).
    epic(
        "e5",
        "Gift cards",
        "m2",
        today - timedelta(days=6),
        assignee="dung",
        estimated_minutes=480 * 3,
    )
    epic("e6", "Saved payment methods", "m2", today - timedelta(days=5), assignee="dung")
    epic(
        "e7",
        "Order history export",
        "m2",
        today - timedelta(days=4),
        assignee="ann",
        status="in_progress",
        started_at=stamp(today - timedelta(days=2)),
    )

    # An epic whose only children are prep tasks.
    e8 = epic("e8", "Loyalty points", "m2", today - timedelta(days=7), assignee="bao")
    p.task(
        e8["id"],
        "Mockup the points widget",
        "open",
        start=today,
        end=today,
        labels=["prep", "prep:mockup"],
        assignee="bao",
    )
    p.task(
        e8["id"],
        "Spike: points ledger storage",
        "closed",
        start=today - timedelta(days=5),
        end=today,
        labels=["prep", "prep:spike"],
        assignee="bao",
        collected=False,
    )

    # m3: planned milestone, work not started.
    e9 = epic("e9", "Mobile checkout", "m3", today - timedelta(days=3), estimated_minutes=480 * 7)
    for t in p.rng.sample(TITLES, 4):
        p.task(e9["id"], t, "open", start=today, end=today, assignee=None)
    epic("e10", "Mobile push notifications", "m3", today - timedelta(days=2))

    # Outside milestones: an epic with work, and stray beads.
    e11 = epic(
        "e11",
        "Tech debt",
        None,
        today - timedelta(days=30),
        status="in_progress",
        started_at=stamp(today - timedelta(days=20)),
    )
    for t, s in zip(
        p.rng.sample(TITLES, 6),
        ["closed", "closed", "closed", "deferred", "open", "in_progress"],
        strict=True,
    ):
        p.task(
            e11["id"],
            t,
            s,
            start=today - timedelta(days=20),
            end=today,
            assignee=p.rng.choice([*MEMBERS, None]),
        )
    p.add(
        p_id("t1"),
        "Investigate flaky CI job",
        "chore",
        today - timedelta(days=3),
        assignee=None,
        priority=3,
    )
    p.add(
        p_id("t2"),
        "Bug: date picker ignores locale",
        "bug",
        today - timedelta(days=1),
        assignee="chi",
        priority=1,
    )
    long_text(p, today, m2_start, p_id("m2"), m3_end)
    return p.rows


# Long titles, ids, names and labels, to catch layout problems in every view.
LONG_MEMBER = "nguyen.thi.thanh.huong.payments-team@example-company.com.vn"
LONG_URL = "https://payments.example.com/api/v3/settlements/reconciliation/reports/daily"
LONG_TOKEN = "PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean"
LONG_TITLES = [
    f"Handle {LONG_TOKEN} in the worker",
    "Xử lý đối soát giao dịch thanh toán đa tiền tệ khi nhà cung cấp trả về mã lỗi không xác định",
    f"Document {LONG_URL}?currency=VND",
    "Retry failed webhooks with exponential backoff, jitter, a dead letter queue, alerting, a "
    "manual replay screen for support, and an audit trail that finance can export each month",
    "Ok",
]
LONG_DESCRIPTION = "\n".join(
    [
        "Move every checkout payment to the new provider.",
        "",
        "| Currency | Old gateway fee | New gateway fee | Settlement delay | Reconciliation file |",
        "|---|---|---|---|---|",
        "| VND | 2.2% | 1.6% | T+2 | settlement_report_vnd_daily_reconciliation_2026_11_15.csv |",
        "| USD | 2.9% + 0.30 | 2.4% + 0.25 | T+1 | settlement_report_usd_daily_2026_11_15.csv |",
        "",
        "```",
        f"curl -X POST {LONG_URL} -H 'Authorization: Bearer <token>' "
        + """-d '{"currency":"VND","provider":"new-gateway"}'""",
        "```",
        "",
        "See https://wiki.example.com/payments/migration/2026/checkout-v2/provider-switch-runbook",
    ]
)


def long_text(p: Project, today: date, start: date, milestone: str, after: date) -> None:
    epic = p.add(
        f"{PREFIX}-payments-provider-migration-and-reconciliation-2026",
        "Migrate every checkout payment to the new provider, reconcile settlements across "
        "currencies, and retire the legacy gateway without downtime",
        "epic",
        start - timedelta(days=4),
        parent=milestone,
        status="in_progress",
        assignee=LONG_MEMBER,
        priority=1,
        estimated_minutes=480 * 10,
        started_at=stamp(start),
        labels=[
            "sprint:s15",
            "area:payments-reconciliation-service",
            "domain:multi-currency-settlement",
            "risk:high-regulatory-review",
            "team:checkout-platform-squad",
        ],
        description=LONG_DESCRIPTION,
    )
    statuses = ["closed", "in_progress", "open", "blocked", "closed"]
    tasks = [
        p.task(
            epic["id"],
            title,
            status,
            start=start,
            end=today,
            assignee=LONG_MEMBER if i % 2 == 0 else "bao",
            labels=["area:payments-reconciliation-service", "needs:security-review"],
        )
        for i, (title, status) in enumerate(zip(LONG_TITLES, statuses, strict=True))
    ]
    tasks[0]["comments"] = [
        {
            "id": "ex-c3",
            "issue_id": tasks[0]["id"],
            "author": LONG_MEMBER,
            "created_at": stamp(start + timedelta(days=1), 15),
            "text": "Stack trace: com.example.payments.reconciliation.SettlementWorker"
            f".handleTimeout(SettlementWorker.java:418) caused by {LONG_TOKEN}",
        }
    ]
    p.task(
        epic["id"],
        "Capture the legacy gateway's settlement export format, field by field, with samples",
        "open",
        start=today,
        end=today,
        labels=["prep", "prep:capture"],
        assignee=LONG_MEMBER,
    )
    # Three levels under the epic: long ids such as ex-payments-...-2026.2.1.1
    sub = p.task(
        tasks[1]["id"],
        "Split the settlement worker into fetch and match",
        "open",
        start=today,
        end=today,
        assignee="chi",
    )
    p.task(
        sub["id"],
        "Match settlements by provider reference, then by amount and date",
        "open",
        start=today,
        end=today,
        assignee=None,
    )
    m_start, m_end = (
        workday(after + timedelta(days=7)),
        workday(after + timedelta(days=28), back=True),
    )
    p.add(
        f"{PREFIX}-m4",
        "Platform hardening: performance budgets, an accessibility audit, and "
        "observability for every critical journey",
        "milestone",
        today - timedelta(days=1),
        metadata={"start": m_start.isoformat(), "end": m_end.isoformat()},
    )


# ---------- writing ----------
WORKFLOW_CONFIG = "providers:\n  task_tracking: beads\n"
# Written into every project this script builds; only such a folder is ever replaced.
MARKER = Path(".agent-workflow") / "example-project"


def run(cmd: list[str], cwd: Path) -> str:
    # Drop Beads environment overrides so `bd` only ever touches the folder it runs in.
    env = {k: v for k, v in os.environ.items() if not k.startswith(("BEADS_", "BD_"))}
    done = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=False, env=env)
    if done.returncode != 0:
        raise SystemExit(f"{' '.join(cmd)} failed in {cwd}:\n{done.stderr or done.stdout}")
    return done.stdout


def guard(out: Path) -> None:
    """Refuse an output folder that this script did not build, so a typo deletes nothing."""
    protected = {REPO_ROOT, Path.cwd().resolve(), Path.home().resolve()}
    if any(out == p or out in p.parents for p in protected):
        raise SystemExit(f"{out} is the repository, the current folder, home, or a parent of one")
    if out.is_symlink() or (out.exists() and not out.is_dir()):
        raise SystemExit(f"{out} is a symlink or a file; refusing to replace it")
    if out.exists() and any(out.iterdir()) and not (out / MARKER).is_file():
        raise SystemExit(
            f"{out} is not empty and was not built by this script; refusing to replace it"
        )


def write(out: Path, rows: list[Row]) -> None:
    guard(out)
    # Build outside any repository: `bd init` inside another Beads project picks up that
    # project's database and prefix (here, gin-console's own beads).
    with tempfile.TemporaryDirectory(prefix="gin-example-") as tmp:
        work = Path(tmp) / "project"
        work.mkdir()
        run(["git", "init", "-q"], work)
        run(["bd", "init", "--prefix", PREFIX, "--non-interactive", "--quiet"], work)
        source = Path(tmp) / "beads.jsonl"
        source.write_text("".join(json.dumps(row) + "\n" for row in rows))
        run(["bd", "import", str(source)], work)
        run(["bd", "export", "-o", ".beads/issues.jsonl"], work)
        (work / ".agent-workflow").mkdir()
        (work / ".agent-workflow" / "config.yaml").write_text(WORKFLOW_CONFIG)
        (work / MARKER).write_text("built by gin-console scripts/make_example_project.py\n")
        if out.exists():
            shutil.rmtree(out)
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(work), str(out))


def check(out: Path, rows: list[Row]) -> list[str]:
    """Problems found in the written project; empty when it is usable."""
    problems: list[str] = []
    exported = [
        json.loads(line)
        for line in (out / ".beads" / "issues.jsonl").read_text().splitlines()
        if line.strip()
    ]
    if len(exported) != len(rows):
        problems.append(f"exported {len(exported)} beads, expected {len(rows)}")
    by_id = {r["id"]: r for r in exported}
    for row in rows:
        got = by_id.get(row["id"])
        if got is None:
            problems.append(f"{row['id']} missing from the export")
            continue
        for key in ("status", "created_at", "closed_at", "started_at"):
            if row.get(key) != got.get(key):
                problems.append(
                    f"{row['id']}.{key}: wrote {row.get(key)!r}, exported {got.get(key)!r}"
                )
    kinds = Counter(r["issue_type"] for r in exported)
    if kinds["milestone"] != 4 or kinds["epic"] < 9:
        problems.append(f"unexpected bead kinds: {dict(kinds)}")
    if not any("prep" in (r.get("labels") or []) for r in exported):
        problems.append("no prep task")
    if shutil.which("gin"):
        listed = subprocess.run(
            ["gin", "milestone", "list", "--all", "--json"],
            cwd=out,
            capture_output=True,
            text=True,
            check=False,
        )
        if listed.returncode != 0:
            problems.append(f"gin milestone list failed: {listed.stderr.strip()[-300:]}")
        else:
            statuses = sorted(m["status"] for m in json.loads(listed.stdout)["milestones"])
            if statuses != ["active", "closed", "planned", "planned"]:
                problems.append(f"gin milestone list statuses: {statuses}")
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--out", type=Path, default=DEFAULT_OUT, help="project directory (default: %(default)s)"
    )
    parser.add_argument(
        "--today", type=date.fromisoformat, default=date.today(), help="anchor date, YYYY-MM-DD"
    )
    parser.add_argument("--seed", type=int, default=7, help="random seed for the sample data")
    args = parser.parse_args()
    if shutil.which("bd") is None:
        raise SystemExit("bd (Beads) is not on PATH")
    out = args.out.resolve()
    rows = build(args.today, args.seed)
    write(out, rows)
    problems = check(out, rows)
    if problems:
        raise SystemExit("example project written but not usable:\n- " + "\n- ".join(problems))
    kinds = Counter(r["issue_type"] for r in rows)
    print(f"example project ready: {out}")
    print(f"beads: {len(rows)} ({', '.join(f'{n} {k}' for k, n in sorted(kinds.items()))})")
    print(f"add to the gin-console config:  - name: example\n    path: {out}")


if __name__ == "__main__":
    main()
