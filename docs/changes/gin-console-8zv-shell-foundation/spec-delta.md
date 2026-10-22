# Spec Delta: Visual foundation and responsive app shell

## ADDED

### REQ-UI-055: Main navigation
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads (`/beads`), Sessions (`/sessions`) and Quota (`/quota`).

#### Scenario: Four links
- GIVEN any page is shown
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, Sessions and Quota, one each

### REQ-UI-056: Responsive navigation
The "Main" navigation SHALL be a tab bar fixed to the bottom of the screen with an icon and a label per link while the window is narrower than 768px, an icon rail with a label under each icon from 768px up to 1023px, and a sidebar with an icon and a label per link from 1024px, and SHALL be the same element in every case.

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the navigation is a bar at the bottom of the screen and the page content is not hidden behind it

#### Scenario: Tablet
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

#### Scenario: Laptop
- GIVEN a window 1280px wide
- WHEN any page is shown
- THEN the navigation is a sidebar at the left with the label beside each icon

### REQ-UI-057: Current destination
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight, treating `/beads`, `/beads/<project>/<id>` as Beads and `/sessions`, `/sessions/<project>/<id>` as Sessions, and SHALL mark no other link.

#### Scenario: Bead page
- GIVEN the URL is `/beads/alpha/a-1`
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN only the Quota link has `aria-current="page"`

### REQ-UI-058: Theme
The frontend SHALL start in the theme the system prefers, SHALL offer a control that switches between light and dark with an accessible name saying which theme it switches to, SHALL keep the choice in the browser and use it on the next visit, SHALL set the theme before the first paint so that the wrong theme is not shown, and IF the browser refuses to store the choice, THEN SHALL still switch for the current visit without an error.

#### Scenario: System default
- GIVEN no choice is stored and the system prefers dark
- WHEN the page loads
- THEN the dark theme is used

#### Scenario: Switch and remember
- GIVEN the light theme is shown
- WHEN the user switches the theme and reloads the page
- THEN the dark theme is used

#### Scenario: Storage refused
- GIVEN the browser throws when the choice is stored
- WHEN the user switches the theme
- THEN the theme changes and no error is shown

### REQ-UI-059: Colour tokens
The frontend SHALL use a neutral cool palette whose only hues are the five status colours Ready, In progress, Blocked, Done and Deferred, defined for light and dark, SHALL show text and status colours with a contrast of at least 4.5:1 against every surface (background, card and muted) they are drawn on, SHALL draw the outline of inputs, selects and other controls with at least 3:1 against their surface (separators and card borders are decoration and are not held to this), and SHALL show priority with weight and the danger colour for P0 only, never with a further hue.

#### Scenario: Status colours exist in both themes
- GIVEN the light theme and then the dark theme
- WHEN a page uses a status colour
- THEN the colour is the one defined for that theme

#### Scenario: Contrast
- GIVEN the palette of a theme
- WHEN text, status colours and control outlines are measured against the surfaces they sit on
- THEN text and status colours are at least 4.5:1 and control outlines at least 3:1

### REQ-UI-060: Typography
The frontend SHALL set the interface in Geist and ids, paths and code in Geist Mono, SHALL use a text size of at least 16px in text inputs on screens narrower than 768px, and SHALL load both faces from the application itself, not from another site.

#### Scenario: Ids in monospace
- GIVEN a bead id is shown
- WHEN the page renders
- THEN the id uses the monospace face

#### Scenario: Input size on a phone
- GIVEN a window 390px wide
- WHEN a text input is shown
- THEN its text size is at least 16px

### REQ-UI-061: No sideways page scroll
WHILE the window is 360px wide or wider, no page of the frontend SHALL scroll horizontally, and content wider than the window, such as a table, the Board, the Tree or a code block, SHALL scroll inside its own box.

#### Scenario: Wide table
- GIVEN a window 360px wide and the bead list in table form
- WHEN the page is shown
- THEN the page itself does not scroll sideways and the table scrolls inside its box

#### Scenario: Long path
- GIVEN a project with a long directory name on the Projects page
- WHEN the page is shown at 360px
- THEN the name wraps or is cut and the page does not scroll sideways

### REQ-UI-062: Touch, focus and motion
On screens narrower than 768px the links and buttons of the navigation and the theme control SHALL be at least 44px high and wide, every interactive element SHALL show a visible focus indicator when reached by keyboard, and the frontend SHALL not run non-essential animation or transitions while the user prefers reduced motion.

#### Scenario: Touch target
- GIVEN a window 390px wide
- WHEN the tab bar is shown
- THEN each link is at least 44px high

#### Scenario: Keyboard focus
- GIVEN the user presses Tab on any page
- WHEN a link or button receives focus
- THEN a focus indicator is visible

### REQ-UI-063: Page title
The frontend SHALL set the document title to `gin-console`.

#### Scenario: Title
- GIVEN any page is shown
- WHEN the page loads
- THEN the document title is `gin-console`

## MODIFIED

### REQ-UI-008: Sessions navigation
<!-- base: 7e57803664304828af09f2946d1b5b52ef4de631e77114919e08e27a0ce66435 -->
The "Main" navigation SHALL contain a "Sessions" link, and the frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Sessions"
- THEN the URL is `/sessions` and the session list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a session log from the list
- WHEN the user presses back
- THEN the session list is shown

### REQ-UI-015: Quota navigation
<!-- base: f3c71b3958b5aa196d3d62ebeb6d1b822e9dd307477b0386e3bbefc9fd242e41 -->
The "Main" navigation SHALL contain a "Quota" link and the frontend SHALL show the quota page at `/quota` without a full reload, following the browser back and forward buttons.

#### Scenario: Open the page
- GIVEN the Projects page is shown
- WHEN the user clicks "Quota"
- THEN the URL is `/quota` and the quota page is shown without a reload

### REQ-UI-022: Beads navigation
<!-- base: 8f7bc2a433f8239415eb529e771532231fa2299bcb31f0ffb40c7b27e80e2709 -->
The "Main" navigation SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the Projects page.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Beads"
- THEN the URL is `/beads` and the bead list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a bead from the list
- WHEN the user presses back
- THEN the list is shown with the same filters

## REMOVED
