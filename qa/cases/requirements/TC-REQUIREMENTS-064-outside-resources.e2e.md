# TC-REQUIREMENTS-064: Outside resources

- **REQ:** REQ-REQUIREMENTS-011@67443d75
- **Priority:** medium

**Preconditions:**
- A console server runs with a project whose folder `docs/specs/ui/assets/2026-11-22` is confirmed (a stubbed `/api/*` answer is enough)
- Its `index.html` holds `<img src="https://example.com/x.png">`, a stylesheet link to `https://fonts.googleapis.com/css?family=X`, a link to its own `style.css` that colours the heading `rgb(200, 30, 60)`, and an inline style on a paragraph

**Steps:**
1. Record every request of the page with `page.on("request")`
2. Open `/requirements/mockups?project=a&mockup=ui/2026-11-22`
3. Read the heading's colour in the frame

**Expected:**
- No request goes to `example.com` or `fonts.googleapis.com`
- The frame's heading has the colour of `style.css`
- The paragraph has the colour of its inline style
