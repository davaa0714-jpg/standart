'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export default function DirectorSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          bio: profileData.bio || ''
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      setMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully' })
      await loadProfile() // Reload to show updated data
    } catch (err) {
      console.error('Failed to update profile:', err)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Director / Settings</div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-tx2 mt-0.5">Manage your account settings and preferences</p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-danger/10 border-danger/30'
        }`}>
          <span className="text-xl">{message.type === 'success' ? '??' : '??'}</span>
          <div className="flex-1">
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-600' : 'text-danger-light'
            }`}>
              {message.text}
            </p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className={`text-sm ${
              message.type === 'success' ? 'text-green-600/70' : 'text-danger-light/70'
            } hover:underline`}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {/* Profile Settings */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Profile Information</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tx mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={handleInputChange('full_name')}
                  className="w-full px-4 py-2 bg-surface2 border border-border rounded-lg focus:border-accent focus:outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tx mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="w-full px-4 py-2 bg-surface2 border border-border rounded-lg focus:border-accent focus:outline-none"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tx mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  className="w-full px-4 py-2 bg-surface2 border border-border rounded-lg focus:border-accent focus:outline-none"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tx mb-2">
                  Role
                </label>
                <div className="w-full px-4 py-2 bg-surface3 border border-border rounded-lg text-tx2">
                  {profile?.role || 'Director'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tx mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={handleInputChange('bio')}
                rows={4}
                className="w-full px-4 py-2 bg-surface2 border border-border rounded-lg focus:border-accent focus:outline-none resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Account Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-tx2 mb-1">User ID</label>
              <div className="text-sm font-mono bg-surface2 px-3 py-2 rounded border border-border">
                {profile?.id || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tx2 mb-1">Organization ID</label>
              <div className="text-sm font-mono bg-surface2 px-3 py-2 rounded border border-border">
                {profile?.org_id || 'Not assigned'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tx2 mb-1">Member Since</label>
              <div className="text-sm bg-surface2 px-3 py-2 rounded border border-border">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('mn-MN') : 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-tx2 mb-1">Last Updated</label>
              <div className="text-sm bg-surface2 px-3 py-2 rounded border border-border">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('mn-MN') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">System Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface2 rounded-lg">
              <div>
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-tx2">Receive email notifications for important updates</p>
              </div>
              <button className="w-12 h-6 bg-accent rounded-full relative transition-colors">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface2 rounded-lg">
              <div>
                <h3 className="font-medium">Desktop Notifications</h3>
                <p className="text-sm text-tx2">Show desktop notifications for new messages</p>
              </div>
              <button className="w-12 h-6 bg-accent rounded-full relative transition-colors">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface2 rounded-lg">
              <div>
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-tx2">Use dark theme for the interface</p>
              </div>
              <button className="w-12 h-6 bg-surface3 rounded-full relative transition-colors">
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
