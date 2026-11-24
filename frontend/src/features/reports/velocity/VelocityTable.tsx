import { Hint } from "@/components/ui/tooltip";
import { DEFINITIONS } from "@/lib/definitions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { oneDecimal, percent, twoDecimals } from "@/features/milestones/format";
import { cn } from "@/lib/utils";
import type { VelocityPoint } from "./velocity";

const HEADS: readonly (readonly [string, string?])[] = [
  ["Milestone"],
  ["Committed"],
  ["Completed"],
  ["Added"],
  ["Commitment met", DEFINITIONS.commitmentMet],
  ["Days per point", DEFINITIONS.daysPerPoint],
  ["Planned days per point", DEFINITIONS.daysPerPoint],
  ["Accuracy"],
];
const orDash = (value: number | null, show: (n: number) => string) => (value === null ? "—" : show(value));

export function VelocityTable({ points, selected }: { points: readonly VelocityPoint[]; selected: string | null }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {HEADS.map(([name, hint]) => (
            <TableHead key={name}>{hint === undefined ? name : <Hint text={hint}><span>{name}</span></Hint>}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {points.map(({ id, title, velocity: v }) => (
          <TableRow key={id} aria-current={id === selected ? "true" : undefined} className={cn(id === selected && "bg-muted")}>
            <TableCell title={title}>{id}</TableCell>
            <TableCell>{orDash(v.committed_points, String)}</TableCell>
            <TableCell>{v.completed_points}</TableCell>
            <TableCell>{v.added_points}</TableCell>
            <TableCell>{orDash(v.say_do, percent)}</TableCell>
            <TableCell>{orDash(v.days_per_point, oneDecimal)}</TableCell>
            <TableCell>{orDash(v.planned_days_per_point, oneDecimal)}</TableCell>
            <TableCell>{orDash(v.accuracy, twoDecimals)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
