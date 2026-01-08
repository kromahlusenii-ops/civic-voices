/**
 * Boolean Query Parser and Matcher
 *
 * Parses Boolean search queries (AND, OR, parentheses) and matches against text.
 * Used for client-side filtering on platforms that don't support Boolean syntax.
 */

export type BooleanNode =
  | { type: "term"; value: string }
  | { type: "and"; left: BooleanNode; right: BooleanNode }
  | { type: "or"; left: BooleanNode; right: BooleanNode };

/**
 * Tokenize a Boolean query string
 */
function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes && (char === "(" || char === ")")) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push(char);
    } else if (!inQuotes && char === " ") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parse tokens into an AST
 */
function parseTokens(tokens: string[]): BooleanNode {
  let pos = 0;

  function parseOr(): BooleanNode {
    let left = parseAnd();

    while (pos < tokens.length && tokens[pos].toUpperCase() === "OR") {
      pos++; // consume OR
      const right = parseAnd();
      left = { type: "or", left, right };
    }

    return left;
  }

  function parseAnd(): BooleanNode {
    let left = parseTerm();

    while (pos < tokens.length) {
      const token = tokens[pos].toUpperCase();
      if (token === "AND") {
        pos++; // consume AND
        const right = parseTerm();
        left = { type: "and", left, right };
      } else if (token !== "OR" && token !== ")" && tokens[pos] !== ")") {
        // Implicit AND (space between terms)
        const right = parseTerm();
        left = { type: "and", left, right };
      } else {
        break;
      }
    }

    return left;
  }

  function parseTerm(): BooleanNode {
    if (pos >= tokens.length) {
      return { type: "term", value: "" };
    }

    const token = tokens[pos];

    if (token === "(") {
      pos++; // consume (
      const node = parseOr();
      if (pos < tokens.length && tokens[pos] === ")") {
        pos++; // consume )
      }
      return node;
    }

    // Skip AND/OR if they appear at term position (malformed query)
    if (token.toUpperCase() === "AND" || token.toUpperCase() === "OR") {
      pos++;
      return parseTerm();
    }

    pos++;
    // Remove quotes if present
    const value = token.replace(/^"|"$/g, "");
    return { type: "term", value };
  }

  return parseOr();
}

/**
 * Parse a Boolean query string into an AST
 */
export function parseBooleanQuery(query: string): BooleanNode {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { type: "term", value: query };
  }
  return parseTokens(tokens);
}

/**
 * Check if text matches a Boolean query AST
 */
export function matchesBooleanQuery(text: string, node: BooleanNode): boolean {
  const lowerText = text.toLowerCase();

  switch (node.type) {
    case "term":
      return lowerText.includes(node.value.toLowerCase());
    case "and":
      return matchesBooleanQuery(text, node.left) && matchesBooleanQuery(text, node.right);
    case "or":
      return matchesBooleanQuery(text, node.left) || matchesBooleanQuery(text, node.right);
  }
}

/**
 * Extract the base search term from a Boolean query
 * Used for APIs that don't support Boolean syntax
 * Finds the most meaningful search term to use
 */
export function extractBaseQuery(query: string): string {
  // If no Boolean operators, return as-is
  if (!/\b(AND|OR)\b/i.test(query) && !/[()]/.test(query)) {
    return query.trim();
  }

  // If query starts with parentheses, look for term after the group
  if (query.trim().startsWith("(")) {
    // Find content after closing paren and AND/OR
    const afterParenMatch = query.match(/\)\s*(?:AND|OR)\s+(.+?)(?:\s+(?:AND|OR)\s+|\s*\(|$)/i);
    if (afterParenMatch) {
      return afterParenMatch[1].trim();
    }
    // Fallback: extract first term inside parentheses
    const insideMatch = query.match(/\(([^()]+?)(?:\s+(?:AND|OR)\s+|\))/i);
    if (insideMatch) {
      return insideMatch[1].trim();
    }
  }

  // Find the first meaningful term before AND/OR or parentheses
  const match = query.match(/^([^(]+?)(?:\s+(?:AND|OR)\s+|\s*\()/i);
  if (match) {
    return match[1].trim();
  }

  // Fallback: get first part before AND/OR
  const parts = query.split(/\s+(?:AND|OR)\s+/i);
  return parts[0].replace(/[()]/g, "").trim();
}

/**
 * Check if a query contains Boolean operators
 */
export function hasBooleanOperators(query: string): boolean {
  return /\b(AND|OR)\b/i.test(query) || /[()]/.test(query);
}

/**
 * Filter posts based on Boolean query matching
 */
export function filterPostsByBooleanQuery<T extends { text: string }>(
  posts: T[],
  query: string
): T[] {
  if (!hasBooleanOperators(query)) {
    // No Boolean operators, return as-is (basic search already done by API)
    return posts;
  }

  const ast = parseBooleanQuery(query);
  return posts.filter((post) => matchesBooleanQuery(post.text, ast));
}
