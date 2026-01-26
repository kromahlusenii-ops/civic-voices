// SendGrid email client for transactional email delivery

import sgMail from "@sendgrid/mail"

const FROM_EMAIL = process.env.EMAIL_FROM || "Civic Voices <alerts@civicvoices.ai>"

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

interface SendGridResponse {
  success: boolean
  error?: string
}

class SendGridClient {
  private initialized = false

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY
    if (apiKey) {
      sgMail.setApiKey(apiKey)
      this.initialized = true
    } else {
      console.warn("SENDGRID_API_KEY environment variable is not set")
    }
  }

  async send(params: SendEmailParams): Promise<SendGridResponse> {
    if (!this.initialized) {
      throw new Error("SENDGRID_API_KEY is not configured")
    }

    try {
      const [response] = await sgMail.send({
        to: params.to,
        from: FROM_EMAIL,
        subject: params.subject,
        html: params.html,
      })
      console.log(`[SendGrid] Email sent successfully (status: ${response.statusCode})`)
      return { success: true }
    } catch (error: unknown) {
      const sgError = error as { response?: { body?: { errors?: { message: string }[] } }; message?: string }
      const message = sgError?.response?.body?.errors?.[0]?.message || sgError.message || "Unknown error"
      console.error(`[SendGrid] Failed to send email:`, message)
      return { success: false, error: message }
    }
  }
}

let client: SendGridClient | null = null

export function getSendGridClient(): SendGridClient {
  if (!client) {
    client = new SendGridClient()
  }
  return client
}

export function isSendGridEnabled(): boolean {
  return !!process.env.SENDGRID_API_KEY
}

// ─── Email Template Helpers ────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Civic Voices</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #E5E7EB;">
              <span style="font-size: 20px; font-weight: 700; color: #111827;">Civic Voices</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #E5E7EB; background-color: #F9FAFB;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                Civic Voices &mdash; Real-time social intelligence
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Alert Digest Email ────────────────────────────────────────────────────

interface AlertDigestParams {
  searchQuery: string
  totalPosts: number
  postsIncluded: number
  summary: string
  postsHtml: string
  unsubscribeUrl: string
  frequency: string
  searchUrl: string
}

export function buildAlertDigestEmail(params: AlertDigestParams): { subject: string; html: string } {
  const subject = `Alert: ${params.totalPosts} new mentions for "${params.searchQuery}"`

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 22px; color: #111827;">${params.searchQuery}</h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #6B7280;">
      ${params.totalPosts} mentions found &middot; ${params.frequency} digest &middot; showing top ${params.postsIncluded}
    </p>

    <!-- Summary -->
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${params.summary}
      </p>
    </div>

    <!-- Posts -->
    <div>
      ${params.postsHtml}
    </div>

    <!-- View More Posts -->
    ${params.totalPosts > params.postsIncluded ? `
    <div style="text-align: center; margin-top: 24px;">
      <a href="${params.searchUrl}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View all ${params.totalPosts} posts
      </a>
    </div>` : ""}

    <!-- Unsubscribe -->
    <div style="margin-top: 32px; text-align: center;">
      <a href="${params.unsubscribeUrl}" style="font-size: 12px; color: #9CA3AF; text-decoration: underline;">
        Manage alert preferences
      </a>
    </div>`

  return { subject, html: emailWrapper(content) }
}

// ─── Recipient Verification Email ──────────────────────────────────────────

interface VerifyRecipientParams {
  ownerName: string
  ownerEmail: string
  searchQuery: string
  verifyUrl: string
}

export function buildVerifyRecipientEmail(params: VerifyRecipientParams): { subject: string; html: string } {
  const subject = `Verify your email for Civic Voices alerts`

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Confirm your email</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
      <strong>${params.ownerName}</strong> (${params.ownerEmail}) added you as a recipient for alerts about
      <strong>&ldquo;${params.searchQuery}&rdquo;</strong> on Civic Voices.
    </p>
    <p style="margin: 0 0 24px; font-size: 14px; color: #374151; line-height: 1.6;">
      Click the button below to verify your email and start receiving alert digests.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        Verify my email
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
      If you didn&rsquo;t expect this, you can safely ignore this email.
    </p>`

  return { subject, html: emailWrapper(content) }
}

// ─── Report Ready Email ────────────────────────────────────────────────────

interface ReportReadyParams {
  searchQuery: string
  totalPosts: number
  reportUrl: string
  topInsight: string
}

export function buildReportReadyEmail(params: ReportReadyParams): { subject: string; html: string } {
  const subject = `Your report on "${params.searchQuery}" is ready`

  const content = `
    <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Your report is ready</h2>
    <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
      We analyzed <strong>${params.totalPosts} posts</strong> about <strong>&ldquo;${params.searchQuery}&rdquo;</strong> and your report is now available.
    </p>

    <!-- Top Insight -->
    <div style="background-color: #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Top Insight</p>
      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
        ${params.topInsight}
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.reportUrl}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        View full report
      </a>
    </div>`

  return { subject, html: emailWrapper(content) }
}
