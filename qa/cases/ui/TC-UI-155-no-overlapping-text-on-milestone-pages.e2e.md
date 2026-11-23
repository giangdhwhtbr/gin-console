# TC-UI-155: No overlapping text on milestone pages

- **REQ:** REQ-UI-110@6bf5889e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ec666a95

**Preconditions:**
- The example project is shown
- `/milestones/example/ex-m2` without `zoom` shows the whole milestone

**Steps:**
1. Set the theme to light
2. Set the window width to 390 px
3. Open `/milestones`
4. Open `/milestones/example/ex-m2?zoom=1w`
5. Open `/milestones/example/ex-m2?zoom=2w`
6. Open `/milestones/example/ex-m2`
7. Open `/milestones/example/ex-m2?tab=beads`
8. Open `/milestones/example/ex-m2?tab=retro`
9. Set the window width to 1024 px
10. Open `/milestones`
11. Open `/milestones/example/ex-m2?zoom=1w`
12. Open `/milestones/example/ex-m2?zoom=2w`
13. Open `/milestones/example/ex-m2`
14. Open `/milestones/example/ex-m2?tab=beads`
15. Open `/milestones/example/ex-m2?tab=retro`
16. Set the window width to 1440 px
17. Open `/milestones`
18. Open `/milestones/example/ex-m2?zoom=1w`
19. Open `/milestones/example/ex-m2?zoom=2w`
20. Open `/milestones/example/ex-m2`
21. Open `/milestones/example/ex-m2?tab=beads`
22. Open `/milestones/example/ex-m2?tab=retro`
23. Set the window width to 1920 px
24. Open `/milestones`
25. Open `/milestones/example/ex-m2?zoom=1w`
26. Open `/milestones/example/ex-m2?zoom=2w`
27. Open `/milestones/example/ex-m2`
28. Open `/milestones/example/ex-m2?tab=beads`
29. Open `/milestones/example/ex-m2?tab=retro`
30. Set the theme to dark
31. Set the window width to 390 px
32. Open `/milestones`
33. Open `/milestones/example/ex-m2?zoom=1w`
34. Open `/milestones/example/ex-m2?zoom=2w`
35. Open `/milestones/example/ex-m2`
36. Open `/milestones/example/ex-m2?tab=beads`
37. Open `/milestones/example/ex-m2?tab=retro`
38. Set the window width to 1024 px
39. Open `/milestones`
40. Open `/milestones/example/ex-m2?zoom=1w`
41. Open `/milestones/example/ex-m2?zoom=2w`
42. Open `/milestones/example/ex-m2`
43. Open `/milestones/example/ex-m2?tab=beads`
44. Open `/milestones/example/ex-m2?tab=retro`
45. Set the window width to 1440 px
46. Open `/milestones`
47. Open `/milestones/example/ex-m2?zoom=1w`
48. Open `/milestones/example/ex-m2?zoom=2w`
49. Open `/milestones/example/ex-m2`
50. Open `/milestones/example/ex-m2?tab=beads`
51. Open `/milestones/example/ex-m2?tab=retro`
52. Set the window width to 1920 px
53. Open `/milestones`
54. Open `/milestones/example/ex-m2?zoom=1w`
55. Open `/milestones/example/ex-m2?zoom=2w`
56. Open `/milestones/example/ex-m2`
57. Open `/milestones/example/ex-m2?tab=beads`
58. Open `/milestones/example/ex-m2?tab=retro`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
