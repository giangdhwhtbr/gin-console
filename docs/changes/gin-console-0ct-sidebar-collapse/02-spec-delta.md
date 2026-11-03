# Spec Delta: Sidebar collapse

## ADDED

### REQ-UI-094: Collapsible sidebar
From 1024px the frontend SHALL show, at the top of the "Main" navigation's sidebar next to the theme control, a control that collapses the sidebar and expands it again, with an accessible name saying which it does ("Collapse sidebar" or "Expand sidebar") and `aria-expanded` telling whether the sidebar is expanded, and SHALL NOT show the control below 1024px. From 768px the frontend SHALL show the theme control and the collapse control as icons at the top of the navigation column, on one row with the brand mark while the sidebar is expanded and under the brand mark on the icon rail, so that both are visible without scrolling the page. WHILE the sidebar is collapsed, the frontend SHALL draw it as the icon rail of REQ-UI-056 with the brand mark without its word. The frontend SHALL start with the sidebar expanded, SHALL keep the choice in the browser and use it on the next visit, and IF the browser refuses to store the choice, THEN SHALL still collapse and expand the sidebar for the current visit without an error.

#### Scenario: Collapse
- GIVEN a window 1280px wide with the sidebar expanded
- WHEN the user presses "Collapse sidebar"
- THEN the navigation is the icon rail with the label under each icon, and the control is named "Expand sidebar" with `aria-expanded="false"`

#### Scenario: Expand
- GIVEN a window 1280px wide with the sidebar collapsed
- WHEN the user presses "Expand sidebar"
- THEN the navigation is the sidebar with the label beside each icon, and the control is named "Collapse sidebar" with `aria-expanded="true"`

#### Scenario: Remember
- GIVEN the user collapsed the sidebar
- WHEN the page is reloaded
- THEN the sidebar is collapsed

#### Scenario: Default
- GIVEN no choice is stored
- WHEN the page loads in a window 1280px wide
- THEN the sidebar is expanded

#### Scenario: Storage refused
- GIVEN the browser refuses to store data
- WHEN the user presses "Collapse sidebar"
- THEN the sidebar collapses and no error is shown

#### Scenario: Controls at the top
- GIVEN a window 1280px wide and a page taller than the window
- WHEN the page loads
- THEN the theme and collapse controls are shown on the brand mark's row, above the links, without scrolling

#### Scenario: Narrow window
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN no collapse control is shown and the theme control is under the brand mark, above the links

## MODIFIED

### REQ-UI-056: Responsive navigation
<!-- base: ed7cd9b435f7a1f43c098070b31a1c366d5ff005aa4989bee89490a87da5f021 -->
The "Main" navigation SHALL be a tab bar fixed to the bottom of the screen with an icon and a label per link while the window is narrower than 768px, an icon rail with a label under each icon from 768px up to 1023px, and from 1024px a sidebar with an icon and a label per link, or the icon rail while the sidebar is collapsed (REQ-UI-094), and SHALL be the same element in every case.

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the navigation is a bar at the bottom of the screen and the page content is not hidden behind it

#### Scenario: Tablet
- GIVEN a window 820px wide
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

#### Scenario: Laptop
- GIVEN a window 1280px wide and the sidebar expanded
- WHEN any page is shown
- THEN the navigation is a sidebar at the left with the label beside each icon

#### Scenario: Laptop, collapsed
- GIVEN a window 1280px wide and the sidebar collapsed
- WHEN any page is shown
- THEN the navigation is a narrow column at the left with the label under each icon

## REMOVED
