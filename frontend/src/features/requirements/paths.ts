import { getSession } from "@/app/session";

export type Section = "matrix" | "changes" | "mockups";
const enc = encodeURIComponent;
export const sectionHref = (section: Section, project: string, extra: Readonly<Record<string, string>> = {}): string =>
  `/requirements/${section}?${new URLSearchParams({ project, ...extra }).toString()}`;
export const changeHref = (project: string, folder: string): string => `/requirements/changes/${enc(folder)}?project=${enc(project)}`;
/** A signed-in user loads mockup files through their grant, because the sandboxed page sends no cookie (REQ-AUTH-016). */
export const mockupFileHref = (project: string, capability: string, date: string, path: string): string => {
  const session = getSession();
  const grant = session.status === "signed-in" ? session.user.mockup_grant : undefined;
  return `/api/requirements/mockups/${enc(project)}/${grant === undefined ? "" : `g/${enc(grant)}/`}files/${enc(capability)}/${enc(date)}/${path.split("/").map(enc).join("/")}`;
};
