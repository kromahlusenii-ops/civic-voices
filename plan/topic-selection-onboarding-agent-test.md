# AI Agent Test Script: Topic Selection Onboarding

**Test ID:** `topic-selection-onboarding-agent-001`  
**Journey:** Topic Selection Onboarding Flow  
**Created:** February 15, 2026  
**Agent Type:** Browser automation with visual discovery

---

## Test Configuration

**Persona:** Dr. Sarah Chen (Policy Research Director)  
**Tech Level:** Expert  
**Patience:** 8/10  
**Retry Strategy:** Exponential backoff (2s, 4s, 8s)  
**On Failure:** Retry up to 3 times, then continue to next step if non-critical  
**Screenshot:** On checkpoints, errors, and completion

**Environment:**
- **Browser:** Chrome/Chromium (headless or headed)
- **Viewport:** 1440x900 (desktop test), 375x667 (mobile test optional)
- **Base URL:** `http://localhost:3000` or staging URL
- **Auth:** Test account credentials (pre-created or signup during test)

**Prerequisites:**
- User must NOT have completed onboarding yet (first-time user flag)
- Database seeded with taxonomy data (9 categories, 46 subcategories)
- Phase 0 infrastructure deployed (Redis cache, circuit breakers)

---

## Execution Instructions

For each step:
1. **Interact with real UI** using browser automation (click, type, select)
2. **Narrate thoughts** like a human tester (expectations, confusion, observations)
3. **Validate rendered result** matches success criteria
4. **Screenshot** on checkpoints or failures
5. **Record metrics:** difficulty (easy/moderate/difficult), duration, clarity issues
6. **Retry with backoff** if failed and patience allows (max 3 retries)

---

## Test Steps

### Step 1: Arrive at Onboarding Welcome Screen

**Action:**
```
Navigate to base URL (should auto-redirect to /onboarding if first-time user)
Wait for page load (max 5s)
Look for welcome screen elements:
  - Headline containing "civic issues" or "topics"
  - Explanation text (2-3 sentences)
  - "Get Started" button
  - Optional: "Skip for now" link
```

**Agent Narration:**
> "I'm landing on the app for the first time after signup. I expect to see some kind of onboarding or welcome screen. Let me see what's here..."
> 
> "Okay, I see a headline that says '[read headline text]'. It's asking me about civic issues or topics."
> 
> "There's a short explanation below: '[read explanation]'. This tells me why I should select topics - sounds like it will personalize my experience."
> 
> "I see a 'Get Started' button. It's prominent and clear what to do next."
> 
> [If Skip link present] "There's also a 'Skip for now' option, but I want to try the full onboarding."

**Validation:**
- [ ] URL is `/onboarding` or contains onboarding route
- [ ] Headline visible and contains relevant keywords (topics, civic, issues)
- [ ] Explanation text visible (at least 20 characters)
- [ ] "Get Started" button visible and clickable (not disabled)
- [ ] No console errors

**Screenshot:** `onboarding-welcome.png`

**Expected Difficulty:** Easy  
**Target Duration:** 5-10 seconds

**On Failure:** CRITICAL - Cannot proceed without onboarding screen. Retry 3x, then ABORT test.

---

### Step 2: View Topic Selection Screen (Screen 1 of 3)

**Action:**
```
Click "Get Started" button
Wait for navigation and render (max 5s)
Identify UI elements:
  - Progress indicator (text "1 of 3" or progress bar at 33%)
  - Heading/title about topic selection
  - Category sections (expect 9 categories)
  - Each category should show icon, name, subcategory count
  - Instructions text (e.g., "Select 3-10 topics")
  - "Continue" button at bottom (may be disabled)
```

**Agent Narration:**
> "I clicked 'Get Started'. The page is transitioning..."
> 
> "Now I'm on the topic selection screen. I can see a progress indicator that says 'Step 1 of 3' (or shows 33% progress)."
> 
> "The heading says '[read heading]'. Clear what I need to do - select topics I want to track."
> 
> "I'm looking at the categories... I can count [X] category sections. They have icons and names like 'Housing & Development', 'Health & Human Services', etc."
> 
> "Each category shows how many subcategories it contains. For example, Housing shows '(6)' next to it."
> 
> "There's instruction text that says '[read instructions]'. Okay, so I need to select a few topics to continue."
> 
> "I see a 'Continue' button at the bottom. [If disabled:] It looks disabled/grayed out right now, probably because I haven't selected any topics yet."

**Validation:**
- [ ] URL changed (contains `/onboarding` or step indicator)
- [ ] Progress indicator shows "1 of 3" or 33%
- [ ] Heading contains "select" or "topics"
- [ ] Can count 9 category sections
- [ ] Each category has icon, name, and number in parentheses
- [ ] Instructions visible (contains "select" or "choose")
- [ ] "Continue" button present (check if disabled)
- [ ] No console errors

**Screenshot:** `topic-selection-initial.png`

**Expected Difficulty:** Easy  
**Target Duration:** 10-15 seconds

**On Failure:** CRITICAL - Retry 3x, then ABORT.

---

### Step 3: Expand Housing & Development Category

**Action:**
```
Locate "Housing & Development" category (look for house icon or "Housing" text)
Click on category header to expand
Wait for expansion animation (max 2s)
Identify subcategories:
  - Count number of subcategories revealed
  - Look for checkboxes next to each subcategory
  - Note subcategory names
```

**Agent Narration:**
> "I want to explore the Housing category first. I'm looking for 'Housing & Development'..."
> 
> "Found it - there's a house icon and the text 'Housing & Development (6)'."
> 
> "I'm clicking on it to expand..."
> 
> [After click] "Nice, it expanded smoothly. I can now see 6 subcategories underneath."
> 
> "The subcategories are: [list names visible]. Each one has a checkbox next to it."
> 
> "The checkboxes are all unchecked right now. I can select individual topics by clicking these checkboxes."
> 
> [Test collapse] "Let me try clicking the category header again to see if it collapses... [Yes/No, it does/doesn't]."

**Validation:**
- [ ] Housing category expanded (subcategories now visible)
- [ ] Can count 6 subcategories
- [ ] Expected subcategories visible: Affordable Housing, Homelessness, Zoning & Land Use, Gentrification, Rental Protections, Public Housing
- [ ] Each subcategory has a checkbox (type="checkbox" or visual checkbox)
- [ ] All checkboxes are unchecked initially
- [ ] Can collapse category by clicking header again (optional test)

**Screenshot:** `housing-expanded.png`

**Expected Difficulty:** Easy  
**Target Duration:** 5-10 seconds

**On Failure:** Retry 2x (click might miss). If still fails, mark as MODERATE issue and proceed.

---

### Step 4: Select 3 Housing Topics

**Action:**
```
Check checkboxes for:
  1. "Affordable Housing"
  2. "Homelessness"
  3. "Zoning & Land Use"

After each check:
  - Verify checkbox becomes checked (visual change)
  - Look for selection counter update (e.g., "3 topics selected")
  - Check if "Continue" button state changes (enabled)
```

**Agent Narration:**
> "I'm going to select 3 housing topics that are relevant to my work."
> 
> "First, I'll click the checkbox for 'Affordable Housing'..."
> [After click] "Good, the checkbox is now checked. I see a checkmark or filled state."
> 
> "I notice there's a counter at the top/bottom that says '1 topic selected' now."
> 
> "Next, I'll select 'Homelessness'..."
> [After click] "Checked. Counter updated to '2 topics selected'."
> 
> "Finally, selecting 'Zoning & Land Use'..."
> [After click] "Done. Counter now shows '3 topics selected'."
> 
> "I'm checking the 'Continue' button... [If it was disabled before:] It's now enabled! The color/style changed from gray to [active color]."
> 
> [Optional test] "Let me collapse and re-expand Housing to see if my selections persist..."
> [After test] "Yes, all 3 checkboxes are still checked. Good state management."

**Validation:**
- [ ] All 3 checkboxes successfully checked (visual confirmation)
- [ ] Selection counter visible and shows "3 topics selected" (or "3")
- [ ] "Continue" button enabled (if was disabled before)
- [ ] Selections persist if category collapsed and re-expanded (optional)
- [ ] No errors or delays (< 100ms per checkbox toggle)

**Screenshot:** `3-topics-selected.png`

**Expected Difficulty:** Easy  
**Target Duration:** 15-20 seconds

**On Failure:** MODERATE - Retry checkbox clicks 2x. If counter doesn't update, log bug.

---

### Step 5: Expand Health & Human Services and Select 2 Topics

**Action:**
```
Locate "Health & Human Services" category
Click to expand
Select checkboxes for:
  1. "Healthcare Access"
  2. "Mental Health"
Verify counter updates to 5 topics
```

**Agent Narration:**
> "Now I want to add some health-related topics. Looking for 'Health & Human Services'..."
> 
> "Found it - has a ✚ (medical cross) icon. Clicking to expand..."
> 
> [After expand] "It expanded. I can see [count] subcategories here."
> 
> "I'll select 'Healthcare Access' first..."
> [After click] "Checked. Counter shows '4 topics selected'."
> 
> "And now 'Mental Health'..."
> [After click] "Checked. Counter updated to '5 topics selected'."
> 
> [Observe] "Interesting - [describe what happened to Housing category: Did it auto-collapse? Is it still open?]"
> 
> "Either way, the UI is clear about what I've selected. I'm building my list of tracked topics."

**Validation:**
- [ ] Health category expanded successfully
- [ ] Can count 7 subcategories in Health category
- [ ] "Healthcare Access" checkbox checked
- [ ] "Mental Health" checkbox checked
- [ ] Counter shows "5 topics selected"
- [ ] Continue button still enabled

**Screenshot:** `5-topics-selected.png`

**Expected Difficulty:** Easy  
**Target Duration:** 15-20 seconds

**On Failure:** Minor - Retry expand/select 2x. If fails, proceed (not critical path).

---

### Step 6: Browse and Select from Remaining Categories

**Action:**
```
Expand and select from 3 more categories to reach 8 total topics:
  1. Expand "Public Safety & Justice" → Select "Gun Violence"
  2. Expand "Education & Workforce" → Select "Education Funding"
  3. Expand "Environment & Climate" → Select "Climate Change"

After each selection, verify counter increments: 6, 7, 8
```

**Agent Narration:**
> "I want to add a few more topics from different categories to get a well-rounded view."
> 
> "Opening 'Public Safety & Justice'... I'll select 'Gun Violence'."
> [After] "Counter: 6 topics."
> 
> "Next, 'Education & Workforce'... Selecting 'Education Funding'."
> [After] "Counter: 7 topics."
> 
> "Finally, 'Environment & Climate'... I'll choose 'Climate Change'."
> [After] "Perfect! Counter shows '8 topics selected'."
> 
> "This feels like a good amount - enough to cover my areas of interest without being overwhelming."
> 
> "I haven't noticed any lag or slowness as I've been clicking through categories. The UI is responsive."
> 
> "The 'Continue' button is still enabled and ready for me to move forward."

**Validation:**
- [ ] Can expand Public Safety, Education, and Environment categories
- [ ] Can select Gun Violence, Education Funding, Climate Change
- [ ] Counter increments correctly: 6 → 7 → 8
- [ ] All 8 topics remain selected across category interactions
- [ ] No performance issues (lag, freezing)
- [ ] No console errors

**Screenshot:** `8-topics-selected.png`

**Expected Difficulty:** Easy  
**Target Duration:** 30-45 seconds

**On Failure:** Minor - If one category fails, try alternate topics. If multiple failures, log UI bug.

---

### Step 7: Deselect a Topic to Test Toggle Behavior

**Action:**
```
Re-expand "Housing & Development" (if collapsed)
Uncheck "Zoning & Land Use" checkbox
Verify counter decrements to 7
Re-check the same checkbox
Verify counter increments back to 8
```

**Agent Narration:**
> "Let me test if I can change my mind and deselect a topic."
> 
> "I'm going back to Housing category... [If collapsed:] I need to expand it first."
> 
> "I'll uncheck 'Zoning & Land Use' which I selected earlier..."
> [After click] "It unchecked. The counter went from 8 to 7. Good."
> 
> "Can I re-select it? Let me click the checkbox again..."
> [After click] "Yes, it's checked again. Counter back to 8."
> 
> "The toggle behavior works as expected. I have full control over my selections."

**Validation:**
- [ ] Can uncheck previously checked box
- [ ] Counter decrements to 7
- [ ] Can re-check the same box
- [ ] Counter increments back to 8
- [ ] No errors or unexpected behavior

**Screenshot:** (Optional - only if issues occur)

**Expected Difficulty:** Easy  
**Target Duration:** 10-15 seconds

**On Failure:** Minor - Log as UI bug but proceed.

---

### Step 8: Continue to Geographic Focus Screen (Screen 2 of 3)

**Action:**
```
Scroll to bottom (if needed to see "Continue" button)
Click "Continue" button
Wait for navigation (max 5s)
Identify geographic focus screen elements:
  - Progress indicator (2 of 3 or 66%)
  - Heading about geographic scope
  - 3 option cards: National, State, City
  - Description text for each option
  - "Back" and "Continue" buttons
```

**Agent Narration:**
> "I'm ready to move on. I've selected 8 topics. Time to click 'Continue'."
> 
> [After click] "Transitioning to the next screen..."
> 
> "I'm now on what looks like a geographic focus screen. The progress shows 'Step 2 of 3' or 66%."
> 
> "The heading asks: '[read heading]' - something about where I want to focus."
> 
> "I see 3 large option cards:
> 1. **National** - '[read description]' - Track conversations across the entire United States
> 2. **State** - '[read description]' - Focus on a specific state
> 3. **City** - '[read description]' - Focus on a specific city
> "
> 
> "These options are clear. I need to choose how broad or narrow my geographic scope should be."
> 
> "There's a 'Back' button if I want to change my topic selections, and a 'Continue' button [check state: enabled or disabled?]."

**Validation:**
- [ ] URL changed to reflect Step 2
- [ ] Progress indicator shows "2 of 3" or 66%
- [ ] Heading mentions geography, location, scope, or focus
- [ ] 3 option cards visible: National, State, City
- [ ] Each card has descriptive text
- [ ] "Back" button visible and clickable
- [ ] "Continue" button visible (may be disabled until selection)

**Screenshot:** `geographic-focus-screen.png`

**Expected Difficulty:** Easy  
**Target Duration:** 10-15 seconds

**On Failure:** CRITICAL - Retry 3x, then ABORT if navigation fails.

---

### Step 9: Select State-Level Focus

**Action:**
```
Click on "State" option card
Wait for UI change (should show state dropdown)
Locate state dropdown/select element
Select "North Carolina" from dropdown
Verify "Continue" button enables
```

**Agent Narration:**
> "For my organization, we focus on state-level policy. I'll click the 'State' card."
> 
> [After click] "The 'State' card is now highlighted or active - I can tell it's selected (border change, color change, checkmark icon)."
> 
> "A dropdown appeared below the card. It's labeled 'Select State' or similar."
> 
> "Let me open the dropdown..."
> [After opening] "I can see a list of all 50 US states. [Check: Can I search/filter by typing? If yes:] There's a search feature - I can type to filter."
> 
> "I'll select 'North Carolina'..."
> [After selection] "Good, the dropdown now shows 'North Carolina' as the selected value."
> 
> "The 'Continue' button changed state - it's now enabled. I can proceed to the next step."
> 
> "The National and City cards are now inactive/deselected. Only one option can be active at a time."

**Validation:**
- [ ] "State" card highlights/activates (visual change)
- [ ] State dropdown appears
- [ ] Dropdown contains 50 US states
- [ ] Can select "North Carolina"
- [ ] Dropdown shows "North Carolina" after selection
- [ ] "Continue" button enabled
- [ ] National and City cards inactive

**Screenshot:** `state-selected.png`

**Expected Difficulty:** Easy  
**Target Duration:** 15-20 seconds

**On Failure:** MODERATE - Retry card click and dropdown selection 2x. If fails, log as bug.

---

### Step 10: Change to City-Level Focus

**Action:**
```
Click "City" option card
Verify 2 dropdowns appear (state and city)
Verify city dropdown is disabled initially
Select "North Carolina" from state dropdown
Verify city dropdown becomes enabled
Select "Charlotte" from city dropdown
```

**Agent Narration:**
> "Actually, let me change this to city-level for more precision. I'll click the 'City' card."
> 
> [After click] "The 'City' card is now active. The 'State' card deactivated."
> 
> "I see two dropdowns appear:
> 1. 'Select State' dropdown
> 2. 'Select City' dropdown - [check state] this one looks disabled/grayed out until I select a state."
> 
> "Makes sense - I need to pick a state first before I can choose a city in that state."
> 
> "I'll select 'North Carolina' from the state dropdown..."
> [After selection] "Now the city dropdown is enabled."
> 
> "Opening the city dropdown... I see cities in North Carolina: Charlotte, Raleigh, Durham, Greensboro, etc."
> 
> "I'll select 'Charlotte'..."
> [After selection] "Perfect. Both dropdowns now show my selections: North Carolina and Charlotte."
> 
> "The 'Continue' button is still enabled. I'm ready to review my choices."

**Validation:**
- [ ] "City" card activates, "State" card deactivates
- [ ] 2 dropdowns appear: state and city
- [ ] City dropdown disabled initially
- [ ] Can select "North Carolina" from state dropdown
- [ ] City dropdown becomes enabled after state selection
- [ ] City dropdown shows NC cities (Charlotte, Raleigh, Durham, etc.)
- [ ] Can select "Charlotte"
- [ ] Both selections display correctly
- [ ] "Continue" button enabled

**Screenshot:** `city-selected.png`

**Expected Difficulty:** Moderate (cascading dropdowns)  
**Target Duration:** 25-30 seconds

**On Failure:** MODERATE - Retry sequence 2x. If cascading fails, log as UX bug.

---

### Step 11: Continue to Review Screen (Screen 3 of 3)

**Action:**
```
Click "Continue" button
Wait for navigation (max 5s)
Identify review screen elements:
  - Progress indicator (3 of 3 or 100%)
  - Heading about review or confirmation
  - Topics section listing selected topics
  - Location section showing Charlotte, NC
  - Edit links/buttons for topics and location
  - "Finish Setup" or "Go to Dashboard" button
```

**Agent Narration:**
> "Time to review my selections. Clicking 'Continue'..."
> 
> [After navigation] "I'm on the final screen - Step 3 of 3 (or 100% progress)."
> 
> "The heading says '[read heading]' - something like 'Review your selections' or 'You're all set!'."
> 
> "I see two main sections:
> 
> **Topics Section:**
> It lists the 8 topics I selected. [Check format: Are they grouped by category? Listed as bullets?]
> I can see: [list first few topics visible]
> 
> **Location Section:**
> It shows 'Charlotte, North Carolina' - exactly what I selected."
> 
> "There are edit options:
> - 'Edit Topics' link/button - probably takes me back to Step 1
> - 'Edit Location' link/button - probably takes me back to Step 2"
> 
> "At the bottom, there's a big button that says 'Finish Setup' or 'Go to Dashboard'. This will finalize my onboarding."
> 
> "Everything looks correct. My selections are accurately reflected."

**Validation:**
- [ ] URL reflects Step 3 or review
- [ ] Progress indicator shows "3 of 3" or 100%
- [ ] Heading mentions review, confirmation, or "all set"
- [ ] Topics section lists 8 topics (can count or verify via text)
- [ ] Location section shows "Charlotte, North Carolina"
- [ ] "Edit Topics" link/button visible
- [ ] "Edit Location" link/button visible
- [ ] "Finish Setup" or "Go to Dashboard" button visible
- [ ] No console errors

**Screenshot:** `review-screen.png`

**Expected Difficulty:** Easy  
**Target Duration:** 10-15 seconds

**On Failure:** MODERATE - Retry navigation 2x. If review data incorrect, log as data bug.

---

### Step 12: Edit Topic Selections from Review Screen

**Action:**
```
Click "Edit Topics" link
Wait for navigation back to Step 1
Verify 8 topics still checked
Expand "Infrastructure & Transit" category
Select "Public Transit" checkbox (9th topic)
Click "Continue"
Verify skip to review screen (not through Step 2 again)
Verify review shows 9 topics including "Public Transit"
```

**Agent Narration:**
> "Let me test the edit flow. I want to add one more topic. I'll click 'Edit Topics'."
> 
> [After click] "I'm back on the topic selection screen (Step 1)."
> 
> "Checking if my previous selections are still there... [scan categories]"
> "Yes! All 8 topics I selected are still checked. The state was preserved."
> 
> "Now I'll add one more. Looking for 'Infrastructure & Transit'..."
> [After finding and expanding] "Found it. I'll select 'Public Transit'."
> [After selection] "Checked. Counter now shows '9 topics selected'."
> 
> "Clicking 'Continue' to go back to review..."
> 
> [After navigation] "Interesting - it skipped the geographic focus screen and went directly back to review. Makes sense since I already set my location."
> 
> "Looking at the review screen... Yes, it now shows 9 topics instead of 8, and 'Public Transit' is included in the list."
> 
> "The edit flow works great. State management is solid."

**Validation:**
- [ ] "Edit Topics" navigates to Step 1
- [ ] All 8 previous topics still checked (state persisted)
- [ ] Can expand Infrastructure category and select "Public Transit"
- [ ] Counter updates to "9 topics selected"
- [ ] "Continue" skips Step 2 and goes directly to review
- [ ] Review screen shows 9 topics including "Public Transit"
- [ ] Location still shows "Charlotte, North Carolina"

**Screenshot:** `review-screen-updated.png`

**Expected Difficulty:** Moderate (state management test)  
**Target Duration:** 45-60 seconds

**On Failure:** MODERATE - If state lost, log as CRITICAL bug. Retry 1x.

---

### Step 13: Finalize Onboarding and Redirect to Dashboard

**Action:**
```
Click "Finish Setup" or "Go to Dashboard" button
Wait for loading state (max 10s)
Expect redirect to /search or /dashboard
Verify dashboard loads with personalized content
```

**Agent Narration:**
> "I'm satisfied with my selections. Time to finish onboarding. Clicking 'Finish Setup'..."
> 
> [After click] "I see a loading indicator. It says '[read loading text]' - something like 'Setting up your dashboard...' or shows a spinner."
> 
> [Waiting] "It's been [X] seconds... [If > 5s:] It's taking a bit longer than expected, but I'll wait..."
> 
> [After redirect] "Great! The dashboard loaded."
> 
> "Looking at the URL... I'm at [/search or /dashboard]."
> 
> "The dashboard looks different from what I'd expect to see without onboarding. Instead of seeing all 46 subcategories or 9 generic categories, I see..."
> 
> "[Describe what's visible: Do I see my 9 selected topics as cards? Are they loading data?]"
> 
> "I can see post counts starting to appear next to topics. The data is loading..."
> 
> "[Check console] No errors in the console. Everything looks clean."
> 
> "The page feels fast - response times are good."

**Validation:**
- [ ] Loading state appears (spinner or message)
- [ ] Redirect occurs to /search or /dashboard
- [ ] Dashboard displays personalized content (not generic view)
- [ ] Can see selected topics (not all 46 subcategories)
- [ ] Post counts and data begin loading
- [ ] No console errors or warnings
- [ ] Load time reasonable (< 5 seconds total)

**Screenshot:** `personalized-dashboard-initial.png`

**Expected Difficulty:** Easy  
**Target Duration:** 10-15 seconds

**On Failure:** CRITICAL - If redirect fails or data doesn't save, log as P0 bug. Retry 2x.

---

### Step 14: Verify Personalized Dashboard Content

**Action:**
```
Count topic cards displayed (should be 9, not 46)
Verify topic names match selections:
  - Affordable Housing, Homelessness, Healthcare Access, Mental Health,
    Gun Violence, Education Funding, Climate Change, Public Transit, [9th topic]
Check location filter - should show "Charlotte, NC"
Click on one topic (e.g., "Affordable Housing") to test detail view
```

**Agent Narration:**
> "Let me verify that the dashboard is truly personalized to my selections."
> 
> "Counting the topic cards visible... I see [X] cards."
> [If 9:] "Perfect! It's showing exactly my 9 selected topics, not all 46 that exist in the system."
> 
> "The topics displayed are:
> 1. Affordable Housing
> 2. Homelessness
> 3. Healthcare Access
> 4. Mental Health
> 5. Gun Violence
> 6. Education Funding
> 7. Climate Change
> 8. Public Transit
> 9. [name of 9th topic]
> "
> 
> "All of these match what I selected during onboarding. Excellent."
> 
> "Looking at the location filter at the top... [search for geo toggle/filter]"
> "Yes, I can see 'Charlotte, NC' is the active location filter. It matches my onboarding selection."
> 
> "Now let me test clicking on a topic to see the detail view. I'll click 'Affordable Housing'..."
> 
> [After click] "The detail view loaded. I see AI analysis, post counts, sentiment breakdown, and a feed of social conversations."
> [Check data] "The posts seem relevant to affordable housing in Charlotte. Keywords like 'rent', 'housing costs', 'Charlotte' appear in the content."
> 
> "This is exactly what I wanted - a personalized, curated view of civic conversations that matter to me."

**Validation:**
- [ ] Dashboard displays 9 topic cards (not 46)
- [ ] All 9 topic names match onboarding selections
- [ ] Location filter shows "Charlotte, NC"
- [ ] Can click on a topic card
- [ ] Topic detail view loads with data (AI analysis, posts, sentiment)
- [ ] Data appears relevant to selected topic and location
- [ ] Post counts and briefings load within 1-2 seconds (Phase 0 cache)

**Screenshot:** `personalized-dashboard-verified.png`  
**Screenshot:** `topic-detail-affordable-housing.png`

**Expected Difficulty:** Easy  
**Target Duration:** 30-45 seconds

**On Failure:** CRITICAL - If topics don't match or data isn't personalized, log as P0 bug.

---

### Step 15: Test Skip Onboarding Behavior (Optional - Requires New Account)

**Action:**
```
[If testing:] Log out
Create new test account or use fresh incognito session
On onboarding welcome screen, locate "Skip for now" link
Click "Skip for now"
Verify redirect to generic dashboard
Verify generic category view (all 9 categories) displayed
```

**Agent Narration:**
> [Only execute if "Skip" feature is implemented in Phase 1]
> 
> "I want to test what happens if a user skips onboarding."
> 
> "Logging out and creating a fresh account... [wait for signup/login]"
> 
> "I'm on the onboarding welcome screen again. Looking for a 'Skip' option..."
> 
> [If found:] "I see a 'Skip for now' link near the bottom. Let me click it."
> 
> [After click] "It redirected me to the dashboard without completing onboarding."
> 
> "The dashboard looks different from the personalized one I saw before."
> [Describe view:] "I'm seeing all 9 categories (Housing, Health, Safety, etc.) in a grid or list format, not individual topics."
> 
> "This is the generic view - the user can still explore the app, but they don't have a curated topic list."
> 
> [Check:] "Can I access onboarding later? Looking in the menu or settings..."
> [If found:] "Yes, I see a prompt or link like 'Complete Setup' that would let me go back to onboarding."
> 
> [If "Skip" not found:] "I don't see a 'Skip' option on the welcome screen. It looks like all users must complete onboarding. This is fine - it ensures everyone gets a personalized experience."

**Validation:**
- [ ] "Skip for now" link visible on welcome screen (or note if not implemented)
- [ ] Clicking "Skip" redirects to /search or /dashboard
- [ ] Dashboard shows generic view (9 categories, not topic list)
- [ ] App remains functional without onboarding
- [ ] Can access onboarding later via menu/settings (if applicable)
- [ ] OR note: "Skip feature not implemented - all users required to complete onboarding"

**Screenshot:** `skip-onboarding-generic-view.png` (only if applicable)

**Expected Difficulty:** Easy  
**Target Duration:** 30-60 seconds

**On Failure:** Minor - Feature may not be implemented in Phase 1. Mark as "Not Available" and proceed.

---

## Test Report

### Summary

**Test Execution Date:** [AUTO-GENERATED]  
**Total Duration:** [AUTO-CALCULATED] seconds  
**Steps Completed:** X / 15  
**Steps Passed:** X  
**Steps Failed:** X  
**Critical Blockers:** X

---

### Step-by-Step Results

| Step | Name | Status | Difficulty | Duration | Notes |
|------|------|--------|------------|----------|-------|
| 1 | Welcome Screen | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 2 | Topic Selection View | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 3 | Expand Housing | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 4 | Select 3 Housing Topics | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 5 | Select Health Topics | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 6 | Select Remaining Topics | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 7 | Test Deselection | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 8 | Geographic Focus Screen | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 9 | Select State Focus | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 10 | Change to City Focus | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 11 | Review Screen | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 12 | Edit Topic Flow | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 13 | Finalize Onboarding | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 14 | Verify Personalized Dashboard | ✓/✗ | Easy/Mod/Hard | Xs | ... |
| 15 | Skip Onboarding (Optional) | ✓/✗/N/A | Easy/Mod/Hard | Xs | ... |

---

### Issues Encountered

#### Critical (P0) - Blocking Launch
1. [List any P0 issues]

#### High (P1) - Fix Before Beta
1. [List any P1 issues]

#### Medium (P2) - Fix Before GA
1. [List any P2 issues]

#### Low (P3) - Nice to Have
1. [List any P3 issues]

---

### Performance Metrics

- **Total onboarding duration:** [X] seconds (Target: 120-180s)
- **Topic selection time:** [X] seconds
- **Geographic selection time:** [X] seconds
- **Review time:** [X] seconds
- **Final submission & redirect:** [X] seconds
- **Dashboard first paint:** [X] seconds

**Performance Rating:** ✓ Excellent / ✓ Good / ⚠ Needs Improvement / ✗ Poor

---

### Accessibility Notes

[If agent has accessibility testing capabilities, include:]
- Keyboard navigation: ✓ Works / ✗ Broken
- Focus indicators: ✓ Visible / ⚠ Inconsistent / ✗ Missing
- Screen reader support: ✓ Good / ⚠ Partial / ✗ Poor
- Color contrast: ✓ Passes WCAG AA / ✗ Fails

---

### Screenshots Captured

1. `onboarding-welcome.png`
2. `topic-selection-initial.png`
3. `housing-expanded.png`
4. `3-topics-selected.png`
5. `5-topics-selected.png`
6. `8-topics-selected.png`
7. `geographic-focus-screen.png`
8. `state-selected.png`
9. `city-selected.png`
10. `review-screen.png`
11. `review-screen-updated.png`
12. `personalized-dashboard-initial.png`
13. `personalized-dashboard-verified.png`
14. `topic-detail-affordable-housing.png`
15. `skip-onboarding-generic-view.png` (optional)

---

### Recommendations

**Ship Readiness:**
- [ ] Ready to ship as-is
- [ ] Ready with minor fixes (list below)
- [ ] Requires significant fixes before launch
- [ ] Needs redesign or re-architecture

**Priority Fixes:**
1. 
2. 
3. 

**Enhancement Suggestions:**
1. 
2. 
3. 

---

## Agent Configuration

**Browser:** [Chrome/Firefox/Safari]  
**Viewport:** 1440x900  
**User Agent:** [AUTO-DETECTED]  
**Network:** [Throttling: None/Fast 3G/Slow 3G]  
**Cache:** [Enabled/Disabled]

---

## Test Artifacts

**Video Recording:** [Path to recording if available]  
**Console Logs:** [Path to logs]  
**Network Activity:** [Path to HAR file]  
**Coverage Report:** [Path if code coverage enabled]

---

_Test completed by AI Agent on [DATE] at [TIME]_
