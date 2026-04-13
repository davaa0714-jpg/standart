'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StatusPill, TypeTag, PriorityDot, ProgressBar, Badge } from '@/components/ui/Badges'
import { PRIORITY_LABELS } from '@/types/database'
import type { TaskFull, Profile } from '@/types/database'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('Loaded projects:', projectsData)
      setProjects(projectsData || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesFilter = filter === 'all' || project.status === filter
    const matchesSearch = !search || 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(search.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-6">
        <div className="text-center py-16 text-tx3">
          <div className="text-4xl mb-3">Уншиж байна...</div>
          <div className="text-sm">Төслүүд уншиж байна...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Projects / төслүүд</div>
        <h1 className="text-xl font-bold">Төслүүд</h1>
        <p className="text-sm text-tx2 mt-0.5">Бүртгэлийн төслүүд</p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
          <Link href="/projects/new" className="flex items-center gap-2">
            <span>+</span> Шинэ төсөл эхлүүлэх
          </Link>
        </button>
        <button className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors">
          <Link href="/projects/export" className="flex items-center gap-2">
            <span>+</span> Excel-р экспортлох
          </Link>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="төслийн нэрээр хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Бүгд' },
              { key: 'active', label: 'Идэвхтэй' },
              { key: 'completed', label: 'Дууссан' },
              { key: 'cancelled', label: 'Цуцалсан' }
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

      {/* Project List */}
      <div className="flex flex-col gap-3">
        {!filteredProjects.length ? (
          <div className="text-center py-16 text-tx3">
            <div className="text-4xl mb-3">Төсөл олдсонгүй</div>
            <div className="text-sm">Таны шалгуурт нийцэх төсөл алга </div>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-surface border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">{project.type}</Badge>
                    <StatusPill status={project.status} />
                  </div>
                  <h3 className="font-medium text-tx truncate mb-1">{project.name}</h3>
                  <p className="text-sm text-tx2 line-clamp-2 mb-2">{project.description}</p>
                  <div className="flex items-center gap-4 text-xs text-tx3">
                    <span className="font-mono">{project.start_date}</span>
                    <span className="font-mono">{project.end_date}</span>
                    {project.manager_name && <span>Менежер: {project.manager_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20">
                    <ProgressBar value={project.progress || 0} />
                    <div className="text-[10px] text-tx3 font-mono text-right mt-1">{project.progress || 0}%</div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: projects.length, color: 'text-primary-light' },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, color: 'text-success-light' },
          { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: 'text-accent-light' },
          { label: 'Cancelled', value: projects.filter(p => p.status === 'cancelled').length, color: 'text-danger-light' }
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
