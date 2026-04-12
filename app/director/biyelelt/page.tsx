'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DirectorBiyeleltPage() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalStaff: 0,
    activeStaff: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load task statistics
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('status')

      if (taskError) throw taskError

      // Load staff statistics
      const { data: staff, error: staffError } = await supabase
        .from('profiles')
        .select('role, last_active')

      if (staffError) throw staffError

      const taskStats = {
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'done').length || 0,
        overdueTasks: tasks?.filter(t => t.status === 'overdue').length || 0,
        totalStaff: staff?.length || 0,
        activeStaff: staff?.filter(s => s.last_active && 
          new Date(s.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length || 0
      }

      setStats(taskStats)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  const activeRate = stats.totalStaff > 0
    ? Math.round((stats.activeStaff / stats.totalStaff) * 100)
    : 0

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Loading team performance...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Director / Team Performance</div>
        <h1 className="text-xl font-bold">Team Performance</h1>
        <p className="text-sm text-tx2 mt-0.5">Overview of team productivity and performance metrics</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-2xl">??</span>
            </div>
            <span className="text-sm text-blue-400 font-medium">+12%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalTasks}</div>
          <div className="text-sm text-tx2">Total Tasks</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-2xl">??</span>
            </div>
            <span className="text-sm text-green-400 font-medium">+8%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{completionRate}%</div>
          <div className="text-sm text-tx2">Completion Rate</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <span className="text-2xl">??</span>
            </div>
            <span className="text-sm text-red-400 font-medium">-3%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{stats.overdueTasks}</div>
          <div className="text-sm text-tx2">Overdue Tasks</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-2xl">??</span>
            </div>
            <span className="text-sm text-purple-400 font-medium">+5%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{activeRate}%</div>
          <div className="text-sm text-tx2">Active Staff</div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Task Completion Chart */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Task Completion</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completed</span>
                <span>{stats.completedTasks} tasks</span>
              </div>
              <div className="w-full bg-surface2 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pending</span>
                <span>{stats.totalTasks - stats.completedTasks} tasks</span>
              </div>
              <div className="w-full bg-surface2 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${100 - completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Staff Activity Chart */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Staff Activity</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Active (7 days)</span>
                <span>{stats.activeStaff} staff</span>
              </div>
              <div className="w-full bg-surface2 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${activeRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Inactive</span>
                <span>{stats.totalStaff - stats.activeStaff} staff</span>
              </div>
              <div className="w-full bg-surface2 rounded-full h-2">
                <div 
                  className="bg-gray-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${100 - activeRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-surface2 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-sm">??</span>
              </div>
              <div>
                <div className="font-medium">Tasks Created</div>
                <div className="text-sm text-tx2">This week</div>
              </div>
            </div>
            <div className="text-2xl font-bold">24</div>
          </div>

          <div className="p-4 bg-surface2 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-sm">??</span>
              </div>
              <div>
                <div className="font-medium">Tasks Completed</div>
                <div className="text-sm text-tx2">This week</div>
              </div>
            </div>
            <div className="text-2xl font-bold">18</div>
          </div>

          <div className="p-4 bg-surface2 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-sm">??</span>
              </div>
              <div>
                <div className="font-medium">Meetings Held</div>
                <div className="text-sm text-tx2">This week</div>
              </div>
            </div>
            <div className="text-2xl font-bold">5</div>
          </div>
        </div>
      </div>
    </div>
  )
}
