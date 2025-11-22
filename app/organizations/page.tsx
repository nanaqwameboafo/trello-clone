'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, Plus, Users, Building2, X, Trash2 } from 'lucide-react'

export default function OrganizationsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orgToDelete, setOrgToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchOrganizations()
    }
  }, [user])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', user?.id)

      if (error) throw error
      
      const orgs = data?.map(item => ({
        ...item.organizations,
        role: item.role
      })) || []
      
      setOrganizations(orgs)

      // Auto-redirect if only one org
      if (orgs.length === 1) {
        router.push(`/organizations/${orgs[0].id}`)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim() || !user?.id) return

    setCreating(true)
    try {
      console.log('Creating organization:', newOrgName)
      console.log('User ID:', user.id)

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ 
          name: newOrgName.trim(), 
          created_by: user.id 
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        throw orgError
      }

      console.log('Organization created:', org)

      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({ 
          organization_id: org.id, 
          user_id: user.id, 
          role: 'admin'  // Changed from 'owner' to 'admin'
        })

      if (memberError) {
        console.error('Member insertion error:', memberError)
        throw memberError
      }

      console.log('Member added successfully')

      setCreateDialogOpen(false)
      setNewOrgName('')
      
      // Refresh organizations list
      await fetchOrganizations()
      
      // Navigate to the new organization
      router.push(`/organizations/${org.id}`)
    } catch (error: any) {
      console.error('Full error:', error)
      alert(`Failed to create organization: ${error.message || JSON.stringify(error)}`)
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgToDelete.id)

      if (error) throw error

      setDeleteDialogOpen(false)
      setOrgToDelete(null)
      
      // Refresh the organizations list
      await fetchOrganizations()
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(`Failed to delete organization: ${error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = (org: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setOrgToDelete(org)
    setDeleteDialogOpen(true)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TaskFlow
            </h1>
            <p className="text-sm text-gray-600 mt-1">Your Organizations</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {organizations.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 max-w-2xl text-center shadow-xl border border-gray-200/50">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to TaskFlow!</h2>
              <p className="text-gray-600 text-lg mb-8">
                You're not part of any organization yet. Create your first organization to get started managing projects with your team.
              </p>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg"
              >
                <Plus className="w-6 h-6" />
                Create Your First Organization
              </button>
            </div>
          </div>
        ) : (
          /* Organizations Grid */
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Workspaces</h2>
                <p className="text-gray-600 mt-1">Select an organization to view boards and collaborate</p>
              </div>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                New Organization
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="group relative"
                >
                  <button
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="w-full bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 text-left border border-gray-200/50 hover:border-blue-200 transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          org.role === 'owner' || org.role === 'admin'
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {org.role}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Click to view boards
                      </p>
                    </div>
                  </button>

                  {/* Delete Button */}
                  {(org.role === 'owner' || org.role === 'admin') && (
                    <button
                      onClick={(e) => openDeleteDialog(org, e)}
                      className="absolute top-3 right-3 p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg"
                      title="Delete organization"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create Organization Modal */}
      {createDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Create Organization</h2>
              </div>
              <button
                onClick={() => {
                  setCreateDialogOpen(false)
                  setNewOrgName('')
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={creating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrganization} className="space-y-6">
              <div>
                <label htmlFor="orgName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                  autoFocus
                  disabled={creating}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Choose a name that represents your team or company
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateDialogOpen(false)
                    setNewOrgName('')
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newOrgName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation Dialog */}
      {deleteDialogOpen && orgToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Organization</h2>
              </div>
              <button
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setOrgToDelete(null)
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Do you want to delete the organization <span className="font-bold">"{orgToDelete.name}"</span>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This will permanently delete all boards, lists, cards, and remove all members.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setOrgToDelete(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={deleting}
                >
                  No
                </button>
                <button
                  onClick={handleDeleteOrganization}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}