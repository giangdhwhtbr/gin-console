import { Popover } from "@base-ui/react/popover";
import { ChevronsUpDown, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveProject, rememberProject, setFavorite, switchProject, useConfiguredProjects, useFavorite } from "./project";
import { navigate, useLocation } from "./route";

export type SwitcherVariant = "sidebar" | "rail" | "bar";

const TRIGGER = "flex items-center rounded-lg text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring cursor-pointer";

/** Names the current project and lists the others; the favorite comes first. */
export function ProjectSwitcher({ variant }: { variant: SwitcherVariant }) {
  const { pathname, search } = useLocation();
  const projects = useConfiguredProjects();
  const favorite = useFavorite();
  const [open, setOpen] = useState(false);
  const names = projects.status === "ok" ? projects.names : [];
  const current = resolveProject(new URLSearchParams(search).get("project") ?? "", names);
  const ordered = favorite !== null && names.includes(favorite) ? [favorite, ...names.filter((name) => name !== favorite)] : names;
  const choose = (name: string) => {
    rememberProject(name);
    navigate(switchProject(pathname, search, name));
    setOpen(false);
  };
  const label = current === "" ? "No project" : current;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={names.length === 0}
        aria-label={variant === "rail" ? `Project: ${label}` : undefined}
        title={variant === "rail" ? `Project: ${label}` : undefined}
        className={cn(
          TRIGGER,
          variant === "rail" && "size-10 justify-center bg-muted font-semibold",
          variant === "sidebar" && "w-full justify-between gap-2 px-3 py-2",
          variant === "bar" && "min-w-0 shrink gap-1.5 px-2 py-1.5",
        )}
      >
        {variant === "rail" ? (
          <span aria-hidden>{label[0]?.toUpperCase()}</span>
        ) : (
          <>
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate" title={label}>{label}</span>
              {variant === "sidebar" && <span className="text-xs font-normal text-muted-foreground">{names.length} projects</span>}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-60" />
          </>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} className="z-50">
          <Popover.Popup className="min-w-52 max-w-72 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none">
            <ul aria-label="Projects" className="max-h-72 overflow-y-auto">
              {ordered.map((name) => {
                const starred = name === favorite;
                return (
                  <li key={name} className="flex items-center rounded hover:bg-muted">
                    <button
                      type="button"
                      onClick={() => choose(name)}
                      aria-current={name === current ? "true" : undefined}
                      className="min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring aria-[current=true]:font-semibold"
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      aria-pressed={starred}
                      aria-label={starred ? `Remove ${name} as favorite` : `Make ${name} the favorite`}
                      onClick={() => setFavorite(starred ? null : name)}
                      className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Star aria-hidden className={cn("size-4", starred && "fill-current text-foreground")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
