"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import Card from "./Card";
import { Plus, MoreHorizontal, X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

type List = Database["public"]["Tables"]["lists"]["Row"];
type CardType = Database["public"]["Tables"]["cards"]["Row"];

interface ListProps {
  list: List;
  cards: CardType[];
  onCreateCard: (
    listId: string,
    title: string,
    description?: string
  ) => Promise<void>;
}

export default function List({ list, cards, onCreateCard }: ListProps) {
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { setNodeRef } = useDroppable({
    id: `list-${list.id}`,
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;

    setIsCreating(true);
    try {
      await onCreateCard(list.id, newCardTitle);
      setNewCardTitle("");
      setShowNewCard(false);
    } catch (error) {
      console.error("Failed to create card:", error);
      alert("Failed to create card. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl p-4 w-80 flex-shrink-0 shadow-md border border-gray-200/50 backdrop-blur-sm">
      {/* List Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-lg px-2">
          {list.name}
        </h3>
        <button className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors">
          <MoreHorizontal className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Cards Container */}
      <div ref={setNodeRef} className="space-y-2 min-h-[4rem] mb-2">
        <SortableContext
          items={sortedCards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>

      {/* Add Card Section */}
      {showNewCard ? (
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <textarea
            autoFocus
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddCard();
              } else if (e.key === "Escape") {
                setShowNewCard(false);
                setNewCardTitle("");
              }
            }}
            placeholder="Enter a title for this card..."
            className="w-full text-sm resize-none border-none focus:outline-none focus:ring-0 min-h-[60px]"
            disabled={isCreating}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleAddCard}
              disabled={isCreating || !newCardTitle.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Adding..." : "Add card"}
            </button>
            <button
              onClick={() => {
                setShowNewCard(false);
                setNewCardTitle("");
              }}
              disabled={isCreating}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewCard(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Add a card</span>
        </button>
      )}
    </div>
  );
}
