# TC-UI-147: Contrast

- **REQ:** REQ-UI-110@796f0bc7
- **Priority:** high

**Preconditions:**
- Project `alpha` has a kicked-off milestone with an id and a label

**Steps:**
1. Set the theme to light
2. Open `/reports?project=alpha&tab=team`
3. Open `/reports?project=alpha&tab=velocity`
4. Set the theme to dark
5. Open `/reports?project=alpha&tab=team`
6. Open `/reports?project=alpha&tab=velocity`

**Expected:**
- On both tabs in both themes, every milestone id and label has a contrast of at least 4.5:1 with its background
