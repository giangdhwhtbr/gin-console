# Login my tasks

Epic: gin-console-62k
Date: 2026-11-10

## Why

The console does not know who is looking at it, so a user who wants the beads assigned to them must open the Beads page project by project and filter by assignee each time. A light identity (an email kept in the browser) lets the console show one "My Tasks" list across every project. Separately, users who run the console without `tailscale serve` (notably on native Windows) do not know how to bind a non-loopback address past the loopback guard of REQ-SERVER-001.

## What Changes

- A login screen asking only for an email gates the whole frontend; the email is kept in the browser's localStorage. It is an identity, not authentication: the API stays as it is.
- The sidebar shows the email and a "Log out" control.
- A new "My Tasks" navigation entry at `/my-tasks` lists, across every configured project, the beads whose assignee is the email or the part of the email before `@`, closed beads hidden by default.
- The README gains a section on setting `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`, with Windows (PowerShell, cmd, persistent) instructions and a warning that the API has no authentication. The guard itself is unchanged.
- Frontend only: no backend change; My Tasks uses the existing `GET /api/projects` and `GET /api/beads`.

## User Stories

### US-1: Sign in with an email
As a console user, I want to enter my email once, so that the console knows which beads are mine.
REQ: REQ-UI-097, REQ-UI-098

Acceptance criteria:
- Without a stored email, every URL shows the login screen instead of the app.
- A valid email opens the URL that was requested, and a reload does not ask again.
- An invalid email is refused with a message.
- "Log out" in the sidebar forgets the email and shows the login screen.

### US-2: See my tasks across projects
As a console user, I want one list of the beads assigned to me in every project, so that I do not filter project by project.
REQ: REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-102

Acceptance criteria:
- "My Tasks" in the navigation opens `/my-tasks`.
- The list holds the beads whose assignee is my email or its part before `@`, ignoring case, from every project, with the project shown on each row.
- Closed beads are hidden until I turn on "Show closed"; the choice is kept in the URL.
- A project that fails to load shows its own error while the others still list their beads.

### US-3: Bind on all interfaces when I choose to
As an operator running the console without `tailscale serve`, I want README steps to bind `0.0.0.0`, so that I can reach it from another machine knowing the risk.
REQ: none (documentation only; the behavior is REQ-SERVER-001 and REQ-DOCKER-007, unchanged)

Acceptance criteria:
- README shows the two environment variables for Linux/macOS, systemd, Docker, Windows PowerShell (session and persistent) and Windows cmd.
- README warns that the API has no authentication and the email login is not one.

## Capabilities Affected

- `ui`: REQ-UI-097, REQ-UI-098 (login and log out); REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-102 (My Tasks).
  - Diagrams: `docs/specs/ui/diagrams/login-activity.md`, `docs/specs/ui/diagrams/my-tasks-activity.md`.
  - Assets: none.

## Non-goals

- Real authentication, passwords, sessions, or any server-side identity.
- Restricting the API or the other pages by user.
- Matching `owner` (it is the bead's creator), or a separate git username field.
- Changing the loopback guard, the default `server.host`, or the compose port binding.
- Filters, search, or hierarchy on My Tasks beyond "Show closed".

## Success Criteria

- REQ-UI-097 to REQ-UI-102 each have a vitest test naming the REQ.
- `pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend test --run && pnpm -C frontend build` pass; backend tests are unchanged.
- On the deployed console, logging in as `giangdhwhtbr@gmail.com` lists the beads assigned to `giangdhwhtbr` in gin-console and gin-workflow.
