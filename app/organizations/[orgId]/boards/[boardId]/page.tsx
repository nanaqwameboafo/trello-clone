"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ArrowLeft, Star, Users, UserPlus, Loader2 } from "lucide-react";
import Board from "@/components/board/Board";
import InviteMemberModal from "@/components/invitations/InviteMemberModal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type BoardType = Database["public"]["Tables"]["boards"]["Row"];

export default function BoardPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const orgId = params.orgId as string;
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .single();

      if (error) throw error;
      setBoard(data);
    } catch (error) {
      console.error("Error fetching board:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Board not found</p>
          <button
            onClick={() => router.push(`/organizations/${orgId}`)}
            className="text-blue-600 hover:underline"
          >
            Go back to boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${board.color} 0%, ${board.color}cc 50%, ${board.color}99 100%)`,
      }}
    >
      <header className="bg-black/30 backdrop-blur-md text-white p-4 border-b border-white/10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/organizations/${orgId}`)}
              className="hover:bg-white/20 p-2.5 rounded-lg transition-all duration-200 group"
              title="Back to boards"
            >
              <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <h1 className="text-xl font-bold tracking-wide">{board.name}</h1>
            <button
              className="hover:bg-white/20 p-2.5 rounded-lg transition-all duration-200 group"
              title="Star this board"
            >
              <Star className="w-5 h-5 group-hover:fill-yellow-300 group-hover:text-yellow-300 transition-all" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/organizations/${orgId}/settings`)}
              className="hover:bg-white/20 p-2.5 rounded-lg transition-all duration-200 group"
              title="View members"
            >
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200 group"
              title="Invite member"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium hidden sm:inline">Invite</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden">
        <Board boardId={boardId} />
      </main>

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
