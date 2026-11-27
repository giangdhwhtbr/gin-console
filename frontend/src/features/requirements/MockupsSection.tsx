import { useEffect, useRef, useState } from "react";
import { Link } from "@/app/Link";
import { useLocation } from "@/app/route";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/features/beads/MarkdownView";
import { formatDate } from "@/lib/dates";
import type { Mockup, MockupList } from "./api";
import { MockupFrame } from "./MockupFrame";
import { LEGACY_TEXT } from "./labels";
import { mockupFileHref, sectionHref } from "./paths";
import { RequirementsError } from "./RequirementsError";
import type { Fetched } from "./useFetched";

const keyOf = (m: Mockup) => `${m.capability}/${m.date}`;
const LOADING = "Loading mockups";
/** REQ-UI-131: how a folder is named; the key stays in addresses. */
const nameOf = (capability: string, date: string) => `${capability} ${formatDate(date)}`;

/** A folder key as its name; any other text as it is. */
function askedName(key: string): string {
  const match = /^([^/]+)\/(\d{4}-\d{2}-\d{2})$/.exec(key);
  return match === null ? key : nameOf(match[1], match[2]);
}

function Selected({ project, mockup }: { project: string; mockup: Mockup }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const file = chosen !== null && mockup.html.includes(chosen) ? chosen : mockup.html[0];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const src = (path: string) => mockupFileHref(project, mockup.capability, mockup.date, path, mockup.grant ?? null);
  return (
    <section aria-label={nameOf(mockup.capability, mockup.date)} className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <h2 ref={heading} tabIndex={-1} className="text-16 font-medium [overflow-wrap:anywhere]">
        {nameOf(mockup.capability, mockup.date)}
      </h2>
      <MarkdownView text={mockup.description} />
      {file !== undefined && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {mockup.html.map((path) => (
              <Button key={path} variant="outline" size="sm" className="h-auto max-w-full whitespace-normal [overflow-wrap:anywhere]" aria-pressed={path === file} onClick={() => setChosen(path)}>
                {path}
              </Button>
            ))}
            <a href={src(file)} target="_blank" rel="noreferrer" className="prose-link text-sm">
              Open in a new tab
            </a>
          </div>
          <MockupFrame title={`${nameOf(mockup.capability, mockup.date)} ${file}`} src={src(file)} />
        </>
      )}
      {mockup.images.map((path) => (
        <img key={path} src={src(path)} alt={path} className="max-w-full rounded border" />
      ))}
    </section>
  );
}

/** REQ-REQUIREMENTS-018, 019: confirmed mockups by capability; the selected one in `mockup=<capability>/<date>`. `legacy` is null while the layout is unknown. */
export function MockupsSection({ project, legacy, list, retry }: { project: string; legacy: boolean | null; list: Fetched<MockupList>; retry: () => void }) {
  const { search } = useLocation();
  if (list.status === "loading") return <p className="text-muted-foreground">{LOADING}</p>;
  if (list.status === "error") return <RequirementsError error={list.error} onRetry={retry} />;
  const { mockups } = list.data;
  if (mockups.length === 0) return <p>{legacy === null ? LOADING : legacy ? LEGACY_TEXT : "This project has no confirmed mockups yet."}</p>;
  const asked = new URLSearchParams(search).get("mockup");
  const selected = mockups.find((m) => keyOf(m) === asked);
  const missing = asked !== null && selected === undefined;
  const capabilities = [...new Set(mockups.map((m) => m.capability))];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {missing && <p role="status">{`Mockup ${askedName(asked)} was not found`}</p>}
      {capabilities.map((capability) => (
        <section key={capability} className="flex flex-col gap-2">
          <h2 className="text-16 font-medium [overflow-wrap:anywhere]">{capability}</h2>
          <ul className="flex flex-col gap-2">
            {mockups
              .filter((m) => m.capability === capability)
              .map((m) => (
                <li key={keyOf(m)} className="flex min-w-0 flex-col gap-0.5 rounded-lg border p-3 text-sm">
                  <Link
                    to={sectionHref("mockups", project, { mockup: keyOf(m) })}
                    aria-current={m === selected ? "page" : undefined}
                    className="prose-link font-medium [overflow-wrap:anywhere]"
                  >
                    <span className="sr-only">{m.capability}</span> {formatDate(m.date)}
                  </Link>
                  <span className="text-muted-foreground">{`Confirmed ${formatDate(m.confirmed)}${m.confirmed_by === null ? "" : ` by ${m.confirmed_by}`}`}</span>
                  {m.requirements.length > 0 && (
                    <span className="flex flex-wrap gap-x-2">
                      {m.requirements.map((id) => (
                        <Link key={id} to={sectionHref("matrix", project, { req: id })} className="prose-link font-mono">
                          {id}
                        </Link>
                      ))}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
      {selected !== undefined && <Selected key={keyOf(selected)} project={project} mockup={selected} />}
    </div>
  );
}
