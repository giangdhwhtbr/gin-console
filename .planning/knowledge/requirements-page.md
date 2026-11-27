# Requirements page: trace, change folders and isolated mockups

**Context**
Epic gin-console-rm-requirements (2026-11-26) added `/requirements` with the sections Matrix, Changes and Mockups. gin-workflow had already shipped `gin specs trace --all` (capability req-signoff-trace), so the console reads the join of requirements, sign-off, beads, cases and tests from gin and took over epic gin-console-rm-req-signoff.

**Decision/Solution**
- **Sources:** `backend/src/gin_console/requirements/source.py` runs `gin specs trace --all --format json` (schema 1) and `gin specs reqs --format json`, 30 s timeout, one `KeyedCache` per command (60 s, cleared on refresh). The requirements context starts neither `bd` nor `gin-qa`; gin does. Since gin-console-rm-test-coverage the `qa` context runs `gin-qa cases export` itself, for the case fields the trace leaves out (see [test-coverage](test-coverage.md)). Old gin (argparse exit 2) maps to cause `outdated`.
- **Status:** `service.py` `status_of`: failing, building, unknown (null cases), covered (at least one case and all passed), else untested with reasons. Test files never change the status; null beads never block covered.
- **Project files:** `files.py` is the only reader (ADR 0004).
  - Path containment: every part below the resolved project root must be a real directory, not a link, before a file is resolved inside it. Resolving the base first lets a linked `docs`, `assets` or date folder escape, and lets a linked date stand in for an unconfirmed folder.
  - `..`, empty parts, backslash, `:` and NUL are refused before any disk access (UNC paths on Windows would contact a host).
  - Files are capped at 20 MB, read with `utf-8-sig`; a mockup is sent as a plain `Response` so every answer, including a bad Range, carries the CSP and nosniff headers.
  - `Confirmed:` is read with a linear regex; `^Confirmed:[ \t]*(.*?)[ \t]*$` is quadratic on one long line and stalls the whole console.
  - Living `spec.md` files are read only for their `Source:` lines (REQ-REQUIREMENTS-009, 010).
- **Isolation:** CSP `sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'` and an iframe with `sandbox="allow-scripts"` only (`MockupFrame.tsx`).
- **Frontend:** `features/requirements/`; `useFetched` drops an answer of an older fetcher; `sectionStore.ts` mirrors the Reports store for the sidebar; the nav link reads "REQs" with the accessible name "REQs (Requirements)" below the wide sidebar.

**Consequences**
- **Cross-site guard:** since epic gin-console-5ge (2026-11-26) `app.py` refuses `/api` requests with `Sec-Fetch-Site` `cross-site` or `same-site` (403), except GETs under `/api/requirements/mockups/<project>/files/`, so a mockup's `<img>`, `<script src>` or `<link>` and pages of other origins reach no endpoint. The check reads the route path, `scope["path"]` without `scope["root_path"]` (`route_path`): `request.url.path` is cut at a decoded `?` or `#`, and `scope["path"]` keeps a proxy's root path. Requests without the header (curl, tests, old browsers) pass.
- **Known gaps:** web fonts, module scripts, fetch and storage may not work in a mockup. `KeyedCache.clear()` does not cancel a fetch already running, which can store a pre-refresh answer.
- **Testing:** run `ruff format` only on touched files; several backend files are not ruff-formatted. A hook like `useFetched` needs a test that a new fetcher shows loading, or the fetcher-identity guard survives mutation. A page title with ` · ` must be added to `TITLE_FILES` in `frontend/src/app/style-guard.test.ts`. Put the space between a visible and an sr-only label in the parent text, or the computed name loses it. Nav text matchers need `{ useInnerText: true }`.
- **E2E:** TC-REQUIREMENTS-037 starts its own console on a free port with a temporary project (`qa/e2e/support/mockup-server.ts`) and counts requests in the server log; see [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md) for port 8701.
- **Bead state:** the trace gives a bead only `id`, `title`, `status`, so an open bead reads "Open", never "Ready".

**References**
- `docs/changes/gin-console-rm-requirements-requirements/`, `docs/adr/0004-serve-project-files.md`
- Beads gin-console-rm-requirements, .1 to .7; gin-workflow-ch2v

**Scope**
gin-console backend `requirements/` and frontend `features/requirements/`, and any later epic that serves project files.
