"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { GripVertical, Trash2, X, Loader2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardModal from "./CardModal";
import { createClient } from "@/lib/supabase/client";

type Card = Database["public"]["Tables"]["cards"]["Row"];

interface CardProps {
  card: Card;
  onDelete?: () => void;
}

export default function Card({ card, onDelete }: CardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the card modal
    setShowDeleteDialog(true);
  };

  const handleDeleteCard = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", card.id);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      console.log("Card deleted successfully");
      setShowDeleteDialog(false);
      
      // Call onDelete callback if provided to refresh the list
      if (onDelete) {
        onDelete();
      }
      
      // Refresh the page to update the board
      window.location.reload();
    } catch (error: any) {
      console.error("Error deleting card:", error);
      alert(`Failed to delete card: ${error.message || "Unknown error"}`);
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border border-gray-100 hover:border-gray-200 hover:bg-gradient-to-br hover:from-white hover:to-gray-50 relative"
      >
        <div className="flex items-start gap-2">
          <div {...listeners}>
            <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity cursor-grab" />
          </div>
          <div
            onClick={() => !isDragging && setShowModal(true)}
            className="flex-1 min-w-0"
          >
            <p className="font-medium text-gray-800 break-words leading-snug">
              {card.title}
            </p>
            {card.description && (
              <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 break-words leading-relaxed">
                {card.description}
              </p>
            )}
          </div>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Delete card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showModal && (
        <CardModal card={card} onClose={() => setShowModal(false)} />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Card</h2>
              </div>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Do you want to delete the card <span className="font-bold">"{card.title}"</span> from the board?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCard}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Yes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}