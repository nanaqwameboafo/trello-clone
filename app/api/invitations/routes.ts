
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

    console.log('🔑 Generated token:', token)

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
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    console.log('✅ Invitation created:', invitation.id)

    // Check environment variables
    const hasResendKey = !!process.env.RESEND_API_KEY
    const hasEmailFrom = !!process.env.EMAIL_FROM
    const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL

    console.log('📧 Email config:', {
      hasResendKey,
      hasEmailFrom,
      hasAppUrl,
      emailFrom: process.env.EMAIL_FROM,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    })

    if (!hasResendKey) {
      console.error('❌ RESEND_API_KEY not configured')
      return NextResponse.json({
        success: true,
        warning: 'Invitation created but email not sent - RESEND_API_KEY missing',
        invitation: { id: invitation.id, email: invitation.email }
      })
    }

    // Send email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    console.log('📨 Sending email to:', email)
    console.log('🔗 Invite URL:', inviteUrl)

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
            <h1>You're Invited!</h1>
            <p>${user.email} has invited you to join ${organization.name}.</p>
            <p><a href="${inviteUrl}">Click here to accept your invitation</a></p>
            <p>Or copy this link: ${inviteUrl}</p>
          `
        })
      })

      const emailResult = await emailResponse.json()
      console.log('📧 Email API response:', emailResult)

      if (!emailResponse.ok) {
        console.error('❌ Email send failed:', emailResult)
        return NextResponse.json({
          success: true,
          warning: 'Invitation created but email failed to send',
          emailError: emailResult,
          invitation: { id: invitation.id, email: invitation.email }
        })
      }

      console.log('✅ Email sent successfully!')

    } catch (emailError) {
      console.error('❌ Email error:', emailError)
      return NextResponse.json({
        success: true,
        warning: 'Invitation created but email failed',
        invitation: { id: invitation.id, email: invitation.email }
      })
    }

    return NextResponse.json({
      success: true,
      invitation: { id: invitation.id, email: invitation.email }
    })

  } catch (error) {
    console.error('❌ Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}