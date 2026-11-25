import { useCallback } from "react";
import { Link } from "@/app/Link";
import { StateGlyph, type GlyphState } from "@/components/StateGlyph";
import { Button } from "@/components/ui/button";
import { fetchScenarios, type Requirement, type Scenarios } from "./api";
import { signoffText } from "./labels";
import { changeHref } from "./paths";
import { useFetched } from "./useFetched";

const enc = encodeURIComponent;
const two = (n: number) => String(n).padStart(2, "0");
const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
};

function glyphOf(status: string): GlyphState {
  if (status === "closed") return "done";
  if (status === "in_progress" || status === "blocked" || status === "deferred") return status;
  return "ready";
}
const STATE_WORDS: Record<GlyphState, string> = { ready: "Ready", in_progress: "In progress", blocked: "Blocked", done: "Done", deferred: "Deferred" };

function ScenarioList({ data }: { data: Scenarios }) {
  if (data.scenarios.length === 0) return <p className="text-muted-foreground">No scenarios.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {data.scenarios.map((s, i) => (
        <li key={`${s.title}-${i}`}>
          <p className="font-medium">{s.title}</p>
          <ul>
            {s.given.map((t, j) => (
              <li key={`g${j}`}>Given {t}</li>
            ))}
            {s.when.map((t, j) => (
              <li key={`w${j}`}>When {t}</li>
            ))}
            {s.then.map((t, j) => (
              <li key={`t${j}`}>Then {t}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-14 font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** REQ-REQUIREMENTS-015: the panel of one requirement; the scenarios load on their own and may fail alone. */
export function RequirementDetails({ project, id, row, onClose }: { project: string; id: string; row: Requirement | undefined; onClose: () => void }) {
  const { state } = useFetched(useCallback(() => fetchScenarios(project, id), [project, id]));
  const close = (
    <Button variant="outline" size="sm" onClick={onClose}>
      Close
    </Button>
  );
  if (row === undefined) {
    return (
      <aside aria-label={id} className="flex flex-col items-start gap-2 rounded-lg border p-3">
        <p>Requirement {id} was not found</p>
        {close}
      </aside>
    );
  }
  const { signoff } = row;
  return (
    <aside aria-label={id} className="flex min-w-0 flex-col gap-3 rounded-lg border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 text-16 font-medium [overflow-wrap:anywhere]">
          <span className="font-mono text-13">{row.id}</span> {row.title}
        </h2>
        {close}
      </div>
      <Part title="Scenarios">
        {state.status === "loading" && <p className="text-muted-foreground">Loading scenarios</p>}
        {state.status === "error" && <p>Scenarios could not be loaded</p>}
        {state.status === "ok" && <ScenarioList data={state.data} />}
      </Part>
      <Part title="Sign-off">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2">
          <dt className="text-muted-foreground">State</dt>
          <dd>{signoff.state}</dd>
          <dt className="text-muted-foreground">Person and time</dt>
          <dd>{signoffText(signoff, today())}</dd>
          {signoff.change !== null && (
            <>
              <dt className="text-muted-foreground">Change</dt>
              <dd className="[overflow-wrap:anywhere]">{signoff.change}</dd>
            </>
          )}
          {signoff.evidence !== null && (
            <>
              <dt className="text-muted-foreground">{signoff.state === "waived" ? "Reason" : "Evidence"}</dt>
              <dd className="[overflow-wrap:anywhere]">{signoff.evidence}</dd>
            </>
          )}
        </dl>
      </Part>
      <Part title="Changes">
        {row.changes.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          <ul>
            {row.changes.map((c) => (
              <li key={c.folder}>
                <Link to={changeHref(project, c.folder)} className="hover:text-identity">
                  {c.change}
                </Link>{" "}
                ({c.op})
              </li>
            ))}
          </ul>
        )}
      </Part>
      <Part title="Beads">
        {row.beads === null ? (
          <p>unknown</p>
        ) : row.beads.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          <ul>
            {row.beads.map((b) => {
              const glyph = glyphOf(b.status);
              return (
                <li key={b.id} className="flex min-w-0 items-center gap-1">
                  <StateGlyph state={glyph} />
                  <span className="sr-only">{STATE_WORDS[glyph]}</span>
                  <Link to={`/beads/${enc(project)}/${enc(b.id)}`} className="min-w-0 [overflow-wrap:anywhere] hover:text-identity">
                    <span className="font-mono text-13 text-muted-foreground">{b.id}</span> {b.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Part>
      <Part title="Cases">
        {row.cases === null ? (
          <p>unknown</p>
        ) : row.cases.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          <ul>
            {row.cases.map((c) => (
              <li key={c.id}>
                <span className="font-mono text-13">{c.id}</span>: {c.effective_result}
              </li>
            ))}
          </ul>
        )}
      </Part>
      <Part title="Test files">
        {row.tests.length === 0 ? (
          <p className="text-muted-foreground">None</p>
        ) : (
          <ul>
            {row.tests.map((t) => (
              <li key={t} className="font-mono text-13 [overflow-wrap:anywhere]">
                {t}
              </li>
            ))}
          </ul>
        )}
      </Part>
    </aside>
  );
}
