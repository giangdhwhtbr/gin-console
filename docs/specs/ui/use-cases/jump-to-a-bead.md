# Jump to a bead

Actor: Developer
Trigger: The developer knows the id or a word of the title of a bead.
Requirements: REQ-UI-154

## Goal

Open the page of a bead of any project in a few keystrokes.

## Preconditions

- The developer has signed in with an email.

## Main flow
1. The developer presses Ctrl+K or Cmd+K on any page.
2. The system opens the "Jump to a bead" dialog with the search field focused, after loading the beads of every configured project on the first opening.
3. The developer types an id or a word of a title.
4. The system lists up to 20 matching beads with the project of each.
5. The developer presses Enter on a result, or clicks it.
6. The system closes the dialog and opens the bead page.

## Alternative flows
### 1a. The beads were loaded by an earlier opening
1. The system opens the dialog without loading.
2. Resume at step 3.

### 3a. The text is empty
1. The system lists no bead and says "Type an id or a title".
2. Resume at step 3.

### 4a. No bead matches
1. The system says "No beads match".
2. Resume at step 3.

## Exception flows
### 2e. The beads of a project cannot be loaded
1. The system says "Could not load <project>" and keeps the beads of the others.
2. Resume at step 3.

## Business rules
- Order of the results: REQ-UI-154.

## Postconditions

- The dialog is closed and, unless the developer pressed Escape, the bead page is shown.
