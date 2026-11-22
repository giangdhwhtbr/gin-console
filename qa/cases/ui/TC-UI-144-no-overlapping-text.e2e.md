# TC-UI-144: No overlapping text on Projects and My Tasks

- **REQ:** REQ-UI-110@adc61666
- **Priority:** high

**Preconditions:**
- The example project is shown

**Steps:**
1. Set the theme to light
2. Set the window width to 390 px
3. Open `/`
4. Open `/my-tasks`
5. Set the window width to 1024 px
6. Open `/`
7. Open `/my-tasks`
8. Set the window width to 1440 px
9. Open `/`
10. Open `/my-tasks`
11. Set the window width to 1920 px
12. Open `/`
13. Open `/my-tasks`
14. Set the theme to dark
15. Set the window width to 390 px
16. Open `/`
17. Open `/my-tasks`
18. Set the window width to 1024 px
19. Open `/`
20. Open `/my-tasks`
21. Set the window width to 1440 px
22. Open `/`
23. Open `/my-tasks`
24. Set the window width to 1920 px
25. Open `/`
26. Open `/my-tasks`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
