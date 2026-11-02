# Design: Sidebar collapse

Epic: gin-console-0ct

## Architecture
This change touches only the frontend shell in `frontend/src/app/`. Nothing changes in the backend, and no dependency is added (`lucide-react` already has `PanelLeftClose` and `PanelLeftOpen`).

- `Layout.tsx` owns the collapsed state: a `useState` whose initializer reads the key `gin-console-sidebar` from `localStorage` (`"collapsed"` collapses; anything else, or a refused read, expands). Toggling writes the key, inside `try/catch` like `theme.ts`.
- While collapsed, `Layout` leaves out the `lg:` classes of the sidebar column, the brand word, the links (`LINK`) and the theme control, so from 1024px the `md:` rail styles apply. Expanded, the classes stay exactly as today. `ThemeToggle` takes a prop to drop its `lg:` label for this.
- The collapse button sits under `ThemeToggle`, is `hidden lg:flex`, and uses the same button classes as `ThemeToggle`: icon plus "Collapse sidebar" expanded, icon only collapsed. Its `aria-label` is "Collapse sidebar" or "Expand sidebar", with `aria-expanded`.
- No script in `index.html`: the navigation is rendered by React, and the state is read before the first render, so the wrong width is never painted.
- No transition on the width, so REQ-UI-062 (reduced motion) needs no special case.

## Data Flow
1. On first render `Layout` reads `gin-console-sidebar` and picks the sidebar classes.
2. Pressing the button flips the state, writes the key, and React redraws the column with the other classes.
3. Below 1024px neither the button nor the `lg:` classes apply, so the stored choice has no effect there.

## Error Handling
- A refused or throwing `localStorage` read gives the expanded sidebar; a refused write keeps the choice for the current visit (REQ-UI-094).
- An unknown stored value expands the sidebar.

## Testing
- vitest `Layout.test.tsx`, each case named with its REQ-ID:
  - REQ-UI-094: the button starts as "Collapse sidebar" with `aria-expanded="true"`; pressing it gives "Expand sidebar" with `aria-expanded="false"` and stores `collapsed`; a render with `collapsed` stored starts collapsed; with `localStorage.setItem` throwing, pressing still toggles.
  - REQ-UI-055 and REQ-UI-057: the existing cases run again with the sidebar collapsed (one "Main" navigation, five links, current page marked).
- jsdom has no layout, so the widths at 820px and 1280px are checked by hand (`05-tests.md`).
- `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` must pass.
