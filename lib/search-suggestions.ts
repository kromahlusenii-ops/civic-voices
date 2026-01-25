// Search suggestions, rotating placeholders, and question detection helpers
// Used by the search page to provide segment-aware onboarding UX

export type UseCase = "civic" | "brand" | "policy" | "general"

export const USE_CASE_LABELS: Record<UseCase, string> = {
  civic: "Civic Leaders & Newsrooms",
  brand: "Brand Marketing",
  policy: "Policy & Research",
  general: "General Research",
}

// Suggested searches shown below empty search box, per segment
export const SUGGESTED_SEARCHES: Record<UseCase | "default", string[]> = {
  civic: [
    "Immigration policy sentiment",
    "2026 ballot measures",
    "School board debates",
    "Public transit funding",
  ],
  brand: [
    "Brand reputation crisis",
    "Consumer sentiment on pricing",
    "Competitor product launches",
    "Influencer marketing ROI",
  ],
  policy: [
    "Healthcare reform discourse",
    "Climate policy public opinion",
    "Gun control debate",
    "Housing affordability crisis",
  ],
  general: [
    "AI and jobs sentiment",
    "Cost of living discussions",
    "Student loan forgiveness",
    "Remote work trends",
  ],
  default: [
    "AI and jobs sentiment",
    "Immigration policy debate",
    "Consumer brand sentiment",
    "Climate policy opinions",
  ],
}

// Rotating placeholder text per segment
export const ROTATING_PLACEHOLDERS: Record<UseCase | "default", string[]> = {
  civic: [
    "Search a policy, candidate, or ballot measure...",
    "What are voters saying about...",
    "Track public opinion on...",
    "How do constituents feel about...",
    "Search a local issue or regulation...",
    "What's the public reaction to...",
    "Monitor civic discourse around...",
  ],
  brand: [
    "Search a brand, product, or industry...",
    "What are consumers saying about...",
    "Monitor mentions of...",
    "Track competitor sentiment on...",
    "How is your brand perceived for...",
    "What's the buzz around...",
    "Measure audience reaction to...",
  ],
  policy: [
    "Search a policy area or social trend...",
    "Analyze discourse around...",
    "Explore public sentiment on...",
    "How is this regulation being discussed...",
    "What are researchers saying about...",
    "Track evolving opinions on...",
    "Map the debate around...",
  ],
  general: [
    "Search any trending topic...",
    "What are people saying about...",
    "Discover conversations about...",
    "Explore opinions on...",
    "What's trending around...",
    "See how people feel about...",
    "Find discussions about...",
  ],
  default: [
    "Search an issue, candidate, or ballot measure...",
    "What are people talking about...",
    "Explore trending conversations...",
    "Discover what people think about...",
    "Track public sentiment on...",
    "Find social media discussions about...",
    "See what's being said about...",
  ],
}

// Question detection
const QUESTION_STARTERS = /^(who|what|where|when|why|how|is|are|do|does|can|will|should|would|could|has|have|did)\b/i

export function isQuestion(query: string): boolean {
  const trimmed = query.trim()
  if (trimmed.endsWith("?")) return true
  return QUESTION_STARTERS.test(trimmed)
}

export function convertToSearchQuery(question: string): string {
  let cleaned = question.trim()
  // Remove trailing question mark
  if (cleaned.endsWith("?")) {
    cleaned = cleaned.slice(0, -1).trim()
  }
  // Repeatedly remove leading question words (handles "What is", "How do", etc.)
  let prev = ""
  while (prev !== cleaned && QUESTION_STARTERS.test(cleaned)) {
    prev = cleaned
    cleaned = cleaned.replace(QUESTION_STARTERS, "").trim()
  }
  // Remove filler phrases
  cleaned = cleaned
    .replace(/^(people think about|people feel about|people say about|the public think about)\s+/i, "")
    .replace(/^(think about|feel about|say about)\s+/i, "")
    .trim()
  return cleaned || question.trim()
}

// Get suggestions for a given use case
export function getSuggestionsForUseCase(useCase: string | null): string[] {
  if (useCase && useCase in SUGGESTED_SEARCHES) {
    return SUGGESTED_SEARCHES[useCase as UseCase]
  }
  return SUGGESTED_SEARCHES.default
}

// Get placeholders for a given use case
export function getPlaceholdersForUseCase(useCase: string | null): string[] {
  if (useCase && useCase in ROTATING_PLACEHOLDERS) {
    return ROTATING_PLACEHOLDERS[useCase as UseCase]
  }
  return ROTATING_PLACEHOLDERS.default
}

// localStorage key for persisting use case
export const USE_CASE_STORAGE_KEY = "civicvoices_usecase"
