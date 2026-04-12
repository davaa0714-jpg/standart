'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Profile } from '@/types/database'

export default function DirectorTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'submitted' | 'reviewing' | 'done' | 'overdue'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (taskError) throw taskError

      // Load profiles for assignee names
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', taskData?.map(t => t.assignee_id).filter(Boolean) || [])

      setTasks(taskData || [])
      setProfiles(profileData || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return 'Unassigned'
    const profile = profiles.find(p => p.id === assigneeId)
    return profile?.full_name || 'Unknown'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-400'
      case 'in_progress': return 'text-yellow-400'
      case 'submitted': return 'text-orange-400'
      case 'reviewing': return 'text-purple-400'
      case 'done': return 'text-green-400'
      case 'overdue': return 'text-red-400'
      default: return 'text-tx2'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'New'
      case 'in_progress': return 'In Progress'
      case 'submitted': return 'Submitted'
      case 'reviewing': return 'Reviewing'
      case 'done': return 'Done'
      case 'overdue': return 'Overdue'
      default: return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'mid': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-tx2'
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const taskStats = {
    total: tasks.length,
    new: tasks.filter(t => t.status === 'new').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    reviewing: tasks.filter(t => t.status === 'reviewing').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.status === 'overdue').length
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Loading tasks...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Director / Tasks</div>
        <h1 className="text-xl font-bold">Tasks</h1>
        <p className="text-sm text-tx2 mt-0.5">Manage and track all tasks in the organization</p>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">{taskStats.total}</div>
          <div className="text-xs text-tx2">Total Tasks</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{taskStats.new}</div>
          <div className="text-xs text-tx2">New</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">{taskStats.in_progress}</div>
          <div className="text-xs text-tx2">In Progress</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{taskStats.done}</div>
          <div className="text-xs text-tx2">Done</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">{taskStats.overdue}</div>
          <div className="text-xs text-tx2">Overdue</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-surface border border-border rounded-xl p-1 mb-6 flex gap-1">
        {(['all', 'new', 'in_progress', 'submitted', 'reviewing', 'done', 'overdue'] as const).map((status) => (
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

      {/* Tasks List */}
      <div className="bg-surface border border-border rounded-2xl">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">??</div>
            <div className="text-sm">No tasks found</div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 hover:bg-surface2 transition-colors cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-tx truncate">{task.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-tx2 mb-2 line-clamp-2">{task.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-tx3">
                      <span>Assigned to: {getAssigneeName(task.assignee_id)}</span>
                      {task.deadline && (
                        <span>Due: {new Date(task.deadline).toLocaleDateString('mn-MN')}</span>
                      )}
                      <span>Created: {new Date(task.created_at).toLocaleDateString('mn-MN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle task action
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedTask.title}</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface2 flex items-center justify-center"
              >
                ??
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-tx2">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Status</h3>
                  <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedTask.status)}`}>
                    {getStatusLabel(selectedTask.status)}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Priority</h3>
                  <span className={`text-sm px-3 py-1 rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Assigned To</h3>
                  <p className="text-tx2">{getAssigneeName(selectedTask.assignee_id)}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Deadline</h3>
                  <p className="text-tx2">
                    {selectedTask.deadline 
                      ? new Date(selectedTask.deadline).toLocaleDateString('mn-MN')
                      : 'No deadline'
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Created</h3>
                  <p className="text-tx2">
                    {new Date(selectedTask.created_at).toLocaleDateString('mn-MN')}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Last Updated</h3>
                  <p className="text-tx2">
                    {new Date(selectedTask.updated_at).toLocaleDateString('mn-MN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-surface2 border border-border rounded-lg hover:bg-surface3 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Handle edit task
                  setSelectedTask(null)
                }}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
