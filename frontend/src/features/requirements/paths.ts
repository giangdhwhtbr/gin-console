export type Section = "matrix" | "changes" | "mockups";
const enc = encodeURIComponent;
export const sectionHref = (section: Section, project: string, extra: Readonly<Record<string, string>> = {}): string =>
  `/requirements/${section}?${new URLSearchParams({ project, ...extra }).toString()}`;
export const changeHref = (project: string, folder: string): string => `/requirements/changes/${enc(folder)}?project=${enc(project)}`;
/** A mockup with a grant loads its files through it, because the sandboxed page sends no cookie (REQ-AUTH-016). */
export const mockupFileHref = (project: string, capability: string, date: string, path: string, grant: string | null): string =>
  `/api/requirements/mockups/${enc(project)}/${grant === null ? "" : `g/${enc(grant)}/`}files/${enc(capability)}/${enc(date)}/${path.split("/").map(enc).join("/")}`;
