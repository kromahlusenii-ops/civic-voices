const HAM_API_BASE = "https://goham.dev/api/mcp"

/**
 * Verify a HAM API key is valid for the given repo by calling the HAM MCP endpoint.
 * Returns true if the key is authorized for this repo.
 */
export async function resolveApiKey(apiKey: string, repoId: string): Promise<boolean> {
  try {
    const response = await fetch(`${HAM_API_BASE}/${repoId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: "auth-check",
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
