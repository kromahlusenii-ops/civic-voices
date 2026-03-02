// Search suggestions, rotating placeholders, and question detection helpers
// Suggestions are derived from the taxonomy in lib/data/taxonomy.ts

import { TAXONOMY } from "@/lib/data/taxonomy"

export type UseCase = "civic" | "brand" | "policy" | "general"

export const USE_CASE_LABELS: Record<UseCase, string> = {
  civic: "Civic Leaders & Newsrooms",
  brand: "Brand Marketing",
  policy: "Policy & Research",
  general: "General Research",
}

// Map each use case to 4 subcategory IDs from the taxonomy
export const USE_CASE_SUBCATEGORY_IDS: Record<UseCase | "default", string[]> = {
  // Government officials, journalists, civic orgs
  civic: [
    "policing-reform",
    "voting-rights",
    "government-transparency",
    "public-transit",
  ],
  // Marketers tracking consumer sentiment and platform trends
  brand: [
    "cost-of-living",
    "content-moderation-censorship",
    "small-business",
    "minimum-wage-labor",
  ],
  // Researchers, academics, policy analysts
  policy: [
    "healthcare-access",
    "climate-resilience",
    "criminal-justice-reform",
    "affordable-housing",
  ],
  // General / exploring users
  general: [
    "mental-health",
    "gun-violence",
    "higher-education",
    "immigration-enforcement",
  ],
  // Unauthenticated / unknown segment
  default: [
    "affordable-housing",
    "healthcare-access",
    "voting-rights",
    "cost-of-living",
  ],
}

import { getSubcategoryById } from "@/lib/data/taxonomy"

/**
 * Resolve which subcategory IDs to prefetch for a user.
 * selectedTopics (from onboarding) takes priority over useCase role mapping.
 */
export function resolveSubcategoryIds(
  useCase: string | null,
  selectedTopics: string[] | null
): string[] {
  if (Array.isArray(selectedTopics) && selectedTopics.length > 0) {
    return selectedTopics.filter((id) => !!getSubcategoryById(id))
  }
  const key = (useCase ?? "default") as keyof typeof USE_CASE_SUBCATEGORY_IDS
  return USE_CASE_SUBCATEGORY_IDS[key] ?? USE_CASE_SUBCATEGORY_IDS.default
}

function buildSuggestions(ids: string[]): string[] {
  return ids.map((id) => {
    for (const cat of TAXONOMY) {
      const sub = cat.subcategories.find((s) => s.id === id)
      if (sub) return sub.name
    }
    return id // fallback to id if not found
  })
}

// Suggested searches shown below empty search box, per segment
export const SUGGESTED_SEARCHES: Record<UseCase | "default", string[]> = {
  civic: buildSuggestions(USE_CASE_SUBCATEGORY_IDS.civic),
  brand: buildSuggestions(USE_CASE_SUBCATEGORY_IDS.brand),
  policy: buildSuggestions(USE_CASE_SUBCATEGORY_IDS.policy),
  general: buildSuggestions(USE_CASE_SUBCATEGORY_IDS.general),
  default: buildSuggestions(USE_CASE_SUBCATEGORY_IDS.default),
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
  if (cleaned.endsWith("?")) {
    cleaned = cleaned.slice(0, -1).trim()
  }
  let prev = ""
  while (prev !== cleaned && QUESTION_STARTERS.test(cleaned)) {
    prev = cleaned
    cleaned = cleaned.replace(QUESTION_STARTERS, "").trim()
  }
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

// localStorage key for persisting search location (city/state)
export const LOCATION_STORAGE_KEY = "civicvoices_location"

// US state codes and names for location dropdown
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
]

export type LocationPreference = { city: string; state: string }
