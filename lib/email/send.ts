// ============================================
// FILE 5: lib/email/send.ts
// ============================================

import { getInvitationEmailTemplate } from './email-template/invitation'

interface SendInvitationEmailParams {
  to: string
  organizationName: string
  inviterName: string
  inviteUrl: string
  expiresAt: Date
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  const { to, organizationName, inviterName, inviteUrl, expiresAt } = params

  // Using Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      to,
      subject: `You've been invited to join ${organizationName}`,
      html: getInvitationEmailTemplate({ organizationName, inviterName, inviteUrl, expiresAt })
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }

  return await response.json()
}