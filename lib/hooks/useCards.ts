"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Card = Database["public"]["Tables"]["cards"]["Row"];

export function useCards(boardId: string | null) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (boardId) {
      fetchCards();
      subscribeToCards();
    }
  }, [boardId]);

  const fetchCards = async () => {
    if (!boardId) return;

    try {
      const { data: lists } = await supabase
        .from("lists")
        .select("id")
        .eq("board_id", boardId);

      if (!lists) return;

      const listIds = lists.map((l) => l.id);

      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .in("list_id", listIds)
        .order("position", { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToCards = () => {
    if (!boardId) return;

    const channel = supabase
      .channel(`cards:${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
        },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createCard = async (listId: string, title: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const listCards = cards.filter((c) => c.list_id === listId);
      const maxPosition = Math.max(...listCards.map((c) => c.position), -1);

      const { data: card, error: cardError } = await supabase
        .from("cards")
        .insert({
          list_id: listId,
          title,
          position: maxPosition + 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Optimistically add the card to the UI
      setCards((prevCards) => [...prevCards, card]);

      // Log activity (background)
      await supabase.from("card_activities").insert({
        card_id: card.id,
        user_id: user.id,
        action: "created this card",
      });

      // Real-time subscription will sync naturally
      return card;
    } catch (error) {
      console.error("Error creating card:", error);
      // Revert on error
      await fetchCards();
      throw error;
    }
  };

  const updateCard = async (cardId: string, updates: Partial<Card>) => {
    try {
      const { error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId);

      if (error) throw error;

      // Real-time subscription will handle the update
    } catch (error) {
      console.error("Error updating card:", error);
      throw error;
    }
  };

  const moveCard = async (
    cardId: string,
    newListId: string,
    newPosition: number
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const card = cards.find((c) => c.id === cardId);
      const oldListId = card?.list_id;

      // Optimistic update - immediately update the UI
      setCards((prevCards) => {
        return prevCards.map((c) => {
          if (c.id === cardId) {
            return { ...c, list_id: newListId, position: newPosition };
          }
          return c;
        });
      });

      const { error } = await supabase
        .from("cards")
        .update({
          list_id: newListId,
          position: newPosition,
        })
        .eq("id", cardId);

      if (error) {
        // Revert on error
        await fetchCards();
        throw error;
      }

      // Don't fetch immediately - the real-time subscription will handle it
      // This prevents the visual "snap back" animation

      // Log activity if moved to different list (background task)
      if (oldListId !== newListId) {
        const { data: oldList } = await supabase
          .from("lists")
          .select("name")
          .eq("id", oldListId)
          .single();

        const { data: newList } = await supabase
          .from("lists")
          .select("name")
          .eq("id", newListId)
          .single();

        await supabase.from("card_activities").insert({
          card_id: cardId,
          user_id: user.id,
          action: `moved from "${oldList?.name}" to "${newList?.name}"`,
        });
      }
    } catch (error) {
      console.error("Error moving card:", error);
      throw error;
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);

      if (error) throw error;

      // Real-time subscription will handle the removal
    } catch (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  };

  return {
    cards,
    loading,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    refetch: fetchCards,
  };
}
