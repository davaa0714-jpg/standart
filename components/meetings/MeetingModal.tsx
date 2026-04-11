'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  orgId: string
}

interface FormData {
  meeting_date: string
  held_date: string
  location: string
  notes: string
}

export function MeetingModal({ isOpen, onClose, onSuccess, orgId }: MeetingModalProps) {
  const [formData, setFormData] = useState<FormData>({
    meeting_date: '',
    held_date: '',
    location: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('meetings').insert({
        ...formData,
        org_id: orgId,
        created_by: user.id,
        status: 'scheduled'
      })

      if (error) throw error

      onSuccess()
      onClose()
      setFormData({ meeting_date: '', held_date: '', location: '', notes: '' })
    } catch (err: any) {
      setError(err.message || 'Meeting creation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-tx">Shinee khural buregkh</h2>
          <button
            onClick={onClose}
            className="text-tx3 hover:text-tx transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Meeting Date */}
          <div>
            <label className="block text-sm font-medium text-tx mb-1">
              Khuraliin udur <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={formData.meeting_date}
              onChange={(e) => handleInputChange('meeting_date', e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
              placeholder="04/06/2026"
            />
          </div>

          {/* Held Date */}
          <div>
            <label className="block text-sm font-medium text-tx mb-1">
              Bolson udur
            </label>
            <input
              type="date"
              value={formData.held_date}
              onChange={(e) => handleInputChange('held_date', e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-tx mb-1">
              Baishlui
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
              placeholder="Room/Location"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-tx mb-1">
              Temdeglel
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none resize-none"
              placeholder="Meeting notes and description..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-surface2 border border-border rounded-lg text-tx hover:bg-surface3 transition-colors disabled:opacity-50"
            >
              Bolikh
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {loading ? 'Burtgej baina...' : 'Burtgekh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
