import type { InferredGender } from "../types/api";

export interface PronounResult {
  pronouns: string | undefined;
  inferredGender: InferredGender;
}

// Common pronoun patterns people put in bios
const PRONOUN_PATTERNS = [
  // Parenthetical formats: (she/her), (he/him), (they/them)
  /\((?:she|her)(?:\/(?:she|her|hers|they|them))?\)/i,
  /\((?:he|him)(?:\/(?:he|him|his|they|them))?\)/i,
  /\((?:they|them)(?:\/(?:they|them|theirs))?\)/i,

  // Slash formats without parens: she/her, he/him, they/them
  /\b(?:she\/her(?:s)?|her\/she)\b/i,
  /\b(?:he\/him(?:s)?|him\/he|his\/him)\b/i,
  /\b(?:they\/them(?:s)?|them\/they)\b/i,

  // Pipe separated: she|her, he|him
  /\b(?:she\|her(?:s)?)\b/i,
  /\b(?:he\|him(?:s)?)\b/i,
  /\b(?:they\|them(?:s)?)\b/i,

  // Mixed pronouns
  /\b(?:she\/they|they\/she)\b/i,
  /\b(?:he\/they|they\/he)\b/i,
  /\b(?:any\s*pronouns?)\b/i,
  /\b(?:all\s*pronouns?)\b/i,

  // Neo-pronouns and other
  /\b(?:xe\/xem|ze\/hir|ze\/zir|ey\/em|fae\/faer)\b/i,
];

// Map patterns to genders
const FEMALE_PATTERNS = [
  /\((?:she|her)/i,
  /\b(?:she\/her)/i,
  /\b(?:her\/she)/i,
  /\b(?:she\|her)/i,
];

const MALE_PATTERNS = [
  /\((?:he|him)/i,
  /\b(?:he\/him)/i,
  /\b(?:him\/he)/i,
  /\b(?:his\/him)/i,
  /\b(?:he\|him)/i,
];

const NON_BINARY_PATTERNS = [
  /\((?:they|them)/i,
  /\b(?:they\/them)/i,
  /\b(?:them\/they)/i,
  /\b(?:they\|them)/i,
  /\b(?:she\/they|they\/she)\b/i,
  /\b(?:he\/they|they\/he)\b/i,
  /\b(?:xe\/xem|ze\/hir|ze\/zir|ey\/em|fae\/faer)\b/i,
];

const OTHER_PATTERNS = [
  /\b(?:any\s*pronouns?)\b/i,
  /\b(?:all\s*pronouns?)\b/i,
];

/**
 * Extract pronouns from bio text and infer gender
 * @param bio The bio/description text to analyze
 * @returns PronounResult with extracted pronouns and inferred gender
 */
export function extractPronouns(bio: string | undefined | null): PronounResult {
  if (!bio || typeof bio !== "string") {
    return { pronouns: undefined, inferredGender: "unknown" };
  }

  // Normalize text
  const normalizedBio = bio.toLowerCase().trim();

  // Try to find explicit pronouns
  let foundPronouns: string | undefined;

  for (const pattern of PRONOUN_PATTERNS) {
    const match = normalizedBio.match(pattern);
    if (match) {
      foundPronouns = match[0].replace(/[()]/g, "").trim();
      break;
    }
  }

  // Infer gender from patterns
  let inferredGender: InferredGender = "unknown";

  // Check for non-binary first (they/them, mixed pronouns, neopronouns)
  for (const pattern of NON_BINARY_PATTERNS) {
    if (pattern.test(normalizedBio)) {
      inferredGender = "non-binary";
      break;
    }
  }

  // If not non-binary, check for binary genders
  if (inferredGender === "unknown") {
    for (const pattern of FEMALE_PATTERNS) {
      if (pattern.test(normalizedBio)) {
        inferredGender = "female";
        break;
      }
    }
  }

  if (inferredGender === "unknown") {
    for (const pattern of MALE_PATTERNS) {
      if (pattern.test(normalizedBio)) {
        inferredGender = "male";
        break;
      }
    }
  }

  // Check for "any/all pronouns"
  if (inferredGender === "unknown") {
    for (const pattern of OTHER_PATTERNS) {
      if (pattern.test(normalizedBio)) {
        inferredGender = "other";
        break;
      }
    }
  }

  return {
    pronouns: foundPronouns,
    inferredGender,
  };
}

/**
 * Normalize pronouns to a consistent format
 * @param pronouns Raw pronoun string
 * @returns Normalized pronoun string
 */
export function normalizePronouns(pronouns: string): string {
  return pronouns
    .toLowerCase()
    .replace(/[|]/g, "/")
    .replace(/\s+/g, "")
    .trim();
}

export default extractPronouns;
