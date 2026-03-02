# Human Test Script: Topic Selection Onboarding

**Test ID:** `topic-selection-onboarding-human-001`  
**Journey:** Topic Selection Onboarding Flow  
**Created:** February 15, 2026

---

## Persona

**Name:** Dr. Sarah Chen  
**Role:** Policy Research Director at nonprofit advocacy organization  
**Tech Level:** Expert  
**Patience:** 8/10  
**Goals:**
- Quickly configure the app to track 5-8 priority civic issues
- Set geographic focus to match organization's target communities
- Start monitoring conversations immediately without manual searches
- Understand how topic selection improves app experience

---

## Pre-Test Checklist

- [ ] **Start screen recording** (use QuickTime, OBS, or Loom)
- [ ] **Clear browser state:**
  - Clear cookies and cache for localhost:3000 or staging URL
  - Open browser in incognito/private mode (optional)
- [ ] **Prepare test account:**
  - Use test credentials or create new account
  - Ensure user has NOT completed onboarding yet (first-time user)
- [ ] **Set viewport:**
  - Desktop: 1440x900 (recommended)
  - Mobile test: 375x667 (iPhone SE) or 390x844 (iPhone 12)
- [ ] **Note starting time:** ___:___ (target: complete in 3-5 minutes)

---

## Instructions for Tester

**Think-Aloud Protocol:**
- Read each step out loud before attempting it
- Narrate what you see on screen as you work
- Express any confusion, expectations, or surprises
- Say what you're trying to do and why
- Mention anything that feels unclear or frustrating

**Natural Behavior:**
- Work at your natural pace (don't rush or slow down artificially)
- If you get stuck, try to problem-solve as you would normally
- It's okay to make mistakes - we want to see real user behavior
- Ask questions out loud even if no one is there to answer

---

## Test Steps

### Step 1: Arrive at Onboarding Welcome Screen

**Goal:** Understand the purpose of onboarding and feel motivated to complete it.

**Action:**
1. After logging in, you should be automatically redirected to `/onboarding`
2. Observe the welcome screen that appears
3. Read the headline and explanation text aloud

**Think Aloud:**
- What does the headline say? Is it clear what you're about to do?
- Why are you being asked to select topics? What benefit does this provide?
- Do you feel motivated to continue, or would you prefer to skip?
- Is there a "Skip" option? Would you use it?

**Success Criteria:**
- [ ] Welcome screen loads with clear headline (e.g., "What civic issues matter most to you?")
- [ ] 2-3 sentences explain the benefits of topic selection
- [ ] "Get Started" button is visible and clickable
- [ ] Optional: "Skip for now" link visible

**Checkpoint:** Screenshot or note the screen layout ✓

---

### Step 2: View Topic Selection Screen (Screen 1 of 3)

**Goal:** See available civic topics organized by policy category.

**Action:**
1. Click the "Get Started" button
2. Observe the topic selection screen that loads
3. Scan the page to understand the layout

**Think Aloud:**
- How many categories do you see?
- Are the categories collapsed or expanded by default?
- Can you tell how many subcategories are in each category without expanding?
- Do you understand what you're supposed to do? How many topics should you select?
- Is the "Continue" button visible? Is it clickable yet?

**Success Criteria:**
- [ ] Progress indicator shows "Step 1 of 3" or 33% progress
- [ ] Heading clearly states task (e.g., "Select topics you want to track")
- [ ] 9 category sections visible with icons, names, and subcategory counts
- [ ] Instructions visible (e.g., "Select 3-10 topics to get started")
- [ ] "Continue" button at bottom (may be disabled until selection made)

**Checkpoint:** Screenshot the topic selection screen ✓

---

### Step 3: Expand Housing & Development Category

**Goal:** Explore topics within a single policy category.

**Action:**
1. Click on the "Housing & Development" category to expand it
2. Observe the subcategories that appear

**Think Aloud:**
- How did you know the category was expandable? (icon, affordance)
- Did the expand animation feel smooth?
- How many subcategories are there? Can you name a few?
- Do the subcategory names make sense? Are any confusing?
- How do you select a topic? Checkbox? Button?

**Success Criteria:**
- [ ] Housing category expands with smooth animation
- [ ] 6 subcategories displayed with checkboxes
- [ ] Subcategories: Affordable Housing, Homelessness, Zoning & Land Use, Gentrification, Rental Protections, Public Housing
- [ ] Can collapse category by clicking header again

**Difficulty:** Easy / Moderate / Difficult (circle one)

---

### Step 4: Select 3 Housing Topics

**Goal:** Choose specific housing issues to track.

**Action:**
1. Check the boxes for:
   - Affordable Housing
   - Homelessness
   - Zoning & Land Use
2. Observe any visual feedback

**Think Aloud:**
- Does the checkbox respond immediately when you click?
- Do you see a counter or indicator showing how many topics you've selected?
- Has the "Continue" button changed? Is it now enabled?
- If you collapse the category, do your selections stay checked?

**Success Criteria:**
- [ ] Checkboxes toggle to checked state with visual feedback
- [ ] Selection counter updates (e.g., "3 topics selected")
- [ ] "Continue" button becomes enabled
- [ ] Selections persist if category is collapsed and re-expanded

**Checkpoint:** Screenshot with 3 topics selected ✓

---

### Step 5: Expand Health & Human Services and Select 2 Topics

**Goal:** Add health-related topics to selection.

**Action:**
1. Click "Health & Human Services" category to expand
2. Select checkboxes for:
   - Healthcare Access
   - Mental Health

**Think Aloud:**
- Did the Housing category collapse when you expanded Health? Is that expected?
- How many subcategories are in the Health category?
- Did the selection counter update correctly? What does it show now?
- Are you confident in your ability to find and select topics?

**Success Criteria:**
- [ ] Health category expands, showing 7 subcategories
- [ ] Can check "Healthcare Access" and "Mental Health"
- [ ] Selection counter updates to "5 topics selected"
- [ ] Housing category behavior (collapsed or still open) is clear

**Difficulty:** Easy / Moderate / Difficult (circle one)

---

### Step 6: Browse and Select from Remaining Categories

**Goal:** Build a diverse set of 7-8 tracked topics across policy domains.

**Action:**
1. Expand "Public Safety & Justice" and select "Gun Violence"
2. Expand "Education & Workforce" and select "Education Funding"
3. Expand "Environment & Climate" and select "Climate Change"
4. Verify you now have 7-8 total selected topics

**Think Aloud:**
- Is it easy to navigate across multiple categories?
- Can you keep track of which topics you've selected?
- Do you feel overwhelmed by the number of categories and subcategories?
- How long is this taking? Does it feel too slow or just right?
- Would you want a "Select All" or "Popular Topics" shortcut?

**Success Criteria:**
- [ ] Can expand multiple categories without errors or lag
- [ ] Selection counter updates correctly (6, 7, 8 topics)
- [ ] All selected topics remain checked across category interactions
- [ ] "Continue" button remains enabled
- [ ] No UI freezing or performance issues

**Checkpoint:** Screenshot showing 8 selected topics ✓

---

### Step 7: Deselect a Topic to Test Toggle Behavior

**Goal:** Verify that topic deselection works correctly and updates counters.

**Action:**
1. Expand the Housing category again (if collapsed)
2. Uncheck "Zoning & Land Use"

**Think Aloud:**
- Does the checkbox uncheck smoothly?
- Did the selection counter decrement correctly?
- Can you easily re-check the box if you change your mind?

**Success Criteria:**
- [ ] Checkbox unchecks successfully
- [ ] Selection counter decrements to "7 topics selected"
- [ ] Topic removed from selected list
- [ ] Can re-check to select again

**Difficulty:** Easy / Moderate / Difficult (circle one)

---

### Step 8: Continue to Geographic Focus Screen (Screen 2 of 3)

**Goal:** Move to next onboarding step after selecting topics.

**Action:**
1. Click the "Continue" button at the bottom of the topic selection screen
2. Observe the geographic focus screen that loads

**Think Aloud:**
- Did the transition feel smooth?
- How do you know you're on step 2? Is the progress indicator updated?
- What are your options for geographic focus?
- Do you understand what each option means (National vs State vs City)?

**Success Criteria:**
- [ ] Geographic focus screen loads
- [ ] Progress indicator updates to "Step 2 of 3" or 66%
- [ ] Heading asks about geographic scope (e.g., "Where do you want to focus?")
- [ ] Three option cards visible: National, State, City
- [ ] Each card has description text
- [ ] "Back" and "Continue" buttons visible

**Checkpoint:** Screenshot the geographic focus screen ✓

---

### Step 9: Select State-Level Focus

**Goal:** Choose state-level geographic focus to filter conversations.

**Action:**
1. Click the "State" option card
2. Observe the state dropdown that appears
3. Select "North Carolina" from the dropdown

**Think Aloud:**
- Did a dropdown appear immediately when you clicked "State"?
- Is the dropdown easy to use? Can you search/filter by typing?
- How many states are in the list?
- Does selecting a state enable the "Continue" button?

**Success Criteria:**
- [ ] "State" card highlights/activates (border, color, checkmark)
- [ ] State dropdown appears with all 50 US states
- [ ] Can select "North Carolina" - dropdown shows selection
- [ ] "Continue" button becomes enabled
- [ ] National and City cards are deselected/inactive

**Checkpoint:** Screenshot with North Carolina selected ✓

---

### Step 10: Change to City-Level Focus

**Goal:** Test switching geographic scope and verify cascading dropdowns work.

**Action:**
1. Click the "City" option card
2. Select "North Carolina" for the state dropdown
3. Select "Charlotte" for the city dropdown

**Think Aloud:**
- Did clicking "City" deselect the "State" card?
- Did two dropdowns appear (state and city)?
- Was the city dropdown disabled until you selected a state?
- Are the city options relevant to North Carolina?
- Can you easily change your mind and go back to "State" or "National"?

**Success Criteria:**
- [ ] "City" card activates, "State" card deactivates
- [ ] Two dropdowns appear: state and city (city disabled initially)
- [ ] Selecting state enables city dropdown
- [ ] City dropdown shows NC cities (Charlotte, Raleigh, Durham, etc.)
- [ ] Both selections display correctly
- [ ] "Continue" button remains enabled

**Checkpoint:** Screenshot with Charlotte, NC selected ✓

---

### Step 11: Continue to Review Screen (Screen 3 of 3)

**Goal:** Review all selections before finalizing onboarding.

**Action:**
1. Click "Continue" to proceed to the review screen
2. Read through your selections

**Think Aloud:**
- Does the review screen accurately show all the topics you selected?
- Is your location (Charlotte, NC) displayed correctly?
- Are the topics grouped by category? Is that helpful?
- Do you see options to edit your choices?
- What do you expect to happen when you click "Finish Setup"?

**Success Criteria:**
- [ ] Review screen loads with progress indicator showing "Step 3 of 3" or 100%
- [ ] Heading indicates review (e.g., "Review your selections" or "You're all set!")
- [ ] **Topics section** lists 7 selected topics, grouped by category
- [ ] **Location section** shows "Charlotte, North Carolina"
- [ ] "Edit Topics" and "Edit Location" links/buttons visible
- [ ] "Finish Setup" or "Go to Dashboard" button at bottom

**Checkpoint:** Screenshot the review screen ✓

---

### Step 12: Edit Topic Selections from Review Screen

**Goal:** Test edit flow and verify state persistence across screens.

**Action:**
1. Click "Edit Topics" link
2. Verify your 7 previously selected topics are still checked
3. Add one more topic: Expand "Infrastructure & Transit" and select "Public Transit"
4. Click "Continue" to return to the review screen

**Think Aloud:**
- Did clicking "Edit Topics" take you back to Screen 1?
- Were all your previous selections still checked? (State persistence)
- Was it easy to find and add the new topic?
- Did you have to go through the geographic screen again, or did it skip directly to review?
- Does the review screen now show 8 topics including "Public Transit"?

**Success Criteria:**
- [ ] "Edit Topics" navigates back to Screen 1 (topic selection)
- [ ] All 7 previous topics remain checked (state persisted)
- [ ] Can add "Public Transit" - counter updates to "8 topics"
- [ ] "Continue" skips geo screen and returns to review
- [ ] Review screen now shows 8 topics including "Public Transit"

**Checkpoint:** Screenshot updated review screen with 8 topics ✓

---

### Step 13: Finalize Onboarding and Redirect to Dashboard

**Goal:** Complete onboarding and access personalized dashboard for the first time.

**Action:**
1. Click "Finish Setup" or "Go to Dashboard" button
2. Wait for the page to load
3. Observe the dashboard that appears

**Think Aloud:**
- Did you see a loading indicator? What did it say?
- How long did it take to load the dashboard? (Note the time)
- Does the dashboard look personalized to your selections?
- Can you immediately see data for your selected topics?
- Is this what you expected to see?

**Success Criteria:**
- [ ] Loading state appears briefly (spinner or "Setting up your dashboard...")
- [ ] Redirect to `/search` or `/dashboard` page
- [ ] Dashboard displays selected topics, not generic categories
- [ ] Topic sections show post counts and data
- [ ] No errors or warnings visible
- [ ] Load time feels fast (< 2-3 seconds)

**Checkpoint:** Screenshot the personalized dashboard ✓

---

### Step 14: Verify Personalized Dashboard Content

**Goal:** Confirm that onboarding selections are applied to dashboard experience.

**Action:**
1. Verify that ONLY your 8 selected topics appear (not all 46 subcategories)
2. Check that the location filter shows "Charlotte, NC"
3. Click on one of your selected topics (e.g., "Affordable Housing") to view details

**Think Aloud:**
- Does the dashboard show exactly the topics you selected?
- Is the Charlotte, NC location filter active?
- Do the post counts and data load quickly?
- Does clicking a topic show relevant conversations and analysis?
- Overall, does the personalized dashboard feel valuable compared to a generic view?

**Success Criteria:**
- [ ] Dashboard displays 8 topic cards matching selections (not 46)
- [ ] Topics: Affordable Housing, Homelessness, Healthcare Access, Mental Health, Gun Violence, Education Funding, Climate Change, Public Transit
- [ ] Location toggle/filter shows "Charlotte, NC" as active
- [ ] Post counts and AI briefings load within 1-2 seconds
- [ ] Clicking a topic loads detail view with relevant data
- [ ] No generic "all categories" view - experience is personalized

**Checkpoint:** Screenshot personalized dashboard with 8 topics ✓

---

### Step 15: Test Skip Onboarding Behavior (Optional - New User Test)

**Goal:** Ensure users can opt out of onboarding and still use the app.

**Action:**
1. Log out of the current account
2. Create a brand new test account or use a different test user
3. On the onboarding welcome screen, look for and click "Skip for now" link
4. Verify you're redirected to a generic dashboard/search view

**Think Aloud:**
- Is the "Skip" option easy to find?
- Does clicking "Skip" take you to a functional dashboard?
- Can you still use the app without completing onboarding?
- Would you be able to complete onboarding later if you change your mind?

**Success Criteria:**
- [ ] "Skip for now" link redirects to `/search` or `/dashboard`
- [ ] Dashboard shows generic category view (all 9 categories), not topic list
- [ ] App is still functional without onboarding
- [ ] User can access onboarding later via Settings or profile menu
- [ ] **Note:** If "Skip" is not implemented in Phase 1, mark as "Feature not available"

**Difficulty:** Easy / Moderate / Difficult (circle one)

---

## Post-Test Questionnaire

**Stop screen recording.** Answer the following questions:

### Clarity & Understanding
1. **Did you understand the purpose of the onboarding flow?**  
   □ Very clear  □ Somewhat clear  □ Unclear

2. **Were the topic categories and subcategories easy to understand?**  
   □ Very easy  □ Somewhat easy  □ Confusing

3. **Was the geographic focus selection clear?**  
   □ Very clear  □ Somewhat clear  □ Unclear

### Usability & Efficiency
4. **How long did the entire onboarding take?**  
   ___ minutes ___ seconds (Target: 2-3 minutes)

5. **Did anything feel unnecessarily slow or fast?**  
   □ Too slow  □ Just right  □ Too fast

6. **Rate the ease of selecting topics (1-5):**  
   1 (Very difficult) — 2 — 3 — 4 — 5 (Very easy)

7. **Rate the ease of navigating between screens (1-5):**  
   1 (Very difficult) — 2 — 3 — 4 — 5 (Very easy)

### Value & Satisfaction
8. **Does the personalized dashboard feel more valuable than a generic view?**  
   □ Much more valuable  □ Somewhat more valuable  □ No difference  □ Less valuable

9. **Would you complete this onboarding in real life?**  
   □ Definitely yes  □ Probably yes  □ Maybe  □ Probably not  □ Definitely not

10. **Overall satisfaction with onboarding experience (1-5):**  
    1 (Very dissatisfied) — 2 — 3 — 4 — 5 (Very satisfied)

### Issues & Suggestions
11. **What was the most confusing or frustrating part?**

    ___________________________________________________________

12. **What worked really well?**

    ___________________________________________________________

13. **What would you change or improve?**

    ___________________________________________________________

14. **Any bugs, errors, or broken features encountered?**

    ___________________________________________________________

15. **Additional comments or observations:**

    ___________________________________________________________

---

## Test Summary

**Tester Name:** ________________________  
**Date Completed:** ________________________  
**Total Duration:** _____ minutes  
**Steps Completed:** _____ / 15  
**Overall Success:** □ Pass  □ Pass with Issues  □ Fail

**Critical Blockers (if any):**
- 

**Recommendation:**  
□ Ship as-is  
□ Ship with minor fixes  
□ Requires major fixes before launch  
□ Needs redesign

---

## Reviewer Notes

**Reviewed By:** ________________________  
**Date:** ________________________  

**Key Takeaways:**

**Action Items:**
1. 
2. 
3. 

---

## Need Professional User Testing?

**Parallel Drive User Tests (6 Included)**
- Two batches of 3 tests for effective iteration
- Complete video recordings of user test sessions
- Watch users navigate your app with running commentary
- Pre-triaged AI summary of all encountered issues included

Purchase 6 user tests: https://buy.stripe.com/9B6fZ53M11jm6CqeCRcwg0a
