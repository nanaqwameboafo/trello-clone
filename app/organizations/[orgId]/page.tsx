"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBoards } from "@/lib/hooks/useBoards";
import { Plus, ArrowLeft, Settings, Loader2, AlertCircle, Trash2, X, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import InviteMemberModal from "@/components/invitations/InviteMemberModal";
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

interface Board {
  id: string;
  name: string;
  color: string;
  organization_id: string;
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Delete board states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  // Debug logging
  useEffect(() => {
    console.log("Organization ID:", orgId);
    console.log("User:", user);
    console.log("Boards:", boards);
  }, [orgId, user, boards]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      console.log("Creating board with name:", boardName);
      const board = await createBoard(boardName.trim());
      console.log("Board created successfully:", board);
      setDialogOpen(false);
      setBoardName("");
      router.push(`/organizations/${orgId}/boards/${board.id}`);
    } catch (error: any) {
      console.error("Failed to create board:", error);
      setError(error.message || "Failed to create board");
      alert(`Failed to create board: ${error.message || "Unknown error"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardToDelete) {
      console.log('No board selected for deletion');
      return;
    }

    setDeleting(true);
    try {
      console.log('Attempting to delete board:', boardToDelete.id);

      const { error: deleteError } = await supabase
        .from("boards")
        .delete()
        .eq("id", boardToDelete.id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw deleteError;
      }

      console.log('Board deleted successfully');
      
      // Close modal and reset
      setDeleteDialogOpen(false);
      setBoardToDelete(null);
      
      // Refresh the page to show updated boards list
      window.location.reload();
      
    } catch (error: any) {
      console.error("Error deleting board:", error);
      alert(`Failed to delete board: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent board navigation
    setBoardToDelete(board);
    setDeleteDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/organizations")}
              className="text-black-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Boards</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
            <button 
              onClick={() => router.push(`/organizations/${orgId}/settings`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="relative h-32 rounded-lg overflow-hidden group"
            >
              <button
                onClick={() =>
                  router.push(`/organizations/${orgId}/boards/${board.id}`)
                }
                className="w-full h-full p-4 text-white font-semibold text-lg shadow hover:shadow-lg transition"
                style={{ backgroundColor: board.color }}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition" />
                <span className="relative z-10">{board.name}</span>
              </button>
              
              {/* Delete Button */}
              <button
                onClick={(e) => openDeleteDialog(board, e)}
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                title="Delete board"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="h-32 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex flex-col items-center justify-center">
                <Plus className="w-6 h-6 text-gray-600 mb-2" />
                <span className="text-gray-600 font-medium">Create Board</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateBoard}>
                <DialogHeader className="space-y-4">
                  <DialogTitle className="text-2xl">Create Board</DialogTitle>
                  <DialogDescription className="text-base">
                    Create a new board to organize your tasks and collaborate
                    with your team.
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
                  <Button
                    type="submit"
                    disabled={creating || !boardName.trim()}
                  >
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

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && boardToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
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
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
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
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBoard}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          organizationId={orgId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            alert('Invitation sent successfully!');
          }}
        />
      )}
    </div>
  );
}