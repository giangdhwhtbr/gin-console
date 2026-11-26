import { useCallback, useEffect } from "react";
import { Link } from "@/app/Link";
import { NotFoundPage } from "@/app/NotFoundPage";
import { rememberOrigin } from "@/app/origin";
import { isUnknownProject, rememberProject, resolveProject, useConfiguredProjects } from "@/app/project";
import { navigate, useLocation, useRestoreOnBack } from "@/app/route";
import { UnknownProject } from "@/app/UnknownProject";
import { usePageTitle } from "@/app/usePageTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabStrip } from "@/features/reports/TabStrip";
import { cn } from "@/lib/utils";
import { fetchChanges, fetchMockups, fetchRequirements } from "./api";
import { ChangePage } from "./ChangePage";
import { ChangesSection } from "./ChangesSection";
import { MatrixSection } from "./MatrixSection";
import { MockupsSection } from "./MockupsSection";
import { sectionHref, type Section } from "./paths";
import { clearSections, publishSections, type SectionLink } from "./sectionStore";
import { useFetched } from "./useFetched";

const ROOT = "/requirements";
const SECTIONS: readonly Section[] = ["matrix", "changes", "mockups"];
const SECTION_LABELS: Record<Section, string> = { matrix: "Matrix", changes: "Changes", mockups: "Mockups" };

/** A section, or a change (`folder`), which belongs to the Changes section. */
type Shown = { section: Section; folder: string | null };

/** What a path under `/requirements` names; `null` when it names nothing (REQ-UI-125). */
function shownAt(pathname: string): Shown | "index" | null {
  if (pathname === ROOT || pathname === `${ROOT}/`) return "index";
  const section = SECTIONS.find((s) => pathname === `${ROOT}/${s}`);
  if (section !== undefined) return { section, folder: null };
  const match = /^\/requirements\/changes\/([^/]+)$/.exec(pathname);
  if (match === null) return null;
  try {
    return { section: "changes", folder: decodeURIComponent(match[1]) };
  } catch {
    return null; // an address that does not decode
  }
}

/** REQ-REQUIREMENTS-012: the Requirements page; `/requirements` is replaced by the Matrix section, keeping the query. */
export function RequirementsPage() {
  const { pathname, search } = useLocation();
  const shown = shownAt(pathname);
  const index = shown === "index";
  useEffect(() => {
    if (index) navigate(`${ROOT}/matrix${search}`, { replace: true });
  }, [index, search]);
  if (shown === "index") return null;
  if (shown === null) return <NotFoundPage path={pathname} />;
  return <ProjectRequirements shown={shown} pathname={pathname} search={search} />;
}

function ProjectRequirements({ shown, pathname, search }: { shown: Shown; pathname: string; search: string }) {
  const projects = useConfiguredProjects();
  const asked = new URLSearchParams(search).get("project") ?? "";
  const names = projects.status === "ok" ? projects.names : [];
  const unknown = projects.status === "ok" && isUnknownProject(asked, names);
  const selected = projects.status === "ok" && !unknown ? resolveProject(asked, names) : "";

  usePageTitle(projects.status === "loading" ? null : (shown.folder ?? `Requirements · ${SECTION_LABELS[shown.section]}`), selected);

  useEffect(() => {
    if (selected === "") return;
    rememberProject(selected); // REQ-UI-124
    if (asked === selected) {
      rememberOrigin("requirements", pathname, search, selected); // REQ-UI-073
      return;
    }
    if (window.location.pathname !== pathname) return; // the user moved on
    const params = new URLSearchParams(search);
    params.set("project", selected);
    navigate(`${pathname}?${params.toString()}`, { replace: true });
  }, [selected, asked, pathname, search]);

  if (projects.status === "loading") return <p className="text-muted-foreground">Loading projects…</p>;
  if (projects.status === "error")
    return (
      <Alert variant="destructive">
        <AlertTitle>Projects could not be loaded</AlertTitle>
        <AlertDescription>{projects.message}</AlertDescription>
      </Alert>
    );
  if (unknown) return <UnknownProject name={asked} names={names} hrefOf={(name) => `${pathname}?project=${encodeURIComponent(name)}`} />;
  if (selected === "") return <p className="text-muted-foreground">No projects configured.</p>;
  return <RequirementsView key={selected} project={selected} shown={shown} />;
}

/** The three requests are independent: one that is pending or failed leaves its own number and section out only. */
function RequirementsView({ project, shown: { section, folder } }: { project: string; shown: Shown }) {
  const list = useFetched(useCallback(() => fetchRequirements(project), [project]));
  const changes = useFetched(useCallback(() => fetchChanges(project), [project]));
  const mockups = useFetched(useCallback(() => fetchMockups(project), [project]));
  useRestoreOnBack(section === "matrix" && list.state.status === "ok");

  const counts: Record<Section, number | null> = {
    matrix: list.state.status === "ok" ? list.state.data.requirements.filter((r) => r.state !== "removed" && r.status !== "covered").length : null,
    changes: changes.state.status === "ok" ? changes.state.data.changes.filter((c) => c.archived === null).length : null,
    mockups: mockups.state.status === "ok" ? mockups.state.data.mockups.length : null,
  };
  const links: SectionLink[] = SECTIONS.map((value) => ({ section: value, label: SECTION_LABELS[value], count: counts[value], href: sectionHref(value, project) }));
  // the sidebar lists these sections while it is expanded; the store ignores a publish that changes nothing
  useEffect(() => publishSections(links, section));
  useEffect(() => clearSections, []);

  const legacy = list.state.status === "loading" ? null : list.state.status === "ok" && list.state.data.layout === "legacy";
  const row = changes.state.status === "ok" ? (changes.state.data.changes.find((c) => c.folder === folder) ?? null) : null;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {folder === null && <h1 className="text-2xl font-semibold">Requirements</h1>}
      <div className="lg:group-data-[sidebar=expanded]/shell:hidden">
        <TabStrip>
          <SectionRow links={links} current={section} />
        </TabStrip>
      </div>
      {folder !== null ? (
        <ChangePage project={project} folder={folder} row={row} />
      ) : section === "matrix" ? (
        <MatrixSection project={project} list={list.state} retry={list.retry} />
      ) : section === "changes" ? (
        <ChangesSection project={project} legacy={legacy} list={changes.state} retry={changes.retry} />
      ) : (
        <MockupsSection project={project} legacy={legacy} list={mockups.state} retry={mockups.retry} />
      )}
    </section>
  );
}

const LINK = cn(
  "flex min-h-11 shrink-0 flex-col items-start justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground md:min-h-9",
  "aria-[current=page]:border-identity aria-[current=page]:text-foreground",
);

function SectionRow({ links, current }: { links: readonly SectionLink[]; current: Section }) {
  return (
    <nav aria-label="Requirement sections" className="flex gap-2 overflow-x-auto border-b">
      {links.map((link) => (
        <Link key={link.section} to={link.href} aria-current={link.section === current ? "page" : undefined} className={LINK}>
          <span>{link.label}</span>
          {link.count !== null && " "}
          {link.count !== null && <span className="text-xs font-normal">{link.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
