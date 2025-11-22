'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type List = Database['public']['Tables']['lists']['Row']

export function useLists(boardId: string | null) {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (boardId) {
      fetchLists()
      subscribeToLists()
    }
  }, [boardId])

  const fetchLists = async () => {
    if (!boardId) return

    try {
      console.log('Fetching lists for board:', boardId)
      
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

      console.log('Fetched lists:', data)
      console.log('Lists error:', error)

      if (error) throw error
      setLists(data || [])
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToLists = () => {
    if (!boardId) return

    const channel = supabase
      .channel(`lists:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchLists()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const createList = async (name: string) => {
    try {
      if (!boardId) throw new Error('No board selected')

      console.log('Creating list with name:', name)
      console.log('Board ID:', boardId)
      console.log('Current lists:', lists)

      const maxPosition = lists.length > 0 
        ? Math.max(...lists.map(l => l.position)) 
        : -1

      const newPosition = maxPosition + 1

      console.log('New list position:', newPosition)

      const { data, error } = await supabase
        .from('lists')
        .insert({
          board_id: boardId,
          name,
          position: newPosition,
        })
        .select()
        .single()

      console.log('Created list:', data)
      console.log('Create list error:', error)

      if (error) throw error

      await fetchLists()
      return data
    } catch (error: any) {
      console.error('Error creating list:', error)
      throw error
    }
  }

  const updateListPosition = async (listId: string, newPosition: number) => {
    try {
      const { error } = await supabase
        .from('lists')
        .update({ position: newPosition })
        .eq('id', listId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating list position:', error)
      throw error
    }
  }

  const deleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting list:', error)
      throw error
    }
  }

  return {
    lists,
    loading,
    createList,
    updateListPosition,
    deleteList,
    refetch: fetchLists,
  }
}