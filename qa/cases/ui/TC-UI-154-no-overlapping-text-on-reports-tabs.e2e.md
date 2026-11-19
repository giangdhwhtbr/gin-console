# TC-UI-154: No overlapping text on Reports tabs

- **REQ:** REQ-UI-110@796f0bc7
- **Priority:** medium

**Preconditions:**
- The example project is shown

**Steps:**
1. Set the theme to light
2. Set the window width to 390 px
3. Open `/reports?project=example&tab=team`
4. Open `/reports?project=example&tab=delivery`
5. Open `/reports?project=example&tab=velocity`
6. Open `/reports?project=example&tab=usage`
7. Open `/reports?project=example&tab=quality`
8. Open `/reports?project=example&tab=coverage`
9. Set the window width to 1024 px
10. Open `/reports?project=example&tab=team`
11. Open `/reports?project=example&tab=delivery`
12. Open `/reports?project=example&tab=velocity`
13. Open `/reports?project=example&tab=usage`
14. Open `/reports?project=example&tab=quality`
15. Open `/reports?project=example&tab=coverage`
16. Set the window width to 1440 px
17. Open `/reports?project=example&tab=team`
18. Open `/reports?project=example&tab=delivery`
19. Open `/reports?project=example&tab=velocity`
20. Open `/reports?project=example&tab=usage`
21. Open `/reports?project=example&tab=quality`
22. Open `/reports?project=example&tab=coverage`
23. Set the window width to 1920 px
24. Open `/reports?project=example&tab=team`
25. Open `/reports?project=example&tab=delivery`
26. Open `/reports?project=example&tab=velocity`
27. Open `/reports?project=example&tab=usage`
28. Open `/reports?project=example&tab=quality`
29. Open `/reports?project=example&tab=coverage`
30. Set the theme to dark
31. Set the window width to 390 px
32. Open `/reports?project=example&tab=team`
33. Open `/reports?project=example&tab=delivery`
34. Open `/reports?project=example&tab=velocity`
35. Open `/reports?project=example&tab=usage`
36. Open `/reports?project=example&tab=quality`
37. Open `/reports?project=example&tab=coverage`
38. Set the window width to 1024 px
39. Open `/reports?project=example&tab=team`
40. Open `/reports?project=example&tab=delivery`
41. Open `/reports?project=example&tab=velocity`
42. Open `/reports?project=example&tab=usage`
43. Open `/reports?project=example&tab=quality`
44. Open `/reports?project=example&tab=coverage`
45. Set the window width to 1440 px
46. Open `/reports?project=example&tab=team`
47. Open `/reports?project=example&tab=delivery`
48. Open `/reports?project=example&tab=velocity`
49. Open `/reports?project=example&tab=usage`
50. Open `/reports?project=example&tab=quality`
51. Open `/reports?project=example&tab=coverage`
52. Set the window width to 1920 px
53. Open `/reports?project=example&tab=team`
54. Open `/reports?project=example&tab=delivery`
55. Open `/reports?project=example&tab=velocity`
56. Open `/reports?project=example&tab=usage`
57. Open `/reports?project=example&tab=quality`
58. Open `/reports?project=example&tab=coverage`

**Expected:**
- At every width and in both themes, no text overlaps other text or a bar, line or arrow it does not belong to
- No text spills out of its box without an ellipsis
