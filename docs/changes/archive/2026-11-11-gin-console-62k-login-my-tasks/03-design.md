# Design: Login my tasks

Epic: gin-console-62k

## Architecture

Frontend only; the backend, its API and its tests do not change.

- `frontend/src/app/identity.ts`: `getEmail()`, `setEmail(email)`, `clearEmail()` over localStorage key `gin-console.email`, with an in-memory fallback when storage throws (the same approach as the sidebar choice of REQ-UI-094), `isEmail(value)` and a `useEmail()` hook that re-renders on change. Pure, no network.
- `frontend/src/app/LoginPage.tsx`: email field and "Continue"; calls `setEmail` on a valid value.
- `frontend/src/app/App.tsx`: when `useEmail()` is null, render `LoginPage` instead of `Layout` and routes (REQ-UI-097); add the `/my-tasks` route.
- `frontend/src/app/Layout.tsx`: add `{ to: "/my-tasks", label: "My Tasks", icon: UserCheck }` after "Beads" in `NAV` (REQ-UI-099); show the email and a "Log out" control in the sidebar footer (REQ-UI-098), first letter only on the icon rail.
- `frontend/src/features/my-tasks/`:
  - `match.ts`: `isMine(bead, email)`; trims and lower-cases `assignee`, compares with the email and its local part; ignores `owner`.
  - `load.ts`: `loadMyTasks(email, closed)` calls `fetchProjects()` and `fetchBeads(project, closed)` (existing, `features/beads/api.ts`) for each existing project with `Promise.allSettled`, returns `{ rows, failures }` with rows sorted per REQ-UI-100.
  - `MyTasksPage.tsx`: "Show closed" kept as `?closed=1` (REQ-UI-101), count, empty message, per-project errors (REQ-UI-102), rows linking to `/beads/<project>/<id>`; reuses `StateMark` and `TypeBadge` from `features/beads`; reloads on the Refresh signal like the other pages (REQ-UI-096).
- `README.md`: a "Listening on all interfaces" section (no REQ, see below).

## Data Flow

- Login and log out: `docs/specs/ui/diagrams/login-activity.md`.
- My Tasks: `docs/specs/ui/diagrams/my-tasks-activity.md`.

The browser sends one `GET /api/projects` and one `GET /api/beads?project=<name>[&closed=1]` per existing project; the bead export cache of REQ-BEADS-012 keeps these cheap. The email never leaves the browser.

## Error Handling

- Storage read or write throws: keep the email in memory for the visit, no error shown.
- Projects request fails: one destructive alert, empty list.
- A project's beads request fails: one alert per failed project with its message; other projects still listed.
- A bead with a null or blank assignee is never mine.

## README: non-loopback bind

The loopback guard (REQ-SERVER-001, REQ-DOCKER-005, REQ-DOCKER-007) stays. README gains "Listening on all interfaces" with:
- the two variables `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1` (or `server.host: 0.0.0.0` in the config plus the second variable);
- Linux/macOS shell, a systemd `Environment=` drop-in, Docker (`environment:` and the `ports:` publish address);
- Windows PowerShell for the session (`$env:...`), persistent (`[Environment]::SetEnvironmentVariable(..., "User")` or `setx`, then a new terminal), and cmd (`set`);
- a warning that the API has no authentication and the email login is not one, so the port must be reachable only from trusted networks (firewall).

## Testing

Vitest, each test naming its REQ:
- `identity.test.ts` (REQ-UI-097): store, read, lower-case, invalid values, storage throwing.
- `LoginPage.test.tsx` and `App.test.tsx` (REQ-UI-097, REQ-UI-098): gate at any URL, sign-in keeps the URL, log out shows the login screen.
- `Layout.test.tsx` (REQ-UI-098, REQ-UI-099): email and "Log out" shown, "My Tasks" link and current state.
- `match.test.ts` (REQ-UI-100): email, local part, case, whitespace, null, owner ignored.
- `MyTasksPage.test.tsx` (REQ-UI-100 to REQ-UI-102): cross-project order, count, empty, missing directory skipped, show closed and URL, one project failing, projects failing.

Then typecheck, lint and build; the README is reviewed by reading.

## Open Technical Questions
