import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

const FORMATS = [
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "csv", label: "CSV for Jira (.csv)" },
  { format: "md", label: "Markdown (.md)" },
] as const;

/** REQ-MILESTONE-UI-032: download the WBS of the project, or of one milestone, as Excel, CSV, or Markdown. */
export function ExportWbsMenu({ project, milestone }: { project: string; milestone?: string }) {
  const hrefOf = (format: string) =>
    `/api/milestones/${encodeURIComponent(project)}/wbs?${milestone === undefined ? "" : `milestone=${encodeURIComponent(milestone)}&`}format=${format}`;
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2 text-13 font-medium hover:bg-muted/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <span>Export WBS</span>
        <ChevronDown aria-hidden className="size-3.5 opacity-60" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-50">
          <Menu.Popup className="flex min-w-48 flex-col rounded-md border bg-popover p-1 text-13 text-popover-foreground shadow-md outline-none">
            {FORMATS.map(({ format, label }) => (
              <Menu.LinkItem key={format} href={hrefOf(format)} download className="cursor-default rounded px-2 py-1.5 outline-none data-[highlighted]:bg-muted">
                {label}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
