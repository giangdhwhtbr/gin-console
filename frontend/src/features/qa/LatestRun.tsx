import { useRef, useState } from "react";
import { Lightbox, type LightboxSlide } from "@/features/beads/images/Lightbox";
import { screenshotUrl, type LatestRun as Run, type RunReason } from "./api";

const REASONS: Record<RunReason, string> = {
  no_run: "No run recorded",
  not_on_host: "Run folder is not on this host",
  invalid: "Run files cannot be read",
};

/** REQ-QA-011: the latest run of a case, its steps and their screenshots. */
export function LatestRun({ project, caseId, run, reason }: { project: string; caseId: string; run: Run | null; reason: RunReason | null }) {
  const [current, setCurrent] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const slides: LightboxSlide[] = (run?.steps ?? [])
    .filter((step) => step.screenshot)
    .map((step) => ({ key: step.n, src: screenshotUrl(project, caseId, step.n), caption: `${step.n}. ${step.title}` }));
  const close = () => {
    setCurrent(null);
    opener.current?.focus();
  };
  return (
    <section aria-labelledby="latest-run" className="flex min-w-0 flex-col gap-2">
      <h2 id="latest-run" className="text-base font-semibold">
        Latest run
      </h2>
      {run === null ? (
        <p>{REASONS[reason ?? "no_run"]}</p>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Folder</dt>
            <dd className="min-w-0 break-words font-mono">{run.folder}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd>{run.started ?? "unknown"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{run.status ?? "unknown"}</dd>
            {run.error !== null && (
              <>
                <dt className="text-muted-foreground">Error</dt>
                <dd className="min-w-0 break-words">{run.error}</dd>
              </>
            )}
          </dl>
          <ol aria-label="Run steps" className="flex flex-col divide-y rounded border">
            {run.steps.map((step) => (
              <li key={step.n} className="flex min-w-0 flex-col gap-1 p-3 text-sm">
                <span>
                  <span className="font-medium">{`${step.n}. ${step.title}`}</span> <span className="text-muted-foreground">{step.status}</span>
                </span>
                {step.error !== null && <span className="break-words text-state-blocked">{step.error}</span>}
                {step.screenshot && (
                  <button
                    type="button"
                    aria-label={`Open screenshot of step ${step.n}`}
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setCurrent(step.n);
                    }}
                    className="w-fit cursor-pointer rounded border focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <img src={screenshotUrl(project, caseId, step.n)} alt="" className="max-h-32 max-w-full object-contain" />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <Lightbox slides={slides} current={current} onChange={setCurrent} onClose={close} />
        </>
      )}
    </section>
  );
}
