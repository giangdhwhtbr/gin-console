import { useState } from "react";
import { Link } from "@/app/Link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DEFINITIONS } from "@/lib/definitions";
import { formatDate } from "@/lib/dates";
import { BarRows, type BarRow } from "../BarRows";
import { BUG_COLORS } from "../colors";
import { Figures } from "../Figures";
import { beadPath, formatPercent } from "../format";
import type { BugEpic, BugsReport, EpicRef } from "./bugsApi";

const PAGE = 20;
const UNKNOWN = "Source unknown";

const HINTS = {
  Opened: DEFINITIONS.bugsOpened,
  Closed: DEFINITIONS.bugsClosed,
  "Open now": DEFINITIONS.bugsOpenNow,
  "Oldest open": DEFINITIONS.bugsOldest,
  "Median days to close": DEFINITIONS.bugsMedian,
} as const;

const days = (n: number | null): string => (n === null ? "—" : `${n} d`);
const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

function EpicLink({ project, epic }: { project: string; epic: EpicRef | null }) {
  if (epic === null) return <>{UNKNOWN}</>;
  return (
    <Link to={beadPath(project, epic.id)} className="hover:text-identity">
      {epic.title}
    </Link>
  );
}

const refOf = (row: BugEpic): EpicRef | null => (row.id === null ? null : { id: row.id, title: row.title ?? row.id });

function Weeks({ report }: { report: BugsReport }) {
  const rows: BarRow[] = report.weeks.map((w) => {
    const counts = `${w.opened} opened, ${w.closed} closed`;
    const label = formatDate(w.start, report.today);
    return {
      key: label,
      segments: [
        { name: "Opened", value: w.opened, color: BUG_COLORS.opened },
        { name: "Closed", value: w.closed, color: BUG_COLORS.closed },
      ],
      total: counts,
      detail: `Week of ${label}: ${counts}`,
    };
  });
  return (
    <>
      <ul className="flex gap-4 text-xs text-muted-foreground">
        {(["opened", "closed"] as const).map((name) => (
          <li key={name} className="flex items-center gap-1">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: BUG_COLORS[name] }} />
            {name === "opened" ? "Opened" : "Closed"}
          </li>
        ))}
      </ul>
      <BarRows rows={rows} />
    </>
  );
}

function Epics({ report }: { report: BugsReport }) {
  const unknown = report.epics.find((row) => row.id === null);
  const share = unknown !== undefined && unknown.opened > 0 && report.figures.opened > 0 ? unknown.opened / report.figures.opened : null;
  return (
    <>
      {share !== null && <p className="text-sm text-muted-foreground">{formatPercent(share)} of the bugs opened in this scope have no source epic</p>}
      <Table>
        <TableHeader>
          <TableRow>
            {["Epic", "Opened", "Closed", "Open now"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.epics.map((row) => (
            <TableRow key={row.id ?? "unknown"}>
              <TableCell>
                <EpicLink project={report.project} epic={refOf(row)} />
              </TableCell>
              <TableCell>{row.opened}</TableCell>
              <TableCell>{row.closed}</TableCell>
              <TableCell>{row.open_now}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function OpenBugs({ report }: { report: BugsReport }) {
  const [all, setAll] = useState(false);
  const shown = all ? report.open : report.open.slice(0, PAGE);
  return (
    <>
      <p className="text-sm text-muted-foreground">All open bugs of {report.project}, whatever the scope</p>
      <Table>
        <TableHeader>
          <TableRow>
            {["Bug", "Priority", "Assignee", "Age", "Epic"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((bug) => (
            <TableRow key={bug.id}>
              <TableCell>
                <Link to={beadPath(report.project, bug.id)} className="hover:text-identity">
                  {bug.title}
                </Link>
                <div className="text-xs text-muted-foreground">{bug.id}</div>
              </TableCell>
              <TableCell>{bug.priority === null ? "—" : `P${bug.priority}`}</TableCell>
              <TableCell>{bug.assignee ?? "Unassigned"}</TableCell>
              <TableCell>{days(bug.age_days)}</TableCell>
              <TableCell>
                <EpicLink project={report.project} epic={bug.epic} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!all && report.open.length > PAGE && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setAll(true)}>
          Show all {report.open.length}
        </Button>
      )}
    </>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h2 id={id} className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** REQ-REPORTS-043, REQ-REPORTS-044: bugs by week and by source epic, and every open bug. */
export function BugsSection({ project, report }: { project: string; report: BugsReport }) {
  const { figures } = report;
  if (figures.total === 0) return <Empty text={`No bugs in ${project}`} />;
  const none = "No bugs in this scope";
  return (
    <div className="flex flex-col gap-8">
      <Figures
        hints={HINTS}
        items={[
          ["Opened", String(figures.opened)],
          ["Closed", String(figures.closed)],
          ["Open now", String(figures.open_now)],
          ["Oldest open", days(figures.oldest_open_days)],
          ["Median days to close", days(figures.median_close_days)],
        ]}
      />
      <Block id="bugs-weeks" title="Bugs per week">
        {figures.opened === 0 && figures.closed === 0 ? <Empty text={none} /> : <Weeks report={report} />}
      </Block>
      <Block id="bugs-epics" title="Bugs by epic">
        {report.epics.length === 0 ? <Empty text={none} /> : <Epics report={report} />}
      </Block>
      <Block id="bugs-open" title="Open bugs">
        {report.open.length === 0 ? <Empty text="No open bugs" /> : <OpenBugs report={report} />}
      </Block>
    </div>
  );
}
