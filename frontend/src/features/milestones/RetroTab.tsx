import { MarkdownText } from "@/features/beads/MarkdownText";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { parseRetros, type Section } from "./retro";
import type { useMilestoneComments } from "./useMilestoneComments";

function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map(({ label, text }) => (
        <div key={label} className="flex flex-col gap-0.5 text-sm">
          <h4 className="font-medium">{label}</h4>
          <MarkdownText text={text} />
        </div>
      ))}
    </>
  );
}

const Byline = ({ name, at, truncated }: { name: string; at: string; truncated: boolean }) => (
  <>
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="font-semibold">{name}</span>
      <span className="text-muted-foreground">{formatDateTime(at)}</span>
    </p>
    {truncated && <p className="text-xs text-muted-foreground">Comment truncated</p>}
  </>
);

/** REQ-MILESTONE-UI-019: the close comment and the member retros of the milestone. */
export function RetroTab({ milestoneId, comments }: { milestoneId: string; comments: ReturnType<typeof useMilestoneComments> }) {
  if (comments.state === "loading") return <p className="text-muted-foreground">Loading retros…</p>;
  if (comments.state === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>{comments.error}</span>
          <Button variant="outline" size="sm" onClick={comments.retry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const { close, retros, unparsed } = parseRetros(comments.comments, milestoneId);
  if (close === null && retros.length === 0 && unparsed.length === 0) {
    return <p className="text-muted-foreground">No retros yet. Members record one with <code>/retro</code>.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {close !== null && (
        <section aria-labelledby="retro-close" className="flex flex-col gap-2 rounded-lg border bg-card p-3">
          <h2 id="retro-close" className="text-base font-semibold">Close</h2>
          <Byline name={close.author} at={close.created_at} truncated={close.truncated} />
          <Sections sections={close.sections} />
        </section>
      )}
      {retros.length > 0 && (
        <section aria-labelledby="retro-members" className="flex flex-col gap-2">
          <h2 id="retro-members" className="text-base font-semibold">Retros</h2>
          <ul className="flex flex-col gap-3">
            {retros.map((retro) => (
              <li key={retro.member} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <h3 className="font-semibold">{retro.member}</h3>
                <Byline name={retro.author} at={retro.created_at} truncated={retro.truncated} />
                <Sections sections={retro.sections} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {unparsed.length > 0 && (
        <ul className="flex flex-col gap-3">
          {unparsed.map((raw, at) => (
            <li key={`${at}-${raw.created_at}`} className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
              <Byline name={raw.author} at={raw.created_at} truncated={raw.truncated} />
              <p className="text-xs text-muted-foreground">Not in the expected format</p>
              <p className="whitespace-pre-wrap break-words text-sm">{raw.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
