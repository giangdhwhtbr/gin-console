# TC-UI-144: No overlapping text on My Tasks

- **REQ:** REQ-UI-110@6bf5889e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** 15b75109

**Preconditions:**
- The example project is shown

**Steps:**
1. Set the theme to light
2. Set the window width to 390 px
3. Open `/my-tasks`
4. Set the window width to 1024 px
5. Open `/my-tasks`
6. Set the window width to 1440 px
7. Open `/my-tasks`
8. Set the window width to 1920 px
9. Open `/my-tasks`
10. Set the theme to dark
11. Set the window width to 390 px
12. Open `/my-tasks`
13. Set the window width to 1024 px
14. Open `/my-tasks`
15. Set the window width to 1440 px
16. Open `/my-tasks`
17. Set the window width to 1920 px
18. Open `/my-tasks`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
