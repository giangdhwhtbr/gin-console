import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BeadSummary } from "./api";

export function BeadTable({ project, beads }: { project: string; beads: readonly BeadSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Id", "Title", "Type", "Status", "Priority", "Labels", "Assignee", "Updated"].map((name) => (
            <TableHead key={name}>{name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {beads.map((bead) => (
          <TableRow key={bead.id}>
            <TableCell className="font-mono text-xs">{bead.id}</TableCell>
            <TableCell className="font-medium">
              <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>{bead.title}</Link>
            </TableCell>
            <TableCell>{bead.issue_type}</TableCell>
            <TableCell>
              <Badge variant="secondary">{bead.status}</Badge>
            </TableCell>
            <TableCell>{`P${bead.priority}`}</TableCell>
            <TableCell className="space-x-1">
              {bead.labels.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </TableCell>
            <TableCell>{bead.assignee ?? bead.owner ?? ""}</TableCell>
            <TableCell>{new Date(bead.updated_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
