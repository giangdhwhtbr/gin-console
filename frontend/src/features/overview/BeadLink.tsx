import { Link } from "@/app/Link";

const enc = encodeURIComponent;

export function BeadLink({ project, id, title = null }: { project: string; id: string; title?: string | null }) {
  return (
    <Link to={`/beads/${enc(project)}/${enc(id)}`} className="min-w-0 [overflow-wrap:anywhere] hover:text-identity">
      <span className="font-mono text-13 text-muted-foreground">{id}</span>
      {title !== null && ` ${title}`}
    </Link>
  );
}
