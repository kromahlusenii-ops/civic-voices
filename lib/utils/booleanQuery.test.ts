import { describe, it, expect } from "vitest";
import {
  parseBooleanQuery,
  matchesBooleanQuery,
  extractBaseQuery,
  hasBooleanOperators,
  filterPostsByBooleanQuery,
  type BooleanNode,
} from "./booleanQuery";

describe("booleanQuery", () => {
  describe("parseBooleanQuery", () => {
    it("parses simple term", () => {
      const result = parseBooleanQuery("climate");
      expect(result).toEqual({ type: "term", value: "climate" });
    });

    it("parses two terms with AND", () => {
      const result = parseBooleanQuery("climate AND change");
      expect(result).toEqual({
        type: "and",
        left: { type: "term", value: "climate" },
        right: { type: "term", value: "change" },
      });
    });

    it("parses two terms with OR", () => {
      const result = parseBooleanQuery("hope OR fear");
      expect(result).toEqual({
        type: "or",
        left: { type: "term", value: "hope" },
        right: { type: "term", value: "fear" },
      });
    });

    it("parses parentheses grouping", () => {
      const result = parseBooleanQuery("climate AND (hope OR fear)");
      expect(result).toEqual({
        type: "and",
        left: { type: "term", value: "climate" },
        right: {
          type: "or",
          left: { type: "term", value: "hope" },
          right: { type: "term", value: "fear" },
        },
      });
    });

    it("parses multi-word base query with parentheses", () => {
      const result = parseBooleanQuery("climate change AND (policy OR law)");
      expect(result.type).toBe("and");
      const andNode = result as { type: "and"; left: BooleanNode; right: BooleanNode };
      // "climate" and "change" are implicitly ANDed
      expect(andNode.left.type).toBe("and");
    });

    it("handles case-insensitive operators", () => {
      const result = parseBooleanQuery("hope or fear");
      expect(result.type).toBe("or");
    });

    it("parses complex nested expression", () => {
      const result = parseBooleanQuery("(hope OR fear) AND (policy OR law)");
      expect(result.type).toBe("and");
    });
  });

  describe("matchesBooleanQuery", () => {
    it("matches simple term", () => {
      const ast = parseBooleanQuery("climate");
      expect(matchesBooleanQuery("The climate is changing", ast)).toBe(true);
      expect(matchesBooleanQuery("The weather is nice", ast)).toBe(false);
    });

    it("matches AND expression", () => {
      const ast = parseBooleanQuery("climate AND change");
      expect(matchesBooleanQuery("Climate change is real", ast)).toBe(true);
      expect(matchesBooleanQuery("The climate today", ast)).toBe(false);
      expect(matchesBooleanQuery("Change is coming", ast)).toBe(false);
    });

    it("matches OR expression", () => {
      const ast = parseBooleanQuery("hope OR fear");
      expect(matchesBooleanQuery("I have hope", ast)).toBe(true);
      expect(matchesBooleanQuery("I feel fear", ast)).toBe(true);
      expect(matchesBooleanQuery("I feel nothing", ast)).toBe(false);
    });

    it("matches complex expression with parentheses", () => {
      const ast = parseBooleanQuery("climate AND (hope OR fear)");
      expect(matchesBooleanQuery("The climate gives me hope", ast)).toBe(true);
      expect(matchesBooleanQuery("Climate change causes fear", ast)).toBe(true);
      expect(matchesBooleanQuery("The climate is stable", ast)).toBe(false);
      expect(matchesBooleanQuery("I have hope for the future", ast)).toBe(false);
    });

    it("is case-insensitive", () => {
      const ast = parseBooleanQuery("CLIMATE");
      expect(matchesBooleanQuery("climate change", ast)).toBe(true);
      expect(matchesBooleanQuery("CLIMATE CHANGE", ast)).toBe(true);
    });
  });

  describe("extractBaseQuery", () => {
    it("extracts base from simple query", () => {
      expect(extractBaseQuery("climate change")).toBe("climate change");
    });

    it("extracts base before AND operator", () => {
      expect(extractBaseQuery("climate change AND policy")).toBe("climate change");
    });

    it("extracts base before OR operator", () => {
      expect(extractBaseQuery("climate change OR global warming")).toBe("climate change");
    });

    it("extracts base before parentheses", () => {
      expect(extractBaseQuery("climate change AND (hope OR fear)")).toBe("climate change");
    });

    it("handles query starting with parentheses", () => {
      // When query starts with parentheses, extract term after the group
      expect(extractBaseQuery("(hope OR fear) AND climate")).toBe("climate");
    });
  });

  describe("hasBooleanOperators", () => {
    it("returns false for simple query", () => {
      expect(hasBooleanOperators("climate change")).toBe(false);
    });

    it("returns true for AND", () => {
      expect(hasBooleanOperators("climate AND change")).toBe(true);
    });

    it("returns true for OR", () => {
      expect(hasBooleanOperators("hope OR fear")).toBe(true);
    });

    it("returns true for parentheses", () => {
      expect(hasBooleanOperators("(climate change)")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(hasBooleanOperators("climate and change")).toBe(true);
      expect(hasBooleanOperators("hope or fear")).toBe(true);
    });

    it("does not match AND/OR within words", () => {
      expect(hasBooleanOperators("android")).toBe(false);
      expect(hasBooleanOperators("senator")).toBe(false);
    });
  });

  describe("filterPostsByBooleanQuery", () => {
    const posts = [
      { id: "1", text: "Climate change is causing hope for new policies" },
      { id: "2", text: "I fear the effects of climate change" },
      { id: "3", text: "The weather is nice today" },
      { id: "4", text: "New climate policies are being discussed" },
      { id: "5", text: "Hope springs eternal" },
    ];

    it("returns all posts for simple query (no filtering)", () => {
      const result = filterPostsByBooleanQuery(posts, "climate");
      expect(result).toHaveLength(5); // No Boolean ops, returns as-is
    });

    it("filters with AND operator", () => {
      const result = filterPostsByBooleanQuery(posts, "climate AND hope");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("filters with OR operator", () => {
      const result = filterPostsByBooleanQuery(posts, "hope OR fear");
      expect(result).toHaveLength(3);
      expect(result.map((p) => p.id).sort()).toEqual(["1", "2", "5"]);
    });

    it("filters with complex expression", () => {
      const result = filterPostsByBooleanQuery(posts, "climate AND (hope OR fear)");
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual(["1", "2"]);
    });

    it("filters with policy terms", () => {
      const result = filterPostsByBooleanQuery(posts, "climate AND (policy OR policies)");
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual(["1", "4"]);
    });
  });
});
