import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  console.log('🔥 Invitation API called')
  
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    const body = await req.json()
    console.log('📦 Request body:', body)
    
    const { email, organizationId, role = 'member' } = body

    if (!email || !organizationId) {
      console.error('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Email and organization ID are required' },
        { status: 400 }
      )
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    console.log('👤 User role:', membership?.role)

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      console.error('❌ Insufficient permissions')
      return NextResponse.json(
        { error: 'Only admins and owners can invite members' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      console.error('❌ Organization not found')
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    console.log('🏢 Organization:', organization.name)

    // Generate token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    console.log('🔑 Generated token:', token.substring(0, 10) + '...')

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        token,
        email: email.toLowerCase(),
        organization_id: organizationId,
        invited_by: user.id,
        role,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: inviteError.message 
      }, { status: 500 })
    }

    console.log('✅ Invitation created:', invitation.id)

    // Send email (if configured)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    
    console.log('📧 Email config check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      inviteUrl
    })

    if (process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject: `You've been invited to join ${organization.name}`,
            html: `
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
                  <p><strong>${user.email}</strong> has invited you to join <strong>${organization.name}</strong>.</p>
                  
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
          })
        })

        const emailResult = await emailResponse.json()
        
        if (!emailResponse.ok) {
          console.error('❌ Email send failed:', emailResult)
        } else {
          console.log('✅ Email sent successfully')
        }
      } catch (emailError) {
        console.error('❌ Email error:', emailError)
        // Don't fail the whole request if email fails
      }
    } else {
      console.log('⚠️ RESEND_API_KEY not configured')
      console.log('📋 Copy this invite URL:', inviteUrl)
    }

    return NextResponse.json({
      success: true,
      invitation: { 
        id: invitation.id, 
        email: invitation.email,
        inviteUrl // Include URL in response for easy access
      }
    })

  } catch (error) {
    console.error('❌ Server error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also handle GET requests for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Invitation API is working! Use POST to send invitations.' 
  })
}