'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

type InviteStatus = 'loading' | 'success' | 'error' | 'expired' | 'already_member'

interface InvitationData {
  id: string
  organization_id: string
  status: string
  expires_at: string
  email?: string
  organizations: {
    name: string
  }
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [message, setMessage] = useState('')
  const [orgName, setOrgName] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Validate token format
    if (!token || typeof token !== 'string' || token.length < 10) {
      setStatus('error')
      setMessage('Invalid invitation link format')
      return
    }

    const acceptInvite = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          // Store intended destination and redirect to login
          sessionStorage.setItem('invite_redirect', `/invite/${token}`)
          router.push(`/login?redirect=/invite/${token}`)
          return
        }

        // Get invitation details with error handling
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .select('*, organizations(name)')
          .eq('token', token)
          .maybeSingle() // Use maybeSingle to handle no results gracefully

        if (inviteError) {
          console.error('Invitation fetch error:', inviteError)
          setStatus('error')
          setMessage('Failed to retrieve invitation details')
          return
        }

        if (!invitation) {
          setStatus('error')
          setMessage('This invitation link is invalid or has been deleted')
          return
        }

        const invitationData = invitation as InvitationData
        setOrgName(invitationData.organizations.name)

        // Check if invitation is expired
        const expiresAt = new Date(invitationData.expires_at)
        const now = new Date()
        
        if (expiresAt < now) {
          setStatus('expired')
          setMessage(`This invitation expired on ${expiresAt.toLocaleDateString()}`)
          return
        }

        // Check if invitation is already accepted
        if (invitationData.status === 'accepted') {
          setStatus('error')
          setMessage('This invitation has already been used')
          return
        }

        // Verify email match if invitation has specific email
        if (invitationData.email && invitationData.email !== user.email) {
          setStatus('error')
          setMessage(`This invitation is for ${invitationData.email}. You are logged in as ${user.email}`)
          return
        }

        // Check if user is already a member
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', invitationData.organization_id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (memberCheckError) {
          console.error('Member check error:', memberCheckError)
          throw new Error('Failed to verify membership status')
        }

        if (existingMember) {
          setStatus('already_member')
          setMessage(`You're already a member of ${invitationData.organizations.name}`)
          // Still redirect them to the org
          setTimeout(() => {
            router.push(`/organizations/${invitationData.organization_id}`)
          }, 2000)
          return
        }

        // Use transaction-like pattern: add member first, then update invitation
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: invitationData.organization_id,
            user_id: user.id,
            role: 'member',
            joined_at: new Date().toISOString()
          })

        if (memberError) {
          console.error('Member insert error:', memberError)
          
          // Check if it's a duplicate key error (user was added between checks)
          if (memberError.code === '23505') {
            setStatus('already_member')
            setMessage(`You're already a member of ${invitationData.organizations.name}`)
            setTimeout(() => {
              router.push(`/organizations/${invitationData.organization_id}`)
            }, 2000)
            return
          }
          
          throw new Error('Failed to add you to the organization')
        }

        // Update invitation status
        const { error: updateError } = await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: user.id
          })
          .eq('id', invitationData.id)

        if (updateError) {
          console.error('Invitation update error:', updateError)
          // Don't fail the whole process if just the status update fails
        }

        setStatus('success')
        setMessage(`You've successfully joined ${invitationData.organizations.name}!`)

        // Clear any stored redirect
        sessionStorage.removeItem('invite_redirect')

        // Redirect to organization page
        setTimeout(() => {
          router.push(`/organizations/${invitationData.organization_id}`)
        }, 2000)

      } catch (err: any) {
        console.error('Invitation acceptance error:', err)
        setStatus('error')
        setMessage(err.message || 'An unexpected error occurred. Please try again.')
      }
    }

    acceptInvite()
  }, [token, router, supabase, retryCount])

  const handleRetry = () => {
    setStatus('loading')
    setMessage('')
    setRetryCount(prev => prev + 1)
  }

  const handleGoToOrganizations = () => {
    router.push('/organizations')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing Invitation</h1>
            <p className="text-gray-600">Please wait while we verify your access...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome Aboard!</h1>
            <p className="text-gray-600 mb-2">{message}</p>
            {orgName && (
              <p className="text-sm text-gray-500 mt-4">
                Redirecting you to {orgName}...
              </p>
            )}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </>
        )}

        {status === 'already_member' && (
          <>
            <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Already a Member</h1>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Taking you to your organization...</p>
          </>
        )}

        {status === 'expired' && (
          <>
            <XCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitation Expired</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Please contact the organization administrator to request a new invitation.
              </p>
              <button
                onClick={handleGoToOrganizations}
                className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Organizations
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Unable to Accept Invitation</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={handleGoToOrganizations}
                className="w-full bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go to Organizations
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}