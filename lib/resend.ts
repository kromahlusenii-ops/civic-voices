import { Resend } from "resend"

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && process.env.NODE_ENV === "production") {
  console.warn("RESEND_API_KEY is not set - emails will not be sent")
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

// Email sender configuration
export const EMAIL_FROM = process.env.EMAIL_FROM || "Civic Voices <lou@civicvoices.ai>"

// Check if email sending is available
export function isEmailEnabled(): boolean {
  return resend !== null
}
