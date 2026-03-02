# Test: Subcategory Detail View & Social Analysis

**Persona**: Dr. Sarah Chen — Policy Research Director

**Role**: Senior researcher at civic policy think tank
**Tech Level**: Intermediate
**Patience**: 8/10
**Goals**:
- Understand public sentiment on specific civic issues
- Identify pain points from real conversations
- Find representative quotes for policy briefs
- Determine solutions people are requesting

---

## Pre-test

- Start screen recording
- Clear browser state (cookies, cache, localStorage)
- Open browser to http://localhost:3000/search
- Have notepad ready for observations
- **Important**: Some subcategories may have 0 posts initially (lazy loading optimization)

---

## Instructions

Read each step out loud before attempting it. Think aloud as you work - this helps reviewers follow along. Mention any confusion, expectations met/unmet, or friction points.

---

## Steps

### Step 1: Navigate to a Category
**Goal**: Access a policy category to view subcategories

**Do**: From the main dashboard, click on "Housing & Development" category card

**Think aloud**:
- Is the category easy to locate?
- Does clicking give visual feedback?
- How quickly does the subcategory view load?

**Success**: You see the subcategory view with housing topics like "Affordable Housing", "Homelessness", "Gentrification", etc.

---

### Step 2: Select a Subcategory (Affordable Housing)
**Goal**: Drill down into a specific civic issue to see detailed analysis

**Do**: Click on the "Affordable Housing" subcategory card

**Think aloud**:
- Does clicking provide loading feedback?
- How long does it take for data to appear?
- Is there a progress indicator?
- What appears first - skeleton, text, or full data?

**Success**: The issue detail view loads showing "Affordable Housing" title, AI analysis sections, and social posts

---

### Step 3: Review AI Briefing Section
**Goal**: Understand the high-level AI summary of the conversation

**Do**: Look at the left side panel and read the "AI BRIEFING" section

**Observe and note**:
- **Post Count**: How many total posts? (e.g., "142 posts")
- **Sentiment Bar**: Can you see positive/neutral/negative percentages?
- **AI Interpretation**: Is there a text summary? Does it make sense?
- **Key Themes**: Are themes listed? Are they relevant to affordable housing?

**Think aloud**:
- Is the AI summary helpful?
- Does the sentiment breakdown seem accurate?
- Do the themes match what you'd expect for affordable housing?
- Is any information missing that you'd want?

**Success**: You can clearly see post count, sentiment distribution (with percentages), and an AI-generated interpretation of the conversation

---

### Step 4: Review Synthesize Section
**Goal**: Quickly identify key insights, pain points, and desired solutions

**Do**: Scroll on the right side to find the "✦ SYNTHESIZE" section

**Read the three subsections**:
1. **Key Insights** - What are the main themes? (expect 2-3 bullet points)
2. **Pain Points** - What problems are people expressing? (expect 2-3 bullet points)
3. **What People Want** - What solutions are being discussed? (expect 2-3 bullet points)

**Think aloud**:
- Are the insights specific and actionable?
- Do the pain points resonate with the affordable housing crisis?
- Are the "What People Want" items realistic policy asks?
- Is this section helpful for quickly understanding public concerns?

**Success**: You see organized bullet lists showing insights, problems, and desired solutions that are relevant to affordable housing

---

### Step 5: Browse Social Posts Feed
**Goal**: Read actual public conversations about affordable housing

**Do**: Scroll through the "CONVERSATIONS (X)" feed below the Synthesize section

**Observe each post card**:
- **Platform badge**: Can you tell if it's from Reddit, X, TikTok, or YouTube?
- **Author info**: Username, handle, avatar?
- **Post text**: Can you read a preview of the conversation?
- **Engagement**: Likes, comments, shares counts?
- **Timestamp**: How recent is the post?
- **Sentiment badge**: Is it tagged as positive, neutral, or negative?
- **Verification badges**: Any "Journalist", "Official", "Expert", or "News" badges?

**Think aloud**:
- Do the posts seem relevant to affordable housing?
- Is the text truncated appropriately or too much/too little?
- Are engagement metrics helpful?
- Can you easily identify verified/credible sources?
- How many posts are visible before scrolling?

**Success**: You can see 5-10 post cards with platform, author, text preview, engagement, timestamp, and sentiment clearly displayed

---

### Step 6: Filter by Platform (Reddit)
**Goal**: Focus on Reddit discussions only

**Do**: Find the platform filter buttons (should show "All", "Reddit", "X", "TikTok", "YouTube") and click "Reddit"

**Think aloud**:
- Are the filter buttons easy to find?
- Which filter is currently active (should see visual indication)?
- After clicking Reddit, do the posts update?
- Does the post count in "CONVERSATIONS (X)" change?
- Do you only see Reddit posts now?

**Success**: Post feed shows only Reddit posts (orange Reddit badges). Post count updates to show filtered count. Other platforms' posts are hidden.

---

### Step 7: Filter by Sentiment (Negative)
**Goal**: Identify strongly negative reactions to affordable housing issues

**Do**: Find the sentiment filter buttons (All, Negative, Neutral, Positive) and click "Negative"

**Think aloud**:
- Are sentiment filters near platform filters?
- After clicking "Negative", do posts update?
- Do all visible posts now have "negative" sentiment badges?
- Does the count reflect only negative posts?
- Can you clear the filter by clicking "All" again?

**Success**: Post feed shows only posts with red "negative" sentiment badges. Count decreases to show filtered subset. Posts express criticism, frustration, or concerns about affordable housing.

---

### Step 8: Toggle Verified Only Filter
**Goal**: Focus on credible, authoritative voices

**Do**: Look for a "Verified Only" toggle or checkbox and activate it

**Think aloud**:
- Where is the verified filter located?
- After enabling it, how many posts remain?
- Do all remaining posts have verification badges?
- What types of badges do you see? (Journalist, Official, Expert, News)
- If no posts remain, does the UI communicate that clearly?

**Success**: Post feed shows only posts from verified accounts with badges. Post count decreases significantly. If no verified posts exist, you see a message like "No verified posts found" or count shows 0.

---

### Step 9: Examine Individual Post Details
**Goal**: Read full context of a specific conversation

**Do**: Click on a post card to see if it expands or links to the source

**Think aloud**:
- What happens when you click a post?
- Can you read the full text if truncated?
- Does it open the original platform post (X, Reddit, TikTok)?
- Is author information complete (handle, bio, followers)?
- Are engagement numbers accurate and current?

**Success**: You can access more details about the post - either by expansion, modal, or external link to the platform

---

### Step 10: Navigate Back to Category View
**Goal**: Return to explore other housing subcategories

**Do**: Click the back button (usually top-left with ← or similar icon)

**Think aloud**:
- Is the back button easy to find?
- Does it return you to the Housing & Development subcategory list?
- Are all 6 housing subcategories still visible?
- If you click "Affordable Housing" again, does it load instantly (cached)?

**Success**: You return to the subcategory view showing all housing topics. Navigation is smooth. Previously viewed data loads instantly from cache.

---

## Post-test Questions

### Friction Points
1. What was confusing or slowed you down?
2. Was the AI analysis helpful or generic?
3. Did filters work as expected?
4. Were there any missing pieces of information?
5. Did posts feel relevant to the selected issue?

### What Worked Well
1. Which sections provided the most value?
2. Was the synthesize section (insights/pain points/solutions) actionable?
3. Did sentiment and platform filtering help narrow down posts?
4. Was navigation intuitive?
5. Did you trust the AI-generated content?

### Real-world Usage
1. Would you use this tool for actual policy research?
2. Could you find representative quotes for a brief in < 5 minutes?
3. Would you feel confident citing these social posts?
4. What's missing that would make this more useful?
5. Would you explore multiple subcategories in one session?

---

## Success Metrics

- ✅ **Issue detail view loads** within 10 seconds
- ✅ **AI briefing displays** post count, sentiment breakdown, interpretation
- ✅ **Synthesize section shows** insights, pain points, solutions (2-3 each)
- ✅ **Post feed shows 5+ posts** with platform, author, text, engagement, sentiment
- ✅ **Platform filter** successfully filters to Reddit, X, TikTok, or YouTube only
- ✅ **Sentiment filter** shows only negative, neutral, or positive posts
- ✅ **Verified filter** shows only posts with verification badges
- ✅ **Back navigation** returns to subcategory list without errors
- ✅ **Data is cached** - revisiting subcategory loads instantly
- ✅ **User would use again** for real research tasks

---

## Known Behaviors (Expected)

⚠️ **Lazy Loading**: Some subcategories may show "0 posts" until clicked (optimization to reduce API calls)  
⚠️ **Empty States**: Some subcategories may legitimately have no posts in the time range selected  
⚠️ **API Timing**: Initial load may take 5-10 seconds as data is fetched from multiple platforms  
⚠️ **Filtered Counts**: Enabling "Verified Only" may result in 0 posts (few verified accounts discuss local issues)

---

**Test Duration**: 15-20 minutes  
**Recommended Subcategories to Test**:
- **Housing**: Affordable Housing (high volume, emotional)
- **Safety**: Gun Violence (controversial, diverse sentiment)
- **Health**: Mental Health (personal stories, varied platforms)
- **Environment**: Air Quality (local relevance, data-driven)
