from gin_console.requirements import models as m


def folder_of(change: m.TraceChange) -> str:
    return f"{change.archived}-{change.change}" if change.archived else change.change


def status_of(row: m.TraceRequirement) -> tuple[m.Status | None, list[str]]:
    if row.state == "removed":
        return None, []
    results = {c.effective_result for c in row.cases or []}
    if "failed" in results:
        return "failing", ["failed"]
    building = ["proposed"] if row.state == "proposed" else []
    if any(b.status != "closed" for b in row.beads or []):
        building.append("open beads")
    if building:
        return "building", building
    if row.cases is None:
        return "unknown", ["cases unknown"]
    if not row.cases:
        return "untested", ["no case"]
    reasons = sorted(results - {"passed"})
    return ("untested", reasons) if reasons else ("covered", [])


def signoff_of(signoff: m.TraceSignoff | None) -> m.Signoff:
    if signoff is None:
        return m.Signoff(state="none")
    state: m.SignoffState = "unknown version"
    if signoff.waived:
        state = "waived"
    elif signoff.current is not None:
        state = "current" if signoff.current else "changed"
    return m.Signoff(
        state=state,
        actor=signoff.actor,
        at=signoff.at,
        change=signoff.change,
        evidence=signoff.evidence,
        source=signoff.source,
    )


def _row(row: m.TraceRequirement) -> m.RequirementRow:
    status, reasons = status_of(row)
    return m.RequirementRow(
        id=row.id,
        title=row.title,
        capability=row.capability,
        state=row.state,
        status=status,
        reasons=reasons,
        signoff=signoff_of(row.signoff),
        changes=[
            m.ChangeRef(
                folder=folder_of(c), change=c.change, epic=c.epic, op=c.op, archived=c.archived
            )
            for c in row.changes
        ],
        beads=row.beads,
        cases=row.cases,
        tests=row.tests,
    )


def build_list(trace: m.Trace) -> m.RequirementList:
    return m.RequirementList(
        layout=trace.layout,
        requirements=[_row(r) for r in trace.requirements],
        warnings=trace.warnings,
        skipped=[str(s) for s in trace.skipped],
    )


def find_scenarios(reqs: m.Reqs, ident: str) -> m.RequirementScenarios | None:
    found = [r for r in reqs.requirements if r.id == ident]
    if not found:
        return None
    entry = next((r for r in found if r.section == "LIVING"), found[0])
    return m.RequirementScenarios(**entry.model_dump(exclude={"section"}))


def build_changes(
    folders: list[m.ChangeFolder], trace: m.Trace | None, error: str | None, cause: m.Cause | None
) -> m.ChangeList:
    ops: dict[str, list[str]] = {}
    signoffs: dict[str, m.TraceSignoff | None] = {}
    for requirement in trace.requirements if trace else []:
        for change in requirement.changes:
            key = folder_of(change)
            ops.setdefault(key, []).append(change.op)
            signoffs[key] = signoffs.get(key) or change.signoff
    rows = []
    for folder in folders:
        named = ops.get(folder.folder)
        rows.append(
            m.ChangeRow(
                **folder.model_dump(),
                signoff=signoff_of(signoffs[folder.folder]) if named is not None else None,
                added=named.count("added") if named is not None else None,
                modified=named.count("modified") if named is not None else None,
                removed=named.count("removed") if named is not None else None,
            )
        )
    return m.ChangeList(changes=rows, error=error, cause=cause)
