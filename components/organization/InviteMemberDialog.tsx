"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBoards } from "@/lib/hooks/useBoards";
import { Plus, ArrowLeft, Settings, Loader2, AlertCircle, Trash2, X, Users as UsersIcon, Edit2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InviteMemberDialog } from "@/components/organization/InviteMemberDialog";

interface Board {
  id: string;
  name: string;
  color: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
  created_by: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  users: {
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
}

export default function OrganizationPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { boards, loading, createBoard } = useBoards(orgId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  
  // Delete board states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Settings states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deleteOrgDialogOpen, setDeleteOrgDialogOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  
  const supabase = createClient();

  // Fetch organization details
  useEffect(() => {
    if (orgId) {
      fetchOrganization();
    }
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) throw error;
      setOrganization(data);
      setNewOrgName(data.name);
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          role,
          users!organization_members_user_id_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .eq("organization_id", orgId);

      if (error) {
        console.error("Error fetching members:", error);
        throw error;
      }

      console.log("Members data:", data);
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    fetchMembers();
  };

  const handleUpdateOrgName = async () => {
    if (!newOrgName.trim() || newOrgName === organization?.name) {
      setEditingOrgName(false);
      return;
    }

    setSavingOrgName(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: newOrgName.trim() })
        .eq("id", orgId);

      if (error) throw error;

      setOrganization({ ...organization!, name: newOrgName.trim() });
      setEditingOrgName(false);
    } catch (error: any) {
      alert(`Failed to update organization name: ${error.message}`);
    } finally {
      setSavingOrgName(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail} from this organization?`)) return;

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      fetchMembers();
    } catch (error: any) {
      alert(`Failed to remove member: ${error.message}`);
    }
  };

  const handleDeleteOrganization = async () => {
    setDeletingOrg(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;

      router.push("/organizations");
    } catch (error: any) {
      alert(`Failed to delete organization: ${error.message}`);
      setDeletingOrg(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const board = await createBoard(boardName.trim());
      setDialogOpen(false);
      setBoardName("");
      router.push(`/organizations/${orgId}/boards/${board.id}`);
    } catch (error: any) {
      setError(error.message || "Failed to create board");
      alert(`Failed to create board: ${error.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return;

    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from("boards")
        .delete()
        .eq("id", boardToDelete.id);

      if (deleteError) throw deleteError;

      setDeleteDialogOpen(false);
      setBoardToDelete(null);
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to delete board: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoardToDelete(board);
    setDeleteDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/organizations")}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {organization?.name || "Boards"}
                </h1>
                <p className="text-sm text-gray-600 mt-1">Manage your team's boards and tasks</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Temporarily disabled - fix invitation component */}
            {/* <InviteMemberDialog organizationId={orgId} /> */}
            <button 
              onClick={handleSettingsClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all shadow-sm border border-gray-200 group"
            >
              <Settings className="w-4 h-4 text-gray-600 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-medium text-gray-700">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              className="relative h-36 rounded-2xl overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <button
                onClick={() =>
                  router.push(`/organizations/${orgId}/boards/${board.id}`)
                }
                className="w-full h-full p-6 text-white font-bold text-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${board.color} 0%, ${board.color}dd 100%)`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/0 to-black/20 group-hover:from-black/10 transition-all" />
                <span className="relative z-10 drop-shadow-md">{board.name}</span>
              </button>
              
              <button
                onClick={(e) => openDeleteDialog(board, e)}
                className="absolute top-3 right-3 p-2.5 bg-red-500/90 hover:bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-lg backdrop-blur-sm"
                title="Delete board"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="h-36 bg-white/60 backdrop-blur-sm border-2 border-dashed border-gray-300 rounded-2xl hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all flex flex-col items-center justify-center group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-gray-700 font-semibold">Create Board</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateBoard}>
                <DialogHeader className="space-y-4">
                  <DialogTitle className="text-2xl">Create Board</DialogTitle>
                  <DialogDescription className="text-base">
                    Create a new board to organize your tasks and collaborate with your team.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-4">
                    <Label htmlFor="boardName">Board Name</Label>
                    <Input
                      id="boardName"
                      value={boardName}
                      onChange={(e) => setBoardName(e.target.value)}
                      placeholder="Enter board name"
                      className="col-span-3"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setBoardName("");
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !boardName.trim()}>
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Board"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Organization Name */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Name</h3>
                <div className="flex items-center gap-3">
                  {editingOrgName ? (
                    <>
                      <Input
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={handleUpdateOrgName} disabled={savingOrgName} size="sm">
                        {savingOrgName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => {
                        setEditingOrgName(false);
                        setNewOrgName(organization?.name || "");
                      }} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-gray-700 font-medium">{organization?.name}</p>
                      <Button onClick={() => setEditingOrgName(true)} variant="outline" size="sm">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Members ({members.length})</h3>
                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.users?.raw_user_meta_data?.full_name?.[0] || member.users?.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.users?.raw_user_meta_data?.full_name || member.users?.email || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-600">{member.users?.email || 'No email'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            member.role === 'admin' || member.role === 'owner' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.role}
                          </span>
                          {member.user_id !== user?.id && (
                            <Button
                              onClick={() => handleRemoveMember(member.id, member.users?.email || 'this user')}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">
                    Deleting this organization will permanently remove all boards, lists, cards, and member associations. This action cannot be undone.
                  </p>
                  <Button
                    onClick={() => setDeleteOrgDialogOpen(true)}
                    variant="outline"
                    className="bg-red-600 text-white hover:bg-red-700 border-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Organization
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation */}
      {deleteOrgDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Organization</h2>
              </div>
              <button
                onClick={() => setDeleteOrgDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                disabled={deletingOrg}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Do you want to delete the organization <span className="font-bold">"{organization?.name}"</span>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This will permanently delete all boards, lists, cards, and remove all members.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteOrgDialogOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={deletingOrg}
                >
                  No
                </button>
                <button
                  onClick={handleDeleteOrganization}
                  disabled={deletingOrg}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {deletingOrg ? (
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

      {/* Delete Board Dialog */}
      {deleteDialogOpen && boardToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Board</h2>
              </div>
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setBoardToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Do you want to delete the board <span className="font-bold">"{boardToDelete.name}"</span>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This will permanently delete all lists and cards in this board.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setBoardToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={deleting}
                >
                  No
                </button>
                <button
                  onClick={handleDeleteBoard}
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
  );
}