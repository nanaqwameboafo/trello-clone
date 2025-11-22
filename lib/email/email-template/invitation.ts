interface InvitationEmailProps {
  organizationName: string
  inviterName: string
  inviteUrl: string
  expiresAt: Date
}

export function getInvitationEmailTemplate({
  organizationName,
  inviterName,
  inviteUrl,
  expiresAt
}: InvitationEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Organization Invitation</title>
    </head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">You're Invited! 🎉</h1>
      </div>
      
      <div style="background: white; padding: 40px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">Or copy this link: ${inviteUrl}</p>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px;">⏰ This invitation expires on <strong>${expiresAt.toLocaleDateString()}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}
