'use client'

import { useState, useEffect } from 'react'
import { X, Clock, Trash2, Save } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useCards } from '@/lib/hooks/useCards'

type Card = Database['public']['Tables']['cards']['Row']
type CardActivity = Database['public']['Tables']['card_activities']['Row']

interface CardModalProps {
  card: Card
  onClose: () => void
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [activities, setActivities] = useState<CardActivity[]>([])
  const [listName, setListName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClient()
  const { updateCard, deleteCard } = useCards(null)

  useEffect(() => {
    fetchActivities()
    fetchListName()
  }, [card.id])

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('card_activities')
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: false })

    if (data) setActivities(data)
  }

  const fetchListName = async () => {
    const { data } = await supabase
      .from('lists')
      .select('name')
      .eq('id', card.list_id)
      .single()

    if (data) setListName(data.name)
  }

  const handleSave = async () => {
    try {
      await updateCard(card.id, { title, description })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update card:', error)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(card.id)
        onClose()
      } catch (error) {
        console.error('Failed to delete card:', error)
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'just now'
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold text-gray-800 w-full border-b-2 border-blue-500 focus:outline-none mb-2"
                />
              ) : (
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
              )}
              <p className="text-sm text-gray-600">
                in list <span className="font-semibold">{listName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-700">Description</h4>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditing ? (
                <>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    placeholder="Add a more detailed description..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setTitle(card.title)
                        setDescription(card.description || '')
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : description ? (
                <p className="text-gray-600 whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-gray-400 italic">No description</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity
              </h4>
              <div className="space-y-3">
                {activities.map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                      U
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">User</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 px-3 py-2 rounded hover:bg-red-50 transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete Card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}