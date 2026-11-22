import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { oneDecimal, percent, twoDecimals } from "@/features/milestones/format";
import type { VelocityPoint } from "./velocity";

const HEADS = ["Milestone", "Committed", "Completed", "Added", "Commitment met", "Days per point", "Planned days per point", "Accuracy"];
const orDash = (value: number | null, show: (n: number) => string) => (value === null ? "—" : show(value));

export function VelocityTable({ points }: { points: readonly VelocityPoint[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {HEADS.map((name) => (
            <TableHead key={name}>{name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {points.map(({ id, title, velocity: v }) => (
          <TableRow key={id}>
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
