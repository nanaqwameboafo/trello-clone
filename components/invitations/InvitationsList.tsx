// app/organizations/[orgId]/settings/page.tsx

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import InviteMemberModal from '@/components/invitations/InviteMemberModal'
import InvitationsList from '@/components/invitations/InvitationsList'
import { UserPlus } from 'lucide-react'

export default function OrganizationSettingsPage() {
  const params = useParams()
  const orgId = params.orgId as string
  const [showInvite, setShowInvite] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Settings</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      <InvitationsList 
        organizationId={orgId} 
        key={refreshKey}
      />

      {showInvite && (
        <InviteMemberModal
          organizationId={orgId}
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setRefreshKey(prev => prev + 1) // Refresh list
            setShowInvite(false)
          }}
        />
      )}
    </div>
  )
}