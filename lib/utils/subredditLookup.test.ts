import { describe, it, expect } from "vitest";
import {
  getStateSubreddits,
  getCitySubreddits,
  getSubredditsForLocation,
  hasStateData,
  hasCityData,
} from "./subredditLookup";

describe("subredditLookup", () => {
  describe("getStateSubreddits", () => {
    it("returns state-level subreddits for valid state code", () => {
      const result = getStateSubreddits("CA");
      expect(result).toContain("California");
      expect(result).toContain("bayarea");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns empty array for invalid state code", () => {
      const result = getStateSubreddits("XX");
      expect(result).toEqual([]);
    });

    it("returns state subreddits for NY", () => {
      const result = getStateSubreddits("NY");
      expect(result).toContain("newyork");
    });

    it("returns state subreddits for TX", () => {
      const result = getStateSubreddits("TX");
      expect(result).toContain("texas");
    });
  });

  describe("getCitySubreddits", () => {
    it("returns city subreddits for valid city in valid state", () => {
      const result = getCitySubreddits("CA", "los-angeles");
      expect(result).toContain("LosAngeles");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns empty array for invalid city", () => {
      const result = getCitySubreddits("CA", "invalid-city");
      expect(result).toEqual([]);
    });

    it("returns empty array for invalid state", () => {
      const result = getCitySubreddits("XX", "los-angeles");
      expect(result).toEqual([]);
    });

    it("returns NYC subreddits", () => {
      const result = getCitySubreddits("NY", "new-york-city");
      expect(result).toContain("nyc");
      expect(result).toContain("AskNYC");
    });

    it("returns Chicago subreddits", () => {
      const result = getCitySubreddits("IL", "chicago");
      expect(result).toContain("chicago");
    });
  });

  describe("getSubredditsForLocation", () => {
    it("returns city-specific subreddits when city is provided", () => {
      const result = getSubredditsForLocation("CA", "san-francisco");
      expect(result).toContain("sanfrancisco");
      expect(result).toContain("AskSF");
      // Should not include LA subreddits
      expect(result).not.toContain("LosAngeles");
    });

    it("returns all state + city subreddits when only state is provided", () => {
      const result = getSubredditsForLocation("CA");
      // Should include state subreddits
      expect(result).toContain("California");
      // Should include city subreddits
      expect(result).toContain("LosAngeles");
      expect(result).toContain("sanfrancisco");
    });

    it("returns empty array for invalid state", () => {
      const result = getSubredditsForLocation("XX");
      expect(result).toEqual([]);
    });

    it("handles null city parameter", () => {
      const result = getSubredditsForLocation("NY", null);
      expect(result).toContain("newyork");
      expect(result).toContain("nyc");
      expect(result.length).toBeGreaterThan(0);
    });

    it("deduplicates subreddits", () => {
      const result = getSubredditsForLocation("CA");
      // bayarea appears in state and multiple cities - should be deduplicated
      const bayareaCount = result.filter(s => s === "bayarea").length;
      expect(bayareaCount).toBe(1);
    });

    it("returns subreddits for DC", () => {
      const result = getSubredditsForLocation("DC");
      expect(result).toContain("washingtondc");
    });

    it("returns subreddits for small state with fewer cities", () => {
      const result = getSubredditsForLocation("WY");
      expect(result).toContain("wyoming");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("hasStateData", () => {
    it("returns true for valid state codes", () => {
      expect(hasStateData("CA")).toBe(true);
      expect(hasStateData("NY")).toBe(true);
      expect(hasStateData("TX")).toBe(true);
      expect(hasStateData("FL")).toBe(true);
    });

    it("returns false for invalid state codes", () => {
      expect(hasStateData("XX")).toBe(false);
      expect(hasStateData("ZZ")).toBe(false);
      expect(hasStateData("")).toBe(false);
    });

    it("returns true for all 50 states + DC", () => {
      const states = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
        "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
        "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
        "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
        "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
      ];

      for (const state of states) {
        expect(hasStateData(state)).toBe(true);
      }
    });
  });

  describe("hasCityData", () => {
    it("returns true for valid city in valid state", () => {
      expect(hasCityData("CA", "los-angeles")).toBe(true);
      expect(hasCityData("NY", "new-york-city")).toBe(true);
      expect(hasCityData("TX", "houston")).toBe(true);
    });

    it("returns false for invalid city in valid state", () => {
      expect(hasCityData("CA", "invalid-city")).toBe(false);
    });

    it("returns false for invalid state", () => {
      expect(hasCityData("XX", "los-angeles")).toBe(false);
    });
  });
});
