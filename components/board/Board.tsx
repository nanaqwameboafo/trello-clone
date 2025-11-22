"use client";

import { useState } from "react";
import { useLists } from "@/lib/hooks/useLists";
import { useCards } from "@/lib/hooks/useCards";
import List from "./List";
import { Plus, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import Card from "./Card";

interface BoardProps {
  boardId: string;
}

export default function Board({ boardId }: BoardProps) {
  const { lists, createList, updateListPosition } = useLists(boardId);
  const { cards, createCard, moveCard } = useCards(boardId);

  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [activeCard, setActiveCard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddList = async () => {
    if (!newListName.trim()) {
      alert("Please enter a list name");
      return;
    }

    console.log("Creating list:", newListName);
    setError(null);

    try {
      const result = await createList(newListName);
      console.log("List created:", result);
      setNewListName("");
      setShowNewList(false);
    } catch (error: any) {
      console.error("Failed to create list:", error);
      setError(error.message || "Failed to create list");
      alert(`Failed to create list: ${error.message || "Unknown error"}`);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveCard(null);
      return;
    }

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) {
      setActiveCard(null);
      return;
    }

    // Check if dropped on a list
    const overListId = over.id.toString().startsWith("list-")
      ? over.id.toString().replace("list-", "")
      : cards.find((c) => c.id === over.id)?.list_id;

    if (!overListId) {
      setActiveCard(null);
      return;
    }

    // Get cards in the target list
    const targetListCards = cards
      .filter((c) => c.list_id === overListId)
      .sort((a, b) => a.position - b.position);

    // Calculate new position
    let newPosition = 0;
    if (over.id !== overListId) {
      const overCardIndex = targetListCards.findIndex((c) => c.id === over.id);
      if (overCardIndex !== -1) {
        newPosition = targetListCards[overCardIndex].position;
      }
    } else {
      newPosition =
        targetListCards.length > 0
          ? targetListCards[targetListCards.length - 1].position + 1
          : 0;
    }

    // Move card if list changed or position changed
    if (
      activeCard.list_id !== overListId ||
      activeCard.position !== newPosition
    ) {
      try {
        await moveCard(activeCard.id, overListId, newPosition);
      } catch (error) {
        console.error("Failed to move card:", error);
      }
    }

    setActiveCard(null);
  };

  // Debug logging
  console.log("Board ID:", boardId);
  console.log("Lists:", lists);
  console.log("Cards:", cards);

  return (
    <div className="h-full">
      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 backdrop-blur-sm text-red-100 px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚠️ Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 h-full">
          <SortableContext
            items={lists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => (
              <List
                key={list.id}
                list={list}
                cards={cards.filter((c) => c.list_id === list.id)}
                onCreateCard={createCard}
              />
            ))}
          </SortableContext>

          {/* Add New List */}
          {showNewList ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 w-80 flex-shrink-0 shadow-lg border border-white/50">
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddList();
                  } else if (e.key === "Escape") {
                    setShowNewList(false);
                    setNewListName("");
                  }
                }}
                placeholder="Enter list name..."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 font-medium"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddList}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  Add List
                </button>
                <button
                  onClick={() => {
                    setShowNewList(false);
                    setNewListName("");
                  }}
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewList(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 w-80 flex-shrink-0 flex items-center justify-center text-white transition-all h-fit shadow-md border border-white/30 group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Add another list</span>
              </div>
            </button>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="bg-white rounded-lg p-4 shadow-2xl rotate-2 cursor-grabbing w-80 border-2 border-blue-400 transform scale-105">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-lg">
                    {activeCard.title}
                  </p>
                  {activeCard.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {activeCard.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
