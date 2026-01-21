/**
 * AAVE (African American Vernacular English) & Modern Slang Glossary
 *
 * This glossary helps our AI accurately interpret sentiment in social media posts
 * that use informal language, AAVE expressions, and internet slang.
 *
 * Many expressions may appear negative when taken literally but convey positive
 * sentiment in context. This reference ensures accurate sentiment classification.
 */

export type SentimentCategory = "positive" | "negative" | "neutral" | "context-dependent"

export interface SlangTerm {
  term: string
  alternates?: string[]
  meaning: string
  sentiment: SentimentCategory
  examples?: string[]
}

export const AAVE_GLOSSARY: SlangTerm[] = [
  // Strongly Positive Expressions
  {
    term: "fire",
    alternates: ["🔥", "that's fire", "this is fire", "straight fire"],
    meaning: "Excellent, amazing, impressive",
    sentiment: "positive",
    examples: ["This product is fire 🔥", "Their customer service is fire"]
  },
  {
    term: "slay",
    alternates: ["slaying", "slayed", "she slayed", "they slayed"],
    meaning: "Did extremely well, impressive performance",
    sentiment: "positive",
    examples: ["They slayed with this new collection", "Absolutely slaying it"]
  },
  {
    term: "ate",
    alternates: ["ate that", "ate and left no crumbs", "they ate", "she ate"],
    meaning: "Performed excellently, nailed it",
    sentiment: "positive",
    examples: ["This brand ate with their new packaging", "They ate and left no crumbs"]
  },
  {
    term: "GOAT",
    alternates: ["goated", "the goat", "🐐"],
    meaning: "Greatest Of All Time",
    sentiment: "positive",
    examples: ["This is the GOAT of skincare products", "Goated customer service"]
  },
  {
    term: "bussin",
    alternates: ["bussin bussin", "it's bussin"],
    meaning: "Really good, delicious, excellent",
    sentiment: "positive",
    examples: ["These snacks are bussin", "Bussin bussin no cap"]
  },
  {
    term: "hits different",
    alternates: ["hit different", "this hits different"],
    meaning: "Exceptionally good in a unique, special way",
    sentiment: "positive",
    examples: ["Their products hit different", "Shopping here hits different"]
  },
  {
    term: "valid",
    alternates: ["that's valid", "so valid"],
    meaning: "Legitimate, approved, good, acceptable",
    sentiment: "positive",
    examples: ["This purchase was so valid", "Their prices are valid"]
  },
  {
    term: "W",
    alternates: ["that's a W", "big W", "massive W", "dub"],
    meaning: "Win, success, good outcome",
    sentiment: "positive",
    examples: ["Big W for this brand", "That sale was a massive W"]
  },
  {
    term: "periodt",
    alternates: ["period", "and that's on periodt"],
    meaning: "Emphatic agreement, end of discussion",
    sentiment: "positive",
    examples: ["Best brand out there, periodt", "They understood the assignment, period"]
  },
  {
    term: "understood the assignment",
    alternates: ["understood the assignment fr"],
    meaning: "Did something perfectly, met or exceeded expectations",
    sentiment: "positive",
    examples: ["This brand understood the assignment", "Their design team understood the assignment"]
  },
  {
    term: "snatched",
    alternates: ["looks snatched", "got me snatched"],
    meaning: "Looking great, well-done, impressive appearance",
    sentiment: "positive",
    examples: ["This fit is snatched", "The packaging is snatched"]
  },
  {
    term: "iconic",
    alternates: ["that's iconic", "so iconic"],
    meaning: "Memorable, excellent, praiseworthy",
    sentiment: "positive",
    examples: ["Their branding is iconic", "Iconic customer experience"]
  },
  {
    term: "legend",
    alternates: ["legendary", "actual legend"],
    meaning: "Praise for excellence or impressive action",
    sentiment: "positive",
    examples: ["Customer service rep was a legend", "Legendary quality"]
  },
  {
    term: "stan",
    alternates: ["stanning", "I stan", "we stan"],
    meaning: "Strong supporter, enthusiastic fan",
    sentiment: "positive",
    examples: ["I stan this brand forever", "We stan quality products"]
  },
  {
    term: "vibe",
    alternates: ["vibing", "good vibes", "the vibe is immaculate"],
    meaning: "Good feeling, pleasant atmosphere, enjoying",
    sentiment: "positive",
    examples: ["The store vibe is immaculate", "Vibing with this aesthetic"]
  },
  {
    term: "main character energy",
    alternates: ["main character", "giving main character"],
    meaning: "Confident, standout, impressive presence",
    sentiment: "positive",
    examples: ["This product gives main character energy"]
  },
  {
    term: "chef's kiss",
    alternates: ["*chef's kiss*", "🤌"],
    meaning: "Perfect, excellent, couldn't be better",
    sentiment: "positive",
    examples: ["The quality? Chef's kiss", "Packaging design is *chef's kiss*"]
  },
  {
    term: "immaculate",
    alternates: ["immaculate vibes"],
    meaning: "Perfect, flawless",
    sentiment: "positive",
    examples: ["Shipping was immaculate", "The experience was immaculate"]
  },

  // Negative Expressions
  {
    term: "mid",
    alternates: ["that's mid", "kinda mid", "lowkey mid"],
    meaning: "Mediocre, average, underwhelming",
    sentiment: "negative",
    examples: ["This product is mid tbh", "Quality is kinda mid"]
  },
  {
    term: "cap",
    alternates: ["that's cap", "no cap it's cap", "capping"],
    meaning: "Lying, false statement, not true",
    sentiment: "negative",
    examples: ["Their claims are cap", "That review is cap"]
  },
  {
    term: "L",
    alternates: ["took an L", "big L", "massive L", "that's an L"],
    meaning: "Loss, failure, bad outcome",
    sentiment: "negative",
    examples: ["That decision was an L", "Took an L with this purchase"]
  },
  {
    term: "sus",
    alternates: ["kinda sus", "that's sus", "suspicious"],
    meaning: "Suspicious, questionable, untrustworthy",
    sentiment: "negative",
    examples: ["These reviews seem sus", "The pricing is kinda sus"]
  },
  {
    term: "ratio",
    alternates: ["ratio'd", "got ratio'd"],
    meaning: "Being publicly corrected or overwhelmed by disagreement",
    sentiment: "negative",
    examples: ["Brand got ratio'd for that post"]
  },
  {
    term: "ain't it",
    alternates: ["this ain't it", "that ain't it chief"],
    meaning: "This is not good, disapproval",
    sentiment: "negative",
    examples: ["This new design ain't it", "That price ain't it chief"]
  },
  {
    term: "flop",
    alternates: ["flopped", "total flop"],
    meaning: "Failed, unsuccessful",
    sentiment: "negative",
    examples: ["Their new product flopped", "Launch was a total flop"]
  },
  {
    term: "trash",
    alternates: ["that's trash", "absolute trash"],
    meaning: "Very bad, worthless",
    sentiment: "negative",
    examples: ["Quality is trash", "Customer service was trash"]
  },
  {
    term: "dead",
    alternates: ["I'm dead", "this is dead"],
    meaning: "Can mean 'very funny' (positive) or 'not interesting/over' (negative)",
    sentiment: "context-dependent",
    examples: ["I'm dead 💀 (positive - hilarious)", "This brand is dead (negative)"]
  },

  // Neutral / Context-Dependent Expressions
  {
    term: "no cap",
    alternates: ["deadass", "fr fr", "for real for real", "on god"],
    meaning: "Genuine emphasis, 'for real', not lying",
    sentiment: "context-dependent",
    examples: ["No cap this is amazing", "Deadass disappointed"]
  },
  {
    term: "lowkey",
    alternates: ["low key"],
    meaning: "Somewhat, a little bit, secretly",
    sentiment: "context-dependent",
    examples: ["Lowkey love this", "Lowkey disappointed"]
  },
  {
    term: "highkey",
    alternates: ["high key"],
    meaning: "Very much, openly, obviously",
    sentiment: "context-dependent",
    examples: ["Highkey obsessed", "Highkey annoyed"]
  },
  {
    term: "bet",
    alternates: ["aight bet", "okay bet"],
    meaning: "Agreement, confirmation, okay",
    sentiment: "neutral",
    examples: ["Bet, ordering now", "They ship fast? Bet"]
  },
  {
    term: "it's giving",
    alternates: ["giving", "it's giving..."],
    meaning: "It resembles or evokes something (check what follows)",
    sentiment: "context-dependent",
    examples: ["It's giving luxury (positive)", "It's giving cheap (negative)"]
  },
  {
    term: "rent free",
    alternates: ["living rent free", "in my head rent free"],
    meaning: "Can't stop thinking about something",
    sentiment: "context-dependent",
    examples: ["This product lives in my head rent free"]
  },
  {
    term: "fam",
    alternates: ["fam bam"],
    meaning: "Family, close friends, term of endearment",
    sentiment: "neutral",
    examples: ["Thanks fam", "Appreciate it fam"]
  },
  {
    term: "sis",
    alternates: ["bestie", "queen", "king", "bro"],
    meaning: "Terms of endearment, friendly address",
    sentiment: "neutral",
    examples: ["Sis, you need to try this", "Okay bestie"]
  },
  {
    term: "I'm weak",
    alternates: ["weak", "weakkkk"],
    meaning: "Finding something very funny",
    sentiment: "positive",
    examples: ["Their marketing has me weak 😂"]
  },
  {
    term: "salty",
    alternates: ["being salty", "so salty"],
    meaning: "Upset, bitter, resentful",
    sentiment: "negative",
    examples: ["I'm salty about this return policy"]
  },
  {
    term: "shook",
    alternates: ["I'm shook", "shooketh"],
    meaning: "Shocked, surprised (can be positive or negative)",
    sentiment: "context-dependent",
    examples: ["I'm shook by the quality (positive)", "Shook by how bad this is (negative)"]
  },
  {
    term: "tea",
    alternates: ["the tea", "spill the tea", "☕"],
    meaning: "Gossip, truth, insider information",
    sentiment: "neutral",
    examples: ["What's the tea on this brand?", "Spill the tea sis"]
  },
  {
    term: "wig snatched",
    alternates: ["wig flew", "snatched my wig"],
    meaning: "Mind blown, extremely impressed",
    sentiment: "positive",
    examples: ["Quality snatched my wig", "Wig flew when I saw the packaging"]
  },
  {
    term: "receipts",
    alternates: ["show receipts", "got receipts"],
    meaning: "Evidence, proof",
    sentiment: "neutral",
    examples: ["Got receipts of their bad service"]
  },
  {
    term: "flex",
    alternates: ["flexing", "weird flex"],
    meaning: "Show off, boast (can be positive or negative)",
    sentiment: "context-dependent",
    examples: ["Love to flex this purchase", "Weird flex but ok"]
  },
  {
    term: "clout",
    alternates: ["clout chasing", "for the clout"],
    meaning: "Influence, fame, social status",
    sentiment: "neutral",
    examples: ["They got major clout now"]
  },
  {
    term: "lit",
    alternates: ["it's lit", "so lit"],
    meaning: "Exciting, excellent, fun",
    sentiment: "positive",
    examples: ["This sale is lit", "Their new drop is lit"]
  },
  {
    term: "drip",
    alternates: ["got drip", "dripping"],
    meaning: "Style, impressive fashion/aesthetics",
    sentiment: "positive",
    examples: ["This packaging has drip", "The drip is real"]
  },
  {
    term: "catch these hands",
    alternates: ["hands"],
    meaning: "Confrontational, ready to fight/argue",
    sentiment: "negative",
    examples: ["Customer service about to catch these hands"]
  },
  {
    term: "pressed",
    alternates: ["why you pressed", "so pressed"],
    meaning: "Upset, bothered, stressed about something",
    sentiment: "negative",
    examples: ["I'm pressed about shipping delays"]
  },
  {
    term: "sleep on",
    alternates: ["don't sleep on", "sleeping on"],
    meaning: "To underestimate or ignore something good",
    sentiment: "context-dependent",
    examples: ["Don't sleep on this brand (positive - recommending)"]
  },
  {
    term: "hits",
    alternates: ["this hits", "it hits"],
    meaning: "Is good, works well, resonates",
    sentiment: "positive",
    examples: ["This product just hits", "Their marketing hits"]
  },
  {
    term: "sick",
    alternates: ["that's sick"],
    meaning: "Cool, awesome (not about illness)",
    sentiment: "positive",
    examples: ["The design is sick", "Sick deal right now"]
  },
  {
    term: "slaps",
    alternates: ["this slaps", "it slaps"],
    meaning: "Is very good, impressive",
    sentiment: "positive",
    examples: ["Their new product slaps", "Quality absolutely slaps"]
  },
  {
    term: "go off",
    alternates: ["go off queen", "went off"],
    meaning: "Express yourself freely, do your thing (usually supportive)",
    sentiment: "positive",
    examples: ["Go off with that review!", "They went off with this launch"]
  },
  {
    term: "based",
    alternates: ["so based"],
    meaning: "Authentic, true to oneself, admirable stance",
    sentiment: "positive",
    examples: ["Based take on pricing", "That response was based"]
  },
  {
    term: "cope",
    alternates: ["copium", "coping"],
    meaning: "Denial, refusing to accept reality",
    sentiment: "negative",
    examples: ["Fans are coping hard", "That's pure copium"]
  }
]

/**
 * Get all positive slang terms
 */
export function getPositiveTerms(): SlangTerm[] {
  return AAVE_GLOSSARY.filter(term => term.sentiment === "positive")
}

/**
 * Get all negative slang terms
 */
export function getNegativeTerms(): SlangTerm[] {
  return AAVE_GLOSSARY.filter(term => term.sentiment === "negative")
}

/**
 * Get context-dependent terms that require additional analysis
 */
export function getContextDependentTerms(): SlangTerm[] {
  return AAVE_GLOSSARY.filter(term => term.sentiment === "context-dependent")
}

/**
 * Look up a term in the glossary
 */
export function lookupTerm(searchTerm: string): SlangTerm | undefined {
  const normalized = searchTerm.toLowerCase().trim()
  return AAVE_GLOSSARY.find(
    entry =>
      entry.term.toLowerCase() === normalized ||
      entry.alternates?.some(alt => alt.toLowerCase() === normalized)
  )
}

/**
 * Check if text contains known slang terms and return matches
 */
export function findSlangInText(text: string): SlangTerm[] {
  const normalizedText = text.toLowerCase()
  const matches: SlangTerm[] = []

  for (const term of AAVE_GLOSSARY) {
    const allTerms = [term.term, ...(term.alternates || [])]
    for (const t of allTerms) {
      if (normalizedText.includes(t.toLowerCase())) {
        if (!matches.includes(term)) {
          matches.push(term)
        }
        break
      }
    }
  }

  return matches
}
