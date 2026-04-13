'use client'

// Admin tasks page
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StatusPill, TypeTag, PriorityDot, ProgressBar, Badge } from '@/components/ui/Badges'
import { PRIORITY_LABELS } from '@/types/database'
import type { TaskFull, Profile } from '@/types/database'

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskFull[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'done' | 'overdue'>('all')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load tasks assigned by admin (task giver role)
      const { data: tasksData } = await supabase
        .from('tasks_full')
        .select('*')
        .eq('assigned_by', user.id)
        .order('deadline', { ascending: true })

      setTasks(tasksData || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter
    const matchesSearch = !search || 
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.assignee_name?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Admin tasks loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Admin / үүрэг</div>
        <h1 className="text-xl font-bold">Uureg ogson daalgavaruud</h1>
        <p className="text-sm text-tx2 mt-0.5">Tand ogson daalgavaruud</p>
      </div>

      {/* Export Button */}
      <div className="mb-6 flex gap-3">
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
          <Link href="/projects/new" className="flex items-center gap-2">
            <span>+</span> Шинэ төслийн үүрэг эхлүүлэх
          </Link>
        </button>
        <button className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors">
          <Link href="/projects" className="flex items-center gap-2">
            <span>+</span> төслүүд
          </Link>
        </button>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
          <Link href="/projects/export" className="flex items-center gap-2">
            <span>+</span> Excel-аар экспортлох
          </Link>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Үүрэг хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Бүгд' },
              { key: 'pending', label: 'Хүлээлт' },
              { key: 'in_progress', label: 'Гүйцэгдэж байна' },
              { key: 'done', label: 'Дууссан' },
              { key: 'overdue', label: 'Хэтэрсэн' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-primary text-white'
                    : 'bg-surface2 text-tx2 hover:bg-surface3'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-3">
        {!filteredTasks.length ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">Үүрэг олдсонгүй</div>
            <div className="text-sm">Таны шалгалтад тохирсон үүрэг байхгүй байна</div>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <TypeTag type={task.task_type} />
                    <PriorityDot priority={task.priority} showLabel />
                    <StatusPill status={task.status} />
                  </div>
                  <h3 className="font-medium text-tx truncate mb-1">{task.title}</h3>
                  <p className="text-sm text-tx2 line-clamp-2 mb-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs text-tx3">
                    <span>{task.assignee_name ?? 'N/A'}</span>
                    <span className="font-mono">{task.deadline}</span>
                    {task.meeting_title && <span>Meeting: {task.meeting_title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20">
                    <ProgressBar value={task.progress} />
                    <div className="text-[10px] text-tx3 font-mono text-right mt-1">{task.progress}%</div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Admin Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: tasks.length, color: 'text-primary-light' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'new').length, color: 'text-warn-light' },
          { label: 'Done', value: tasks.filter(t => t.status === 'done').length, color: 'text-accent-light' },
          { label: 'Overdue', value: tasks.filter(t => t.status === 'overdue').length, color: 'text-danger-light' }
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-xs text-tx3 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
