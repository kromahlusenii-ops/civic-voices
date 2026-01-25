import { describe, it, expect } from "vitest"
import {
  isQuestion,
  convertToSearchQuery,
  getSuggestionsForUseCase,
  getPlaceholdersForUseCase,
  SUGGESTED_SEARCHES,
  ROTATING_PLACEHOLDERS,
  USE_CASE_STORAGE_KEY,
} from "./search-suggestions"

describe("isQuestion", () => {
  it("detects queries ending with question mark", () => {
    expect(isQuestion("What is happening?")).toBe(true)
    expect(isQuestion("immigration?")).toBe(true)
  })

  it("detects queries starting with question words", () => {
    expect(isQuestion("What do people think about AI")).toBe(true)
    expect(isQuestion("How is climate policy viewed")).toBe(true)
    expect(isQuestion("Why are gas prices rising")).toBe(true)
    expect(isQuestion("Who supports this policy")).toBe(true)
    expect(isQuestion("Where is housing most expensive")).toBe(true)
    expect(isQuestion("When did this trend start")).toBe(true)
    expect(isQuestion("Is immigration a top issue")).toBe(true)
    expect(isQuestion("Are voters concerned about inflation")).toBe(true)
    expect(isQuestion("Do people support the bill")).toBe(true)
    expect(isQuestion("Does this affect sentiment")).toBe(true)
    expect(isQuestion("Can AI replace jobs")).toBe(true)
    expect(isQuestion("Will prices go down")).toBe(true)
    expect(isQuestion("Should we worry about AI")).toBe(true)
    expect(isQuestion("Would voters support this")).toBe(true)
    expect(isQuestion("Could this policy work")).toBe(true)
    expect(isQuestion("Has inflation peaked")).toBe(true)
    expect(isQuestion("Have people changed their minds")).toBe(true)
    expect(isQuestion("Did the election change anything")).toBe(true)
  })

  it("returns false for non-questions", () => {
    expect(isQuestion("immigration policy")).toBe(false)
    expect(isQuestion("AI and jobs sentiment")).toBe(false)
    expect(isQuestion("climate change opinions")).toBe(false)
    expect(isQuestion("brand reputation")).toBe(false)
  })

  it("is case insensitive", () => {
    expect(isQuestion("WHAT do people think")).toBe(true)
    expect(isQuestion("How Is This Working")).toBe(true)
  })

  it("handles whitespace", () => {
    expect(isQuestion("  What is this?  ")).toBe(true)
    expect(isQuestion("  What is happening  ")).toBe(true)
  })

  it("does not match question words in the middle of queries", () => {
    expect(isQuestion("people who support immigration")).toBe(false)
    expect(isQuestion("the what and why of inflation")).toBe(false)
  })
})

describe("convertToSearchQuery", () => {
  it("removes trailing question marks", () => {
    expect(convertToSearchQuery("immigration?")).toBe("immigration")
  })

  it("removes leading question words", () => {
    expect(convertToSearchQuery("What is immigration policy")).toBe("immigration policy")
    expect(convertToSearchQuery("How do people feel about AI")).toBe("AI")
    expect(convertToSearchQuery("Why are gas prices high")).toBe("gas prices high")
  })

  it("removes filler phrases after question words", () => {
    expect(convertToSearchQuery("What do people think about AI")).toBe("AI")
    expect(convertToSearchQuery("What do people feel about climate")).toBe("climate")
    expect(convertToSearchQuery("What do people say about inflation")).toBe("inflation")
  })

  it("handles both question mark and question word", () => {
    expect(convertToSearchQuery("What is AI doing?")).toBe("AI doing")
  })

  it("returns original query if nothing to clean", () => {
    expect(convertToSearchQuery("immigration policy")).toBe("immigration policy")
  })

  it("returns original if cleaning would produce empty string", () => {
    // "is" is a question word, removing it and the rest might leave empty
    expect(convertToSearchQuery("is")).toBe("is")
  })

  it("handles whitespace", () => {
    expect(convertToSearchQuery("  What is AI?  ")).toBe("AI")
  })
})

describe("getSuggestionsForUseCase", () => {
  it("returns civic suggestions for civic use case", () => {
    const suggestions = getSuggestionsForUseCase("civic")
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.civic)
    expect(suggestions).toHaveLength(4)
  })

  it("returns brand suggestions for brand use case", () => {
    const suggestions = getSuggestionsForUseCase("brand")
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.brand)
  })

  it("returns policy suggestions for policy use case", () => {
    const suggestions = getSuggestionsForUseCase("policy")
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.policy)
  })

  it("returns general suggestions for general use case", () => {
    const suggestions = getSuggestionsForUseCase("general")
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.general)
  })

  it("returns default suggestions for null use case", () => {
    const suggestions = getSuggestionsForUseCase(null)
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.default)
  })

  it("returns default suggestions for unknown use case", () => {
    const suggestions = getSuggestionsForUseCase("unknown")
    expect(suggestions).toEqual(SUGGESTED_SEARCHES.default)
  })
})

describe("getPlaceholdersForUseCase", () => {
  it("returns civic placeholders for civic use case", () => {
    const placeholders = getPlaceholdersForUseCase("civic")
    expect(placeholders).toEqual(ROTATING_PLACEHOLDERS.civic)
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it("returns brand placeholders for brand use case", () => {
    const placeholders = getPlaceholdersForUseCase("brand")
    expect(placeholders).toEqual(ROTATING_PLACEHOLDERS.brand)
  })

  it("returns default placeholders for null use case", () => {
    const placeholders = getPlaceholdersForUseCase(null)
    expect(placeholders).toEqual(ROTATING_PLACEHOLDERS.default)
  })

  it("returns default placeholders for unknown use case", () => {
    const placeholders = getPlaceholdersForUseCase("invalid")
    expect(placeholders).toEqual(ROTATING_PLACEHOLDERS.default)
  })
})

describe("USE_CASE_STORAGE_KEY", () => {
  it("has expected value", () => {
    expect(USE_CASE_STORAGE_KEY).toBe("civicvoices_usecase")
  })
})

describe("SUGGESTED_SEARCHES", () => {
  it("has entries for all use cases plus default", () => {
    expect(Object.keys(SUGGESTED_SEARCHES)).toEqual(
      expect.arrayContaining(["civic", "brand", "policy", "general", "default"])
    )
  })

  it("each use case has 4 suggestions", () => {
    for (const [, suggestions] of Object.entries(SUGGESTED_SEARCHES)) {
      expect(suggestions).toHaveLength(4)
    }
  })

  it("all suggestions are non-empty strings", () => {
    for (const [, suggestions] of Object.entries(SUGGESTED_SEARCHES)) {
      for (const suggestion of suggestions) {
        expect(typeof suggestion).toBe("string")
        expect(suggestion.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("ROTATING_PLACEHOLDERS", () => {
  it("has entries for all use cases plus default", () => {
    expect(Object.keys(ROTATING_PLACEHOLDERS)).toEqual(
      expect.arrayContaining(["civic", "brand", "policy", "general", "default"])
    )
  })

  it("each use case has at least 2 placeholders for rotation", () => {
    for (const [, placeholders] of Object.entries(ROTATING_PLACEHOLDERS)) {
      expect(placeholders.length).toBeGreaterThanOrEqual(2)
    }
  })
})
