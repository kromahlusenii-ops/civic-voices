// Loops API client for transactional email delivery

const LOOPS_API_URL = "https://app.loops.so/api/v1"

interface SendTransactionalEmailParams {
  transactionalId: string
  email: string
  dataVariables?: Record<string, string | number>
  addToAudience?: boolean
}

interface LoopsResponse {
  success: boolean
  id?: string
  error?: string
}

class LoopsClient {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.LOOPS_API_KEY!
    if (!this.apiKey) {
      console.warn("LOOPS_API_KEY environment variable is not set")
    }
  }

  private async request(endpoint: string, options: RequestInit): Promise<LoopsResponse> {
    if (!this.apiKey) {
      throw new Error("LOOPS_API_KEY is not configured")
    }

    const response = await fetch(`${LOOPS_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Loops API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    console.log(`[Loops] API response:`, JSON.stringify(data))
    return data
  }

  async sendTransactionalEmail(params: SendTransactionalEmailParams): Promise<LoopsResponse> {
    return this.request("/transactional", {
      method: "POST",
      body: JSON.stringify({
        transactionalId: params.transactionalId,
        email: params.email,
        dataVariables: params.dataVariables || {},
        addToAudience: params.addToAudience ?? false,
      }),
    })
  }
}

let loopsClient: LoopsClient | null = null

export function getLoopsClient(): LoopsClient {
  if (!loopsClient) {
    loopsClient = new LoopsClient()
  }
  return loopsClient
}

// Check if Loops is configured
export function isLoopsEnabled(): boolean {
  return !!process.env.LOOPS_API_KEY
}

// Template IDs (from environment)
export const LOOPS_TEMPLATES = {
  alertDigest: process.env.LOOPS_ALERT_DIGEST_TEMPLATE_ID || "",
  verifyRecipient: process.env.LOOPS_VERIFY_RECIPIENT_TEMPLATE_ID || "",
  reportReady: process.env.LOOPS_REPORT_READY_TEMPLATE_ID || "",
}
