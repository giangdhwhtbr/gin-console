# Design: Visual foundation and responsive app shell

Epic: gin-console-8zv

## Architecture
Frontend only. No backend change.

- `frontend/src/index.css`: neutral palette tokens (same shadcn variable names, new values) in `:root` and `.dark`; status tokens `--state-ready|progress|blocked|done|deferred` already exist from the graph change and become shared; `--font-mono`.
- `frontend/src/app/Layout.tsx`: a `NAV` array `{ to, label, icon, match }` and one `<nav aria-label="Main">`. Tailwind classes turn it into a bottom tab bar (`max-md:`), an icon rail (`md:` to `lg:`) and a sidebar (`lg:`). A slim header with the name and the theme toggle shows under 768px; the toggle sits at the bottom of the rail and the sidebar.
- `frontend/src/app/theme.ts` (new): `readTheme()`, `applyTheme(theme)`, `useTheme()` with `"light" | "dark"`, default from `matchMedia("(prefers-color-scheme: dark)")`, stored in `localStorage` under one key, every read and write in try/catch.
- `frontend/index.html`: title `gin-console`; a small inline script sets the `dark` class on `<html>` before paint, using the same rule as `theme.ts`.
- Geist Mono comes from `@fontsource-variable/geist-mono` (the one new dependency, same publisher as Geist).
- Wide content: `main` gets `min-w-0`; tables, the Board columns and the Tree already sit in boxes and get `overflow-x-auto` where they do not.

## Data Flow
The first paint class comes from the inline script; `useTheme` reads the same storage key on mount, so React and the page agree. The toggle writes the key and the class. Nothing else is stored.

## Error Handling
Storage that throws (private window, blocked data) is ignored: the toggle still works for the session and the system theme applies next time. `matchMedia` missing means light.

## Testing
`Layout.test.tsx` (landmark, one link per destination, `aria-current`), `theme.test.ts` (default from the system, toggle, persistence, storage that throws), the existing `App.test.tsx` routing tests. Responsive behaviour and contrast cannot be computed in jsdom: manual cases TC-1 to TC-3 in `tests.md` with screenshots at 360, 768 and 1280px in light and dark.

## Token reference (from the preview)
| Token | Light | Dark |
|---|---|---|
| background | `#f6f7f9` | `#0e1217` |
| card | `#ffffff` | `#161b22` |
| foreground | `#12161c` | `#e7eaf0` |
| muted foreground | `#566072` | `#9aa4b2` |
| border (separators, card edges: decoration) | `#cfd5de` | `#2c343f` |
| input (outline of controls, at least 3:1) | `#7d8695` | `#667085` |
| hover | `#eceff3` | `#1d242d` |
| ready / progress / blocked / done and deferred | `#0f766e` `#4338ca` `#a3470a` `#5d6573` | `#2dd4bf` `#a5b4fc` `#fbbf24` `#9ca3af` |
| danger (P0 chip) | `#b91c1c` | `#f87171` |
