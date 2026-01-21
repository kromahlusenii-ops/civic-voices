import { NextRequest, NextResponse } from "next/server"
import { resend, EMAIL_FROM, isEmailEnabled } from "@/lib/resend"

export const dynamic = "force-dynamic"

// Resend template ID for welcome email (from Resend dashboard)
const WELCOME_TEMPLATE_ID = process.env.RESEND_WELCOME_TEMPLATE_ID

interface WelcomeEmailRequest {
  email: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check if email is enabled
    if (!isEmailEnabled() || !resend) {
      console.log("[Email] Resend not configured, skipping welcome email")
      return NextResponse.json({ success: true, skipped: true })
    }

    const body: WelcomeEmailRequest = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    console.log(`[Email] Sending welcome email to ${email}`)

    // Use Resend template if available, otherwise use inline HTML
    const emailOptions = WELCOME_TEMPLATE_ID
      ? {
          from: EMAIL_FROM,
          to: email,
          subject: "Welcome to Civic Voices! 🎉",
          react: undefined,
          // Template with dynamic data
          headers: {
            "X-Entity-Ref-ID": `welcome-${Date.now()}`,
          },
          tags: [{ name: "category", value: "welcome" }],
        }
      : {
          from: EMAIL_FROM,
          to: email,
          subject: "Welcome to Civic Voices! 🎉",
          html: getWelcomeEmailHtml({ userName: name, userEmail: email }),
          text: getWelcomeEmailText({ userName: name, userEmail: email }),
        }

    const { data, error } = await resend.emails.send(emailOptions)

    if (error) {
      console.error("[Email] Failed to send welcome email:", error)
      return NextResponse.json(
        { error: "Failed to send email", details: error.message },
        { status: 500 }
      )
    }

    console.log(`[Email] Welcome email sent successfully, id: ${data?.id}`)

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    })
  } catch (error) {
    console.error("[Email] Error sending welcome email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Fallback HTML template if no Resend template is configured
function getWelcomeEmailHtml({ userName, userEmail }: { userName?: string; userEmail: string }): string {
  const displayName = userName || userEmail.split("@")[0]
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to Civic Voices</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1f2937, #374151); padding: 40px; text-align: center;">
      <div style="display: inline-block; padding: 12px 16px; background: linear-gradient(135deg, #f97316, #14b8a6); border-radius: 10px;">
        <span style="color: white; font-weight: bold; font-size: 24px;">CV</span>
      </div>
      <h1 style="color: white; margin: 20px 0 0;">Welcome to Civic Voices!</h1>
    </div>
    <div style="padding: 40px;">
      <p style="color: #374151; font-size: 18px;">Hi ${displayName},</p>
      <p style="color: #6b7280; line-height: 1.6;">Thank you for joining Civic Voices! You now have access to powerful social listening tools.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://civicvoices.ai/search" style="display: inline-block; padding: 16px 32px; background: #1f2937; color: white; text-decoration: none; border-radius: 50px; font-weight: 600;">Start Your First Search →</a>
      </div>
      <p style="color: #9ca3af; font-size: 14px;">If you have any questions, just reply to this email!</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

function getWelcomeEmailText({ userName, userEmail }: { userName?: string; userEmail: string }): string {
  const displayName = userName || userEmail.split("@")[0]
  return `
Welcome to Civic Voices!

Hi ${displayName},

Thank you for joining Civic Voices! You now have access to powerful social listening tools.

Get started: https://civicvoices.ai/search

If you have any questions, just reply to this email!

- The Civic Voices Team
  `.trim()
}
