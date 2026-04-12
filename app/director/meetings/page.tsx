'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Meeting, Profile } from '@/types/database'

export default function DirectorMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'held' | 'cancelled'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load meetings
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false })

      if (meetingError) throw meetingError

      // Load profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')

      setMeetings(meetingData || [])
      setProfiles(profileData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400'
      case 'held': return 'text-green-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-tx2'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'held': return 'Held'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const getCreatorName = (creatorId: string | null) => {
    if (!creatorId) return 'Unknown'
    const profile = profiles.find(p => p.id === creatorId)
    return profile?.full_name || 'Unknown'
  }

  const filteredMeetings = meetings.filter(meeting => {
    if (filter === 'all') return true
    return meeting.status === filter
  })

  const meetingStats = {
    total: meetings.length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    held: meetings.filter(m => m.status === 'held').length,
    cancelled: meetings.filter(m => m.status === 'cancelled').length
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Loading meetings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Director / Meetings</div>
        <h1 className="text-xl font-bold">Meetings</h1>
        <p className="text-sm text-tx2 mt-0.5">Manage and track all meetings</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3">
          <span className="text-xl">??</span>
          <div className="flex-1">
            <p className="text-sm text-danger-light">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-xs text-danger-light/70 hover:text-danger-light mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{meetingStats.total}</div>
          <div className="text-xs text-tx2">Total Meetings</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{meetingStats.scheduled}</div>
          <div className="text-xs text-tx2">Scheduled</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{meetingStats.held}</div>
          <div className="text-xs text-tx2">Held</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">{meetingStats.cancelled}</div>
          <div className="text-xs text-tx2">Cancelled</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-surface border border-border rounded-xl p-1 mb-6 flex gap-1">
        {(['all', 'scheduled', 'held', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-accent text-white'
                : 'text-tx hover:bg-surface2'
            }`}
          >
            {status === 'all' ? 'All' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Meetings List */}
      <div className="bg-surface border border-border rounded-2xl">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">??</div>
            <div className="text-sm">No meetings found</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="p-4 hover:bg-surface2 transition-colors cursor-pointer"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-tx">
                        {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('mn-MN') : 'No date set'}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(meeting.status)}`}>
                        {getStatusLabel(meeting.status)}
                      </span>
                    </div>
                    
                    {meeting.notes && (
                      <p className="text-sm text-tx2 mb-2 line-clamp-2">{meeting.notes}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-tx3">
                      <span>Created by: {getCreatorName(meeting.created_by)}</span>
                      {meeting.location && (
                        <span>Location: {meeting.location}</span>
                      )}
                      {meeting.held_date && (
                        <span>Held: {new Date(meeting.held_date).toLocaleDateString('mn-MN')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle meeting action
                      }}
                      className="w-8 h-8 rounded-lg bg-surface2 hover:bg-surface3 flex items-center justify-center text-sm"
                      title="View Details"
                    >
                      ??
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">
                {selectedMeeting.meeting_date 
                  ? new Date(selectedMeeting.meeting_date).toLocaleDateString('mn-MN')
                  : 'Meeting Details'
                }
              </h2>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface2 flex items-center justify-center"
              >
                ??
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Status</h3>
                <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedMeeting.status)}`}>
                  {getStatusLabel(selectedMeeting.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Meeting Date</h3>
                  <p className="text-tx2">
                    {selectedMeeting.meeting_date 
                      ? new Date(selectedMeeting.meeting_date).toLocaleDateString('mn-MN')
                      : 'Not scheduled'
                    }
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Held Date</h3>
                  <p className="text-tx2">
                    {selectedMeeting.held_date 
                      ? new Date(selectedMeeting.held_date).toLocaleDateString('mn-MN')
                      : 'Not held yet'
                    }
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Location</h3>
                  <p className="text-tx2">{selectedMeeting.location || 'No location set'}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Created By</h3>
                  <p className="text-tx2">{getCreatorName(selectedMeeting.created_by)}</p>
                </div>
              </div>

              {selectedMeeting.notes && (
                <div>
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p className="text-tx2">{selectedMeeting.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Created</h3>
                  <p className="text-tx2">
                    {new Date(selectedMeeting.created_at).toLocaleDateString('mn-MN')}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Last Updated</h3>
                  <p className="text-tx2">
                    {new Date(selectedMeeting.updated_at).toLocaleDateString('mn-MN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="px-4 py-2 bg-surface2 border border-border rounded-lg hover:bg-surface3 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Handle edit meeting
                  setSelectedMeeting(null)
                }}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
              >
                Edit Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
