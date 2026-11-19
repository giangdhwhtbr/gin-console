# TC-UI-153: No overlapping text on Beads pages

- **REQ:** REQ-UI-110@796f0bc7
- **Priority:** medium

**Preconditions:**
- The example project is shown

**Steps:**
1. Set the theme to light
2. Set the window width to 390 px
3. Open `/beads?project=example&view=list`
4. Open `/beads?project=example&view=board`
5. Open `/beads?project=example&view=focus`
6. Open `/beads?project=example&view=graph`
7. Open `/beads/example/ex-e3`
8. Set the window width to 1024 px
9. Open `/beads?project=example&view=list`
10. Open `/beads?project=example&view=board`
11. Open `/beads?project=example&view=focus`
12. Open `/beads?project=example&view=graph`
13. Open `/beads/example/ex-e3`
14. Set the window width to 1440 px
15. Open `/beads?project=example&view=list`
16. Open `/beads?project=example&view=board`
17. Open `/beads?project=example&view=focus`
18. Open `/beads?project=example&view=graph`
19. Open `/beads/example/ex-e3`
20. Set the window width to 1920 px
21. Open `/beads?project=example&view=list`
22. Open `/beads?project=example&view=board`
23. Open `/beads?project=example&view=focus`
24. Open `/beads?project=example&view=graph`
25. Open `/beads/example/ex-e3`
26. Set the theme to dark
27. Set the window width to 390 px
28. Open `/beads?project=example&view=list`
29. Open `/beads?project=example&view=board`
30. Open `/beads?project=example&view=focus`
31. Open `/beads?project=example&view=graph`
32. Open `/beads/example/ex-e3`
33. Set the window width to 1024 px
34. Open `/beads?project=example&view=list`
35. Open `/beads?project=example&view=board`
36. Open `/beads?project=example&view=focus`
37. Open `/beads?project=example&view=graph`
38. Open `/beads/example/ex-e3`
39. Set the window width to 1440 px
40. Open `/beads?project=example&view=list`
41. Open `/beads?project=example&view=board`
42. Open `/beads?project=example&view=focus`
43. Open `/beads?project=example&view=graph`
44. Open `/beads/example/ex-e3`
45. Set the window width to 1920 px
46. Open `/beads?project=example&view=list`
47. Open `/beads?project=example&view=board`
48. Open `/beads?project=example&view=focus`
49. Open `/beads?project=example&view=graph`
50. Open `/beads/example/ex-e3`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
