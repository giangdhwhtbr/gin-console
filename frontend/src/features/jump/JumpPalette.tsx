import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import { navigate } from "@/app/route";
import { StateMark } from "@/features/beads/StateMark";
import { loadAllBeads, type Loaded } from "./load";
import { searchBeads, type Entry } from "./search";

type Load = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; loaded: Loaded } | { kind: "failed" };

/** REQ-UI-154: Ctrl+K or Cmd+K opens a search over the beads of every project. */
export function JumpPalette() {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ kind: "idle" });
  const [text, setText] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setText("");
      setSelected(0);
      setOpen(true);
      if (load.kind !== "idle" && load.kind !== "failed") return;
      setLoad({ kind: "loading" });
      loadAllBeads().then(
        (loaded) => setLoad({ kind: "ready", loaded }),
        () => setLoad({ kind: "failed" }),
      );
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [load.kind]);

  const results = load.kind === "ready" ? searchBeads(load.loaded.entries, text) : [];
  const current = Math.min(selected, Math.max(results.length - 1, 0));

  const jump = (entry: Entry) => {
    setOpen(false);
    navigate(`/beads/${encodeURIComponent(entry.project)}/${encodeURIComponent(entry.bead.id)}`);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      if (results.length > 0) setSelected((current + step + results.length) % results.length);
    } else if (event.key === "Enter" && results.length > 0) {
      event.preventDefault();
      jump(results[current]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup
          initialFocus={inputRef}
          className="fixed left-1/2 top-24 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border bg-background p-4 shadow-xl outline-none"
        >
          <Dialog.Title className="mb-2 text-base font-semibold">Jump to a bead</Dialog.Title>
          <input
            ref={inputRef}
            type="text"
            aria-label="Search beads"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSelected(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Id or title"
            className="h-9 w-full rounded border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <div className="mt-3 text-sm" aria-live="polite">
            {load.kind === "loading" && <p className="text-muted-foreground">Loading beads…</p>}
            {load.kind === "failed" && <p role="alert">Could not load projects</p>}
            {load.kind === "ready" &&
              load.loaded.failures.map((project) => (
                <p key={project} role="alert">
                  Could not load {project}
                </p>
              ))}
            {load.kind === "ready" && text.trim() === "" && <p className="text-muted-foreground">Type an id or a title</p>}
            {load.kind === "ready" && text.trim() !== "" && results.length === 0 && (
              <p className="text-muted-foreground">No beads match</p>
            )}
          </div>
          {results.length > 0 && (
            <ul role="listbox" aria-label="Beads" className="mt-2 max-h-80 overflow-y-auto text-sm">
              {results.map((entry, i) => (
                <li
                  key={`${entry.project}/${entry.bead.id}`}
                  role="option"
                  aria-selected={i === current}
                  onClick={() => jump(entry)}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 aria-selected:bg-muted"
                >
                  <span className="font-mono text-xs">{entry.bead.id}</span>
                  <span className="min-w-0 flex-1 truncate">{entry.bead.title}</span>
                  <StateMark bead={entry.bead} />
                  <span className="text-xs text-muted-foreground">{entry.project}</span>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
