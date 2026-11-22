# TC-UI-153: No overlapping text on Beads pages

- **REQ:** REQ-UI-110@adc61666
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
7. Open `/beads?project=example&view=lanes&scope=ex-e12`
8. Open `/beads/example/ex-e3`
9. Set the window width to 1024 px
10. Open `/beads?project=example&view=list`
11. Open `/beads?project=example&view=board`
12. Open `/beads?project=example&view=focus`
13. Open `/beads?project=example&view=graph`
14. Open `/beads?project=example&view=lanes&scope=ex-e12`
15. Open `/beads/example/ex-e3`
16. Set the window width to 1440 px
17. Open `/beads?project=example&view=list`
18. Open `/beads?project=example&view=board`
19. Open `/beads?project=example&view=focus`
20. Open `/beads?project=example&view=graph`
21. Open `/beads?project=example&view=lanes&scope=ex-e12`
22. Open `/beads/example/ex-e3`
23. Set the window width to 1920 px
24. Open `/beads?project=example&view=list`
25. Open `/beads?project=example&view=board`
26. Open `/beads?project=example&view=focus`
27. Open `/beads?project=example&view=graph`
28. Open `/beads?project=example&view=lanes&scope=ex-e12`
29. Open `/beads/example/ex-e3`
30. Set the theme to dark
31. Set the window width to 390 px
32. Open `/beads?project=example&view=list`
33. Open `/beads?project=example&view=board`
34. Open `/beads?project=example&view=focus`
35. Open `/beads?project=example&view=graph`
36. Open `/beads?project=example&view=lanes&scope=ex-e12`
37. Open `/beads/example/ex-e3`
38. Set the window width to 1024 px
39. Open `/beads?project=example&view=list`
40. Open `/beads?project=example&view=board`
41. Open `/beads?project=example&view=focus`
42. Open `/beads?project=example&view=graph`
43. Open `/beads?project=example&view=lanes&scope=ex-e12`
44. Open `/beads/example/ex-e3`
45. Set the window width to 1440 px
46. Open `/beads?project=example&view=list`
47. Open `/beads?project=example&view=board`
48. Open `/beads?project=example&view=focus`
49. Open `/beads?project=example&view=graph`
50. Open `/beads?project=example&view=lanes&scope=ex-e12`
51. Open `/beads/example/ex-e3`
52. Set the window width to 1920 px
53. Open `/beads?project=example&view=list`
54. Open `/beads?project=example&view=board`
55. Open `/beads?project=example&view=focus`
56. Open `/beads?project=example&view=graph`
57. Open `/beads?project=example&view=lanes&scope=ex-e12`
58. Open `/beads/example/ex-e3`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
