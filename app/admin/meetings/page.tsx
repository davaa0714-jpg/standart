'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MeetingModal } from '@/components/meetings/MeetingModal'
import type { Meeting, Profile } from '@/types/database'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Load meetings
      const { data: meetingsData } = await supabase
        .from('meetings')
        .select('*')
        .eq('org_id', profileData?.org_id ?? '')
        .order('meeting_date', { ascending: false })

      setMeetings(meetingsData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMeetingCreated = () => {
    loadData()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-400/10'
      case 'held': return 'text-green-400 bg-green-400/10'
      case 'cancelled': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Tovlogdson'
      case 'held': return 'Bolson'
      case 'cancelled': return 'Tsutsuldsan'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Data loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-xs text-tx3 mb-1">Nuur / Khurluud</div>
          <h1 className="text-xl font-bold">Khuraliin jagsaalt</h1>
          <p className="text-sm text-tx2 mt-0.5">Gazriin shuurkhai khuraliin burtegel</p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/recorder"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface2 transition-colors"
          >
            <span> </span>
            Duu khurakh
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
          >
            <span>+</span>
            Shinee khural
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {!meetings.length ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3"> </div>
            <div className="text-sm">Khural buregdeegui baina</div>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-bold text-tx">
                      {formatDate(meeting.meeting_date)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                      {getStatusText(meeting.status)}
                    </span>
                  </div>
                  
                  {meeting.held_date && (
                    <div className="text-sm text-tx2 mb-1">
                      <strong>Bolson udur:</strong> {formatDate(meeting.held_date)}
                    </div>
                  )}
                  
                  {meeting.location && (
                    <div className="text-sm text-tx2 mb-1">
                      <strong>Baishlui:</strong> {meeting.location}
                    </div>
                  )}
                  
                  {meeting.notes && (
                    <div className="text-sm text-tx2 mt-2">
                      <strong>Temdeglel:</strong> {meeting.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="px-3 py-1 bg-surface2 border border-border rounded text-sm hover:bg-surface3 transition-colors"
                  >
                    Delgereghei
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <MeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleMeetingCreated}
        orgId={profile?.org_id ?? ''}
      />
    </div>
  )
}
