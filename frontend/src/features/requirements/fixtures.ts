import type { Requirement, RequirementList, Signoff } from "./api";

export const signoff = (fields: Partial<Signoff> = {}): Signoff => ({ state: "none", actor: null, at: null, change: null, evidence: null, source: null, ...fields });

export const requirement = (fields: Partial<Requirement> = {}): Requirement => ({
  id: "REQ-UI-001",
  title: "A title",
  capability: "ui",
  state: "living",
  status: "covered",
  reasons: [],
  signoff: signoff(),
  changes: [],
  beads: [],
  cases: [],
  tests: [],
  ...fields,
});

export const listOf = (...requirements: Requirement[]): RequirementList => ({ layout: "sdd", requirements, warnings: [], skipped: [] });

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
