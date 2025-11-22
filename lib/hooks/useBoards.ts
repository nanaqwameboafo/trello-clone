'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Board = Database['public']['Tables']['boards']['Row']

interface UseBoardsResult {
  boards: Board[]
  loading: boolean
  createBoard: (name: string, color?: string) => Promise<Board | undefined>
  deleteBoard: (boardId: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useBoards(organizationId: string | null): UseBoardsResult {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchBoards = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      console.log('Fetching boards for org:', organizationId)
      
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      console.log('Fetched boards:', data)
      console.log('Fetch error:', error)

      if (error) throw error
      setBoards(data || [])
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId, supabase])

  useEffect(() => {
    if (organizationId) {
      fetchBoards()
    }
  }, [organizationId, fetchBoards])

  const createBoard = async (name: string, color?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !organizationId) {
        throw new Error('Not authenticated or no organization selected')
      }

      console.log('Creating board:', { name, color, organizationId, userId: user.id })

      const { data, error } = await supabase
        .from('boards')
        .insert({
          organization_id: organizationId,
          name,
          color: color || '#0079BF',
          created_by: user.id,
        })
        .select()
        .single()

      console.log('Board creation result:', data)
      console.log('Board creation error:', error)

      if (error) throw error

      await fetchBoards()
      return data
    } catch (error: any) {
      console.error('Error creating board:', error)
      throw error
    }
  }

  const deleteBoard = async (boardId: string) => {
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)

      if (error) throw error
      await fetchBoards()
    } catch (error) {
      console.error('Error deleting board:', error)
      throw error
    }
  }

  return useMemo(() => ({
    boards,
    loading,
    createBoard,
    deleteBoard,
    refetch: fetchBoards,
  }), [boards, loading, createBoard, deleteBoard, fetchBoards])
}
