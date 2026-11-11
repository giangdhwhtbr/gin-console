# Plan: Email login, My Tasks, and the non-loopback README guide

Epic: gin-console-62k
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagrams: `docs/specs/ui/diagrams/login-activity.md`, `docs/specs/ui/diagrams/my-tasks-activity.md`.

## Objective
- **Login:** without a stored email, every URL shows a login screen asking only for an email; the email is kept lower-cased in localStorage `gin-console.email`; the sidebar shows it with "Log out".
- **My Tasks:** a "My Tasks" link after "Beads" opens `/my-tasks`, one list across every project of the beads whose assignee is the email or its part before `@`, closed beads hidden unless "Show closed" (`?closed=1`).
- **README:** a "Listening on all interfaces" section for Linux/macOS, systemd, Docker and Windows, with the no-authentication warning.

Every scenario of REQ-UI-097 to REQ-UI-102 has a test naming its REQ. TC-1 in `05-tests.md` passes on the Tailscale deploy.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:** the console does not know who is looking at it, so finding one's own beads means opening the Beads page project by project and filtering by assignee. Operators without `tailscale serve`, notably on native Windows, do not know how to pass the loopback guard.
- **Success criteria:**
  - Everything in the Objective.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass; the backend is untouched and its suite still passes.
  - `gin specs lint --change gin-console-62k` prints `ok`; `gin specs trace --change gin-console-62k` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - Frontend only: no backend change, no new endpoint. My Tasks uses `GET /api/projects` and `GET /api/beads?project=<name>[&closed=1]`.
  - The email is an identity, not authentication. It never leaves the browser; the API stays open as it is.
  - A bead is mine when its `assignee`, trimmed and ignoring case, equals the email or the part before `@`. `owner` is never matched.
  - If localStorage throws, the email is kept in memory for the visit, without an error.
  - The loopback guard (REQ-SERVER-001, REQ-DOCKER-005, REQ-DOCKER-007), the default `server.host` and the compose port binding stay unchanged.
  - New and changed tests carry their REQ-ID in the test name or a comment.
  - Linux, macOS and Windows paths are untouched.
- **Non-goals:**
  - Real authentication, passwords, server-side identity, per-user API restriction.
  - A git username field, matching `owner`.
  - Search, filters or hierarchy on My Tasks beyond "Show closed".

## Approach Options
### Option 1: frontend only, one beads request per project
- **Summary:** an `identity` store over localStorage gates `App`; My Tasks calls `fetchProjects()` and the existing `fetchBeads(project, closed)` per existing project with `Promise.allSettled`, and filters with `isMine`.
- **Pros:** no server load or code; reuses the REQ-BEADS-012 export cache; per-project failures fall out of `allSettled`.
- **Cons:** one request per project.

### Option 2: a `GET /api/my-beads?assignee=` endpoint
- **Summary:** the server gathers every project's beads and filters them.
- **Pros:** one request.
- **Cons:** new model, router and tests; the user asked to keep the server out of it.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** confirmed in discuss on 2026-11-10 ("frontend thôi tránh tăng gánh nặng cho server"); the number of projects is small.

## Scope
- **In scope:**
  - `frontend/src/app/{identity.ts,LoginPage.tsx,App.tsx,Layout.tsx}` and their tests.
  - `frontend/src/features/my-tasks/{match.ts,load.ts,MyTasksPage.tsx}` and their tests.
  - `frontend/src/app/App.test.tsx`, `frontend/src/features/beads/ReturnFlow.test.tsx` (sign in before rendering `App`).
  - `README.md`.
  - `docs/changes/gin-console-62k-login-my-tasks/05-tests.md` (TC-1 result).
- **Out of scope:** everything under `backend/`, `config.example.yaml`, `docker-compose*.yml`, `deploy/`.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 3 (README.md) shares no file with Tracks 1 and 2 and runs beside them; Track 2 edits App.tsx and Layout.tsx after Track 1 and consumes its useEmail, so it waits for Track 1; Track 4 is the human check after all three merge.
```

## Tasks

### Track 1: Email login and log out
- **Dependencies**: none
- **Requirements**: REQ-UI-097, REQ-UI-098
- **Files**:
  - Create `frontend/src/app/identity.ts`
  - Create `frontend/src/app/LoginPage.tsx`
  - Modify `frontend/src/app/App.tsx:56-96` (gate on `useEmail()`)
  - Modify `frontend/src/app/Layout.tsx:1-121` (email and "Log out" in the sidebar; "Log out" icon in the mobile header)
  - Test `frontend/src/app/identity.test.ts`
  - Test `frontend/src/app/LoginPage.test.tsx`
  - Test `frontend/src/app/Layout.test.tsx`
  - Test `frontend/src/app/App.test.tsx` (sign in in `beforeEach`; gate tests)
  - Test `frontend/src/features/beads/ReturnFlow.test.tsx` (sign in in `beforeEach`)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a small store, one form and a gate with the scenarios written out; the storage-refused fallback follows the existing `theme.ts` pattern.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-097 and REQ-UI-098 has a passing test.
  - Existing `App` and `ReturnFlow` tests pass after signing in in `beforeEach`.
  - `pnpm -C frontend test --run`, `typecheck`, `lint` pass.
- **Estimated complexity**: low

Interfaces produced (Track 2 consumes `useEmail`):
```ts
// frontend/src/app/identity.ts
export const EMAIL_KEY = "gin-console.email";
export function isEmail(value: string): boolean;        // /^[^\s@]+@[^\s@]+$/ on value.trim()
export function getEmail(): string | null;              // memory first, then localStorage (an invalid stored value counts as none)
export function setEmail(value: string): void;          // stores value.trim().toLowerCase(); caller checks isEmail first
export function clearEmail(): void;
export function useEmail(): string | null;              // useSyncExternalStore over the above
export function resetIdentity(): void;                  // tests only: forget the in-memory value
```

Steps:

1. Write `frontend/src/app/identity.test.ts`, each `it` named with its REQ:
   - `REQ-UI-097 isEmail accepts a@b and " A@B.c ", refuses "giang", "a@", "@b", "a b@c", "a@b@c"`.
   - `REQ-UI-097 setEmail stores the trimmed lower-cased value under gin-console.email and getEmail returns it` (`setEmail(" Giangdhwhtbr@Gmail.com ")` → `localStorage.getItem("gin-console.email") === "giangdhwhtbr@gmail.com"`).
   - `REQ-UI-097 a stored email is read after resetIdentity` (write localStorage directly, `resetIdentity()`, `getEmail()`).
   - `REQ-UI-097 storage refused keeps the email for the visit`: `vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); })`, `setEmail("a@b.c")` does not throw and `getEmail() === "a@b.c"`; same with `getItem` throwing and `getEmail()` returning `null` before any set.
   - `REQ-UI-098 clearEmail removes the key and getEmail returns null`.
   `afterEach`: `localStorage.clear(); resetIdentity(); vi.restoreAllMocks();`.
2. Run `pnpm -C frontend test --run src/app/identity.test.ts`; expect failure (module not found).
3. Write `identity.ts`:
   ```ts
   import { useSyncExternalStore } from "react";

   export const EMAIL_KEY = "gin-console.email";

   const listeners = new Set<() => void>();
   let memory: string | null | undefined; // undefined: storage not read yet

   export function isEmail(value: string): boolean {
     return /^[^\s@]+@[^\s@]+$/.test(value.trim());
   }

   export function getEmail(): string | null {
     if (memory === undefined) {
       try {
         const stored = window.localStorage.getItem(EMAIL_KEY);
         memory = stored !== null && isEmail(stored) ? stored : null;
       } catch {
         memory = null; // storage refused: nobody is signed in yet
       }
     }
     return memory;
   }

   function notify(): void {
     listeners.forEach((listener) => listener());
   }

   export function setEmail(value: string): void {
     memory = value.trim().toLowerCase();
     try {
       window.localStorage.setItem(EMAIL_KEY, memory);
     } catch {
       // storage refused: the email lasts for this visit only
     }
     notify();
   }

   export function clearEmail(): void {
     memory = null;
     try {
       window.localStorage.removeItem(EMAIL_KEY);
     } catch {
       // storage refused: nothing was kept
     }
     notify();
   }

   export function resetIdentity(): void {
     memory = undefined;
   }

   const subscribe = (listener: () => void) => {
     listeners.add(listener);
     return () => listeners.delete(listener);
   };

   export function useEmail(): string | null {
     return useSyncExternalStore(subscribe, getEmail);
   }
   ```
   Run the test file again; expect pass.
4. Write `frontend/src/app/LoginPage.test.tsx`:
   - `REQ-UI-097 a valid email is stored lower-cased`: render `<LoginPage />`, type ` Giangdhwhtbr@Gmail.com ` into the textbox labelled "Email", click "Continue", expect `getEmail() === "giangdhwhtbr@gmail.com"`.
   - `REQ-UI-097 an invalid email is refused`: type `giang`, click "Continue", expect `screen.getByRole("alert")` to contain "not a valid email" and `getEmail()` null and `localStorage.getItem("gin-console.email")` null.
   Run; expect failure.
5. Write `LoginPage.tsx`: a centred card (`flex min-h-screen items-center justify-center bg-background p-4 text-foreground`) with the `Brand`-like heading "gin-console", a `<form noValidate>` containing `<label htmlFor="login-email">Email</label>`, `<input id="login-email" type="email" autoComplete="email" autoFocus className="h-9 rounded-md border bg-background px-3 text-sm" />`, a `Button` (`@/components/ui/button`) `type="submit"` "Continue", and, after a refused submit, `<p role="alert" className="text-sm text-destructive">That is not a valid email.</p>`. `onSubmit`: `event.preventDefault(); if (isEmail(value)) setEmail(value); else setInvalid(true);`. A note under the form: "Your email stays in this browser. It is not a password." Run the LoginPage test; expect pass.
6. Gate in `App.tsx`: import `useEmail` from `./identity` and `LoginPage` from `./LoginPage`; after the existing hooks (`useLocation`, `useState`) and route parsing, `const email = useEmail(); if (email === null) return <LoginPage />;`. Hooks stay unconditional.
7. In `App.test.tsx` and `ReturnFlow.test.tsx` add to `beforeEach`: `setEmail("tester@example.com");` and to `afterEach`: `localStorage.removeItem(EMAIL_KEY); resetIdentity();`. Add to `App.test.tsx`:
   - `REQ-UI-097 without an email every URL shows the login screen`: `clearEmail()`, `replaceState` to `/beads?project=gin-console`, render `<App />`, expect the "Email" textbox and `screen.queryByRole("navigation", { name: "Main" })` null.
   - `REQ-UI-097 signing in shows the page of the URL`: same start, stub fetch with `json([])`, submit `tester@example.com`, expect `window.location.pathname + window.location.search === "/beads?project=gin-console"` and `await screen.findByRole("heading", { name: "Beads" })`.
   - `REQ-UI-097 a remembered email skips the login screen` (the default `beforeEach` state): render at `/`, expect the "Main" navigation.
   - `REQ-UI-098 Log out shows the login screen and keeps the URL`: at `/beads` (`/my-tasks` arrives in Track 2), stub fetch with `json([])`, click the first "Log out", expect the "Email" textbox, `localStorage.getItem("gin-console.email")` null, pathname `/beads`.
8. In `Layout.tsx`:
   - Import `LogOut` from `lucide-react`, and `clearEmail`, `useEmail` from `./identity`.
   - `const email = useEmail();`
   - Mobile header (`md:hidden`): after `ThemeToggle`, when `email !== null`, `<button type="button" onClick={clearEmail} aria-label="Log out" title={\`Log out ${email}\`} className={ICON_BUTTON}><LogOut aria-hidden className="size-5" /></button>`.
   - Sidebar column: after the `<nav>`, when `email !== null`, `<div className={cn("hidden md:mt-auto md:flex md:flex-col md:items-center md:gap-1 md:border-t md:pt-3", wide && "lg:flex-row lg:justify-between lg:px-2")}>` holding `<span aria-label={email} title={email} className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase" + (wide ? " lg:hidden" : "")>{email[0]}</span>`, `<span className={cn("hidden truncate text-sm", wide && "lg:block")}>{email}</span>` and the same "Log out" icon button. The sidebar column gets `md:min-h-screen` so `mt-auto` pushes the block to the bottom.
   - Add to `Layout.test.tsx`, signing in with `setEmail` in `beforeEach` and resetting in `afterEach`:
     - `REQ-UI-098 the sidebar shows the email and Log out`: `screen.getAllByText("tester@example.com").length > 0` and a button named "Log out".
     - `REQ-UI-098 Log out forgets the email`: click the first "Log out", expect `getEmail()` null.
9. Run `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint`; expect all pass.
10. Commit: `git commit -m "feat(ui): email login and log out (gin-console-62k)"`

### Track 2: My Tasks page
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-102
- **Files**:
  - Create `frontend/src/features/my-tasks/match.ts`
  - Create `frontend/src/features/my-tasks/load.ts`
  - Create `frontend/src/features/my-tasks/MyTasksPage.tsx`
  - Modify `frontend/src/app/App.tsx:1-96` (import and `/my-tasks` route)
  - Modify `frontend/src/app/Layout.tsx:1-15` (`NAV` entry)
  - Test `frontend/src/features/my-tasks/match.test.ts`
  - Test `frontend/src/features/my-tasks/load.test.ts`
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
  - Test `frontend/src/app/Layout.test.tsx` (link list and current state)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded new feature folder over existing API functions, with the matching rule, order and failure handling fixed by the spec.
- **Acceptance criteria**:
  - Every scenario of REQ-UI-099 to REQ-UI-102 has a passing test.
  - Existing Layout navigation tests list "My Tasks" after "Beads".
  - `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- **Estimated complexity**: medium

Interfaces consumed: `useEmail()` (Track 1); `fetchProjects(): Promise<Project[]>` (`@/features/projects/api`); `fetchBeads(project: string, closed: boolean): Promise<BeadSummary[]>`, `BeadSummary` (`@/features/beads/api`); `StateMark({ bead })`, `TypeBadge({ type })`; `Link`, `navigate`, `useLocation` (`@/app`); `Table*` from `@/components/ui/table`; `Alert*` from `@/components/ui/alert`.

Interfaces produced:
```ts
// match.ts
export function isMine(bead: Pick<BeadSummary, "assignee">, email: string): boolean;
// load.ts
export type MyTask = { project: string; bead: BeadSummary };
export type ProjectFailure = { project: string; message: string };
export type MyTasks = { tasks: MyTask[]; failures: ProjectFailure[] };
export function compareTasks(a: MyTask, b: MyTask): number;
export function loadMyTasks(email: string, closed: boolean): Promise<MyTasks>; // rejects only when fetchProjects rejects
// MyTasksPage.tsx
export function MyTasksPage(): JSX.Element;
```

Steps:

1. Write `match.test.ts` (`REQ-UI-100` in each name) with email `giangdhwhtbr@gmail.com`: true for assignee `giangdhwhtbr`, `GiangDHWHTBR@gmail.com`, ` giangdhwhtbr `; false for `alice`, `giangdhwhtbr@other.com`, `giang`, `null`, `""`, `"  "`; and false for `{ assignee: null, owner: "giangdhwhtbr@gmail.com" }` cast through `Pick`. Run; expect failure. Write:
   ```ts
   import type { BeadSummary } from "@/features/beads/api";

   /** Mine when the assignee is the email or its part before @, ignoring case and surrounding spaces; owner is the creator and never counts. */
   export function isMine(bead: Pick<BeadSummary, "assignee">, email: string): boolean {
     const assignee = (bead.assignee ?? "").trim().toLowerCase();
     if (assignee === "") return false;
     const mine = email.trim().toLowerCase();
     return assignee === mine || assignee === mine.slice(0, mine.indexOf("@"));
   }
   ```
   Run; expect pass.
2. Write `load.test.ts` mocking `@/features/projects/api` and `@/features/beads/api` with `vi.mock`, using `bead()` from `@/features/beads/beadFixtures` for bead objects:
   - `REQ-UI-100 gathers my beads across projects in order`: projects A and B exist, C has `exists: false`; A has P2 mine updated `2026-11-10`, plus one of `alice`; B has P1 mine updated `2026-11-03`. Expect `fetchBeads` called with `("A", false)` and `("B", false)` only, and tasks `[B…, A…]`.
   - `REQ-UI-100 equal priority puts the newest update first, then project and id`.
   - `REQ-UI-101 closed is passed through`: `loadMyTasks(email, true)` calls `fetchBeads("A", true)`.
   - `REQ-UI-102 a failing project is reported and the others listed`: B rejects `new Error("bd failed")`; expect `failures` `[{ project: "B", message: "bd failed" }]` and A's tasks.
   - `REQ-UI-102 a projects failure rejects`.
   Run; expect failure. Write:
   ```ts
   import { fetchBeads, type BeadSummary } from "@/features/beads/api";
   import { fetchProjects } from "@/features/projects/api";
   import { isMine } from "./match";

   export type MyTask = { project: string; bead: BeadSummary };
   export type ProjectFailure = { project: string; message: string };
   export type MyTasks = { tasks: MyTask[]; failures: ProjectFailure[] };

   export function compareTasks(a: MyTask, b: MyTask): number {
     return (
       a.bead.priority - b.bead.priority ||
       b.bead.updated_at.localeCompare(a.bead.updated_at) ||
       a.project.localeCompare(b.project) ||
       a.bead.id.localeCompare(b.bead.id)
     );
   }

   export async function loadMyTasks(email: string, closed: boolean): Promise<MyTasks> {
     const names = (await fetchProjects()).filter((p) => p.exists).map((p) => p.name);
     const results = await Promise.allSettled(names.map((name) => fetchBeads(name, closed)));
     const tasks: MyTask[] = [];
     const failures: ProjectFailure[] = [];
     results.forEach((result, i) => {
       const project = names[i];
       if (result.status === "rejected") {
         failures.push({ project, message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
       } else {
         for (const bead of result.value) if (isMine(bead, email)) tasks.push({ project, bead });
       }
     });
     return { tasks: tasks.sort(compareTasks), failures };
   }
   ```
   Run; expect pass.
3. Write `MyTasksPage.test.tsx` rendering `<App />` at `/my-tasks` with `setEmail("giangdhwhtbr@gmail.com")` and a stubbed `fetch` that answers `/api/projects` and `/api/beads?project=…` (the URLs `fetchProjects`/`fetchBeads` request today; read them from `features/projects/api.ts` and `features/beads/api.ts:98-106`):
   - `REQ-UI-099 the My Tasks link opens /my-tasks and is current`: start at `/`, click the "My Tasks" link in the "Main" navigation, expect pathname `/my-tasks`, heading "My Tasks", `aria-current="page"` on the link.
   - `REQ-UI-100 lists only my beads with project and count`: A has beads assigned `giangdhwhtbr`, `GiangDHWHTBR@gmail.com`, `alice`, and an unassigned one owned by the email. Expect 2 rows, each showing `A`, and the text `2 tasks`.
   - `REQ-UI-100 rows across projects in order and linked`: A P2 today, B P1 last week; first row is B's; A's row link has `href` `/beads/A/<id>`.
   - `REQ-UI-100 nothing assigned`: expect `No tasks assigned to giangdhwhtbr@gmail.com`.
   - `REQ-UI-101 closed hidden by default`: no beads request URL contains `closed=1`.
   - `REQ-UI-101 Show closed`: click the "Show closed" checkbox; expect `window.location.search === "?closed=1"`, a beads request with `closed=1`, and the closed rows listed.
   - `REQ-UI-102 one project fails`: B answers 500; expect an alert containing `B` and the A rows.
   - `REQ-UI-102 projects fail`: `/api/projects` answers 500; expect "Projects could not be loaded" and no table.
   Run; expect failure.
4. Write `MyTasksPage.tsx`:
   ```tsx
   type State =
     | { status: "loading" }
     | { status: "error"; message: string }
     | { status: "ok"; data: MyTasks };
   ```
   - `const email = useEmail() ?? "";` (the gate guarantees a value); `const { search } = useLocation(); const closed = new URLSearchParams(search).get("closed") === "1";`
   - `useEffect` on `[email, closed]`: set loading, call `loadMyTasks(email, closed)`, ignore the result after cleanup (`let live = true; return () => { live = false; }`); on reject set `error` with the message.
   - Render `<section className="flex flex-col gap-4">`, `<h1 className="text-xl font-semibold">My Tasks</h1>`, a row with the count (`{n} task` / `{n} tasks`, only when ok) and the "Show closed" `<label>` + checkbox written as in `features/beads/BeadFilterBar.tsx:99-107`, whose `onChange` calls `navigate(event.target.checked ? "/my-tasks?closed=1" : "/my-tasks", { replace: true })`.
   - Loading: `<p className="text-muted-foreground">Loading tasks…</p>`. Error: `Alert variant="destructive"` with title "Projects could not be loaded" and the message. Each failure: `Alert variant="destructive"` with title `{project} could not be loaded` and the message.
   - Empty: `<p className="text-muted-foreground">No tasks assigned to {email}</p>`.
   - Otherwise a `Table` with headers Project, Task, State, Type, Priority, Updated; each row: project; `<Link to={\`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}\`}>` with the id in `font-mono text-xs text-muted-foreground` and the title; `<StateMark bead={bead} />`; `<TypeBadge type={bead.issue_type} />`; `P{bead.priority}`; `new Date(bead.updated_at).toLocaleDateString()`. Columns Type and Updated get `hidden md:table-cell` so the list fits 375px.
5. Wire it: in `App.tsx` import `MyTasksPage` and add `) : pathname === "/my-tasks" ? (<MyTasksPage />` after the `/beads` branch. In `Layout.tsx` import `UserCheck` and insert after the Beads entry: `{ to: "/my-tasks", label: "My Tasks", icon: UserCheck, current: (path: string) => path === "/my-tasks" },`. Update `Layout.test.tsx:31-36` so the expected links read Projects, Beads, My Tasks, Milestones, Reports, and add `["/my-tasks", ["My Tasks"]]` to the current-link table at line 50 (`REQ-UI-099`).
6. Run `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`; expect all pass. Check at 375px and 1280px in the dev server (`pnpm -C frontend dev` with the API on :8700) that the table does not overflow.
7. Commit: `git commit -m "feat(ui): My Tasks across projects (gin-console-62k)"`

### Track 3: README guide to listen on all interfaces
- **Dependencies**: none
- **Requirements**: none (documentation of REQ-SERVER-001 and REQ-DOCKER-007, unchanged)
- **Files**:
  - Modify `README.md:116-125` (a pointer from "Windows Tips"), `README.md:174-184` (a pointer after "Start the Server"), and a new `## Listening on all interfaces` section between `## Docker Deployment` and `## Development Mode`
- **Provider role**: `docs`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** documentation with the exact variables and commands listed below.
- **Acceptance criteria**:
  - The section shows every block below and the warning; the two pointers link to it (`#listening-on-all-interfaces`).
  - Variable names match `backend/src/gin_console/config.py` (`HOST_ENV`, `ALLOW_NON_LOOPBACK_ENV`): confirm with `grep -n "_ENV =" backend/src/gin_console/config.py`.
- **Estimated complexity**: low

Steps:

1. Confirm the names: `grep -n "_ENV =" backend/src/gin_console/config.py` lists `GIN_CONSOLE_HOST` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK`.
2. Add the section:
   - Opening paragraph: by default gin-console listens on `127.0.0.1` and refuses any other address, because it has no authentication and is meant to sit behind `tailscale serve`. To listen on every interface, set both `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`; `GIN_CONSOLE_HOST` overrides `server.host` in the config (setting `server.host: 0.0.0.0` in the config also works, still with the second variable).
   - A `> **Warning**` block: the API has no authentication; the email asked on the login screen only picks "My Tasks" and is not a password. Anyone who reaches the port reads projects, beads and session logs. Allow the port only from trusted networks (firewall, VPN).
   - `### Linux and macOS`: `GIN_CONSOLE_HOST=0.0.0.0 GIN_CONSOLE_ALLOW_NON_LOOPBACK=1 uv run --directory backend -m gin_console`.
   - `### systemd user service`: `systemctl --user edit gin-console` with
     ```ini
     [Service]
     Environment=GIN_CONSOLE_HOST=0.0.0.0
     Environment=GIN_CONSOLE_ALLOW_NON_LOOPBACK=1
     ```
     then `systemctl --user restart gin-console`.
   - `### Docker`: the container already binds `0.0.0.0` with both variables (`docker-compose.yml`); only the published address is loopback. To publish on every interface, set in `docker-compose.override.yml`
     ```yaml
     services:
       gin-console:
         ports: !override
           - "0.0.0.0:8700:8700"
     ```
     (`!override` needs Docker Compose 2.24 or later; the service is `gin-console` in `docker-compose.yml`).
   - `### Windows`:
     - PowerShell, this window only:
       ```powershell
       $env:GIN_CONSOLE_HOST = "0.0.0.0"
       $env:GIN_CONSOLE_ALLOW_NON_LOOPBACK = "1"
       uv run --directory backend -m gin_console
       ```
     - PowerShell, kept for the user (open a new terminal afterwards):
       ```powershell
       [Environment]::SetEnvironmentVariable("GIN_CONSOLE_HOST", "0.0.0.0", "User")
       [Environment]::SetEnvironmentVariable("GIN_CONSOLE_ALLOW_NON_LOOPBACK", "1", "User")
       ```
       or `setx GIN_CONSOLE_HOST 0.0.0.0` and `setx GIN_CONSOLE_ALLOW_NON_LOOPBACK 1`.
     - Command Prompt, this window only:
       ```bat
       set GIN_CONSOLE_HOST=0.0.0.0
       set GIN_CONSOLE_ALLOW_NON_LOOPBACK=1
       uv run --directory backend -m gin_console
       ```
     - Windows Defender Firewall asks to allow Python on first start; allow private networks only, or add a rule: `New-NetFirewallRule -DisplayName "gin-console" -Direction Inbound -Protocol TCP -LocalPort 8700 -Action Allow -Profile Private` (elevated PowerShell).
     - To undo: `Remove-Item Env:GIN_CONSOLE_HOST, Env:GIN_CONSOLE_ALLOW_NON_LOOPBACK` for the window, or `[Environment]::SetEnvironmentVariable("GIN_CONSOLE_HOST", $null, "User")` (same for the other) for the user.
   - Closing line: open `http://<machine-ip>:8700`; without both variables the console exits with `refusing to bind 0.0.0.0`.
3. Add the pointers: under "Windows Tips" a bullet `**Listen on all interfaces**: see [Listening on all interfaces](#listening-on-all-interfaces).`; after the Linux "Start the Server" note, the same sentence.
4. Commit: `git commit -m "docs(readme): listening on all interfaces, with Windows steps (gin-console-62k)"`

### Track 4: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-UI-097, REQ-UI-098, REQ-UI-099, REQ-UI-100, REQ-UI-101
- **Files**:
  - Modify `docs/changes/gin-console-62k-login-my-tasks/05-tests.md` (TC-1 row and result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result; no code.
- **Human gate**: the user walks TC-1 in a browser on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 is recorded `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy (each a separate command, per the deploy memory): `git -C /home/gin/gin-fam/gin-console merge --ff-only <integration branch>` on a checkout of the integration branch, `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`, `pnpm -C /home/gin/gin-fam/gin-console/frontend build`, `systemctl --user restart gin-console`, `systemctl --user is-active gin-console` (expect `active`), `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health` (expect `200`). Report the rollback command.
2. Ask the user to walk TC-1 (below); write the result into `05-tests.md`.

TC-1 (manual, REQ-UI-097 to REQ-UI-101): in a private window, the Tailscale URL shows the login screen; `giang` is refused; `Giangdhwhtbr@gmail.com` signs in and keeps the URL; a reload does not ask again; the sidebar shows `giangdhwhtbr@gmail.com`; "My Tasks" lists the beads assigned to `giangdhwhtbr` in gin-console and gin-workflow with their project, priority first; "Show closed" adds closed beads and `?closed=1`; "Log out" returns to the login screen; checked at phone width and desktop, light and dark.

## Integration
- **Branch**: `feat/gin-console-62k-login-my-tasks`, created from `spec/gin-console-62k-login-my-tasks` after the spec and plan commit. Tracks 1 and 3 work on their own track branches and merge into it; Track 2 branches from it after Track 1 merges; Track 4 runs on it after all merges.
- **Merge strategy**: parallel-then-merge

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `uv run --directory backend pytest` still passes (no backend change)
- [ ] `gin specs lint --change gin-console-62k` prints `ok`; `gin specs trace --change gin-console-62k` lists no missing REQ
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- `Model:` and `Effort:` come from the main harness catalog (`haiku`, `sonnet`, `opus`; `low` to `max`) using the route rubric. The user may override them before plan approval.
- The Parent Bead (`gin-console-62k`) stays open until the human-confirmed merge. Each track bead closes when its tests and review pass.
- Existing tests that render `App` sign in first in `beforeEach`; that change is part of Track 1, since the gate is what breaks them.
