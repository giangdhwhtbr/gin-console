# TC-QA-052: Old gin-qa on the Trends tab only

- **REQ:** REQ-QA-019@f6b58234
- **Priority:** medium

**Preconditions:**
- A gin-qa without the `runs` command whose case export works

**Steps:**
1. Open `/tests?project=alpha&tab=trends`
2. Open the Cases tab

**Expected:**
- The Trends tab reads "This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa"
- The Cases tab shows the cases
