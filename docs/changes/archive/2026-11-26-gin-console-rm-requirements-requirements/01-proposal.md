# Requirements and traceability

Epic: gin-console-rm-requirements
Kind: capability
Points: 13 (5 stories, 19 new and 8 changed REQs, 1 new page with 3 sections and a change page, 6 endpoints, file serving with isolation; high: two gin contracts and project files)
Date: 2026-11-25

## Why

A BA cannot see in one place every requirement, who signed it off, the work that builds it and the tests that prove it. The data exists: `gin specs trace --all --format json` (gin 3.5.3, capability `req-signoff-trace`, shipped) joins all of it. On 2026-11-25 it returned 304 requirements of gin-console (250 living, 54 removed) in about 2 seconds.

Confirmed understanding: the epic shows the requirements catalog, the matrix, sign-off, confirmed mockups and change folders, and edits nothing. The navigation shell it depends on shipped.

User decisions 2026-11-25:
- **Trace:** use `gin specs trace --all` from the start and take over epic gin-console-rm-req-signoff (sign-off per requirement, trace of archived changes).
- **Covered:** at least one case, and every case passed. Test files alone do not cover.
- **Mockups:** interactive in the console, isolated by a sandbox.
- **Layout:** one Requirements page with the sections Matrix, Changes and Mockups.

Comments considered: 1, latest 2026-11-21T16:00:27Z

## What Changes

- **Requirements page:** a sixth navigation link with three sections in the sidebar.
- **Matrix:** every requirement with its status, reasons, sign-off, beads and cases; filters in the URL; a details panel with scenarios.
- **Changes:** open and archived changes with sign-off, and a read-only page per change.
- **Mockups:** confirmed asset folders, shown in an isolated frame.
- **API:** six read-only endpoints under `/api/requirements`.

## User Stories

### US-1: See what is covered
As a BA, I want every requirement with its status and the reason, so that I know what is not proven yet.
REQ: REQ-REQUIREMENTS-001, REQ-REQUIREMENTS-002, REQ-REQUIREMENTS-005, REQ-REQUIREMENTS-006, REQ-REQUIREMENTS-012, REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-014, REQ-REQUIREMENTS-019, REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-123, REQ-UI-124, REQ-UI-126

Acceptance criteria:
- The matrix of gin-console lists 250 living requirements, and the numbers per status add up to 250.
- An untested requirement says whether it has no case, a case not run or an outdated case.

### US-2: Trace one requirement
As a BA, I want the scenarios, beads, cases and tests of one requirement, so that I can follow it from text to proof.
REQ: REQ-REQUIREMENTS-004, REQ-REQUIREMENTS-015, REQ-UI-072, REQ-UI-073

Acceptance criteria:
- A shared link with `req=<id>` opens its details.
- A bead opened from the details leads back to the same matrix.

### US-3: See who signed off
As a BA, I want the sign-off of each requirement and change, so that I know what was agreed and what changed since.
REQ: REQ-REQUIREMENTS-003, REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-016

Acceptance criteria:
- A requirement changed after its sign-off reads "Changed".

### US-4: Read a change
As a BA, I want to read the proposal, spec delta, design, plan and tests of a change, so that I do not need a checkout.
REQ: REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-010, REQ-REQUIREMENTS-017

Acceptance criteria:
- Archived changes with the older file names can be read too.

### US-5: Open a confirmed mockup
As a BA, I want to use a confirmed mockup in the console, so that I can compare it with its requirements.
REQ: REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-018

Acceptance criteria:
- A mockup is interactive and cannot call the console API.

## Capabilities Affected

- `requirements` (new):
  - ADDED: REQ-REQUIREMENTS-001, REQ-REQUIREMENTS-002, REQ-REQUIREMENTS-003, REQ-REQUIREMENTS-004, REQ-REQUIREMENTS-005, REQ-REQUIREMENTS-006, REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-010, REQ-REQUIREMENTS-011, REQ-REQUIREMENTS-012, REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-014, REQ-REQUIREMENTS-015, REQ-REQUIREMENTS-016, REQ-REQUIREMENTS-017, REQ-REQUIREMENTS-018, REQ-REQUIREMENTS-019.
  - Diagrams: `docs/specs/requirements/diagrams/matrix-activity.md`, `docs/specs/requirements/diagrams/changes-activity.md`, `docs/specs/requirements/diagrams/mockups-activity.md`.
  - Use cases: `docs/specs/requirements/use-cases/trace-a-requirement.md`, `docs/specs/requirements/use-cases/read-a-change.md`, `docs/specs/requirements/use-cases/open-a-mockup.md`.
- `ui`:
  - MODIFIED: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-123, REQ-UI-124, REQ-UI-126.
- Assets: none.

## Assumptions

- **Short label:** "Requirements" does not fit the 80px rail or a six-link phone bar, so the link reads "REQs" there.
- **Mockup limits:** a mockup that needs module scripts, `fetch` or browser storage may not work in the sandbox.
- **Sandbox headers:** `sandbox` alone still lets a script send a blind POST to `/api/refresh`, so `connect-src 'none'` is added.
- **Beads unknown:** with null beads (qwikfone on 2026-11-25) an open bead cannot make a requirement "building"; the warning says why.
- **Sign-off of a change:** it comes from the requirements of the trace; a change without requirements reads "Unknown".

## Non-goals

- Editing specs, signing off, running tests.
- Evidence images (gin-console-rm-evidence-images) and the readiness checklist (gin-console-rm-test-coverage).
- Repairing the `bd` migration of qwikfone.
- Specs of projects with the legacy layout, and custom `artifacts.specs` or `artifacts.changes` paths.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-requirements --against master` prints `ok`, and `gin specs trace --change gin-console-rm-requirements` lists no missing REQ.
- TC-1 passes on the Tailscale build.
- Epic gin-console-rm-req-signoff is closed as merged into this one, and the roadmap says so.
