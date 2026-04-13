'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'development',
    start_date: '',
    end_date: '',
    manager_id: '',
    priority: 'medium'
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load all profiles except admin to see what's available
      const { data: employeeData } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('full_name')

      console.log('Loaded profiles:', employeeData)
      setProfiles(employeeData || [])
    } catch (err) {
      console.error('Failed to load employees:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create project
      const projectData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        manager_id: user.id,
        priority: formData.priority,
        status: 'active',
        created_by: user.id
      }

      console.log('Creating project with data:', projectData)

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      console.log('Project creation result:', { project, error: projectError })

      if (projectError) throw projectError

      // Assign employees to project
      if (selectedEmployees.length > 0) {
        const assignments = selectedEmployees.map(employeeId => ({
          project_id: project.id,
          employee_id: employeeId,
          assigned_by: user.id
        }))

        const { error: assignmentError } = await supabase
          .from('project_assignments')
          .insert(assignments)

        if (assignmentError) throw assignmentError
      }

      // Create initial tasks for each assigned employee
      for (const employeeId of selectedEmployees) {
        await supabase
          .from('tasks')
          .insert({
            project_id: project.id,
            title: `${formData.name} - Initial Task`,
            description: `Initial task for project: ${formData.name}`,
            task_type: 'uureg',
            priority: formData.priority,
            assignee_id: employeeId,
            assigned_by: user.id,
            deadline: formData.end_date,
            notify_days: 3,
            status: 'new',
            progress: 0
          })
      }

      router.push('/projects')
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  return (
    <div className="max-w-[900px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-tx3 mb-1">Projects / Төслүүд</div>
        <h1 className="text-xl font-bold">Шинэ төсөл үүсгэх</h1>
        <p className="text-sm text-tx2 mt-0.5">Шинэ төслийг үүсгэж ажилчид руу үүсгэнэ үү</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-tx mb-2">
              Төслийн нэр
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
              placeholder="Төслийн нэр оруулна уу"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-tx mb-2">
              Тайлбар
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
              rows={3}
              placeholder="Төслийн тайлбар"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-tx mb-2">
              Төслийн төрөл
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            >
              <option value="development">Хөгжүүлэлт</option>
              <option value="design">Зураг</option>
              <option value="marketing">Маркетинг</option>
              <option value="research">Шинжилгээ</option>
              <option value="other">Бусад</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-tx mb-2">
                Эрэмбэлэлт
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            >
              <option value="high">Өндөр</option>
              <option value="medium">Дунд</option>
              <option value="low">Бага</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-tx mb-2">
              Эхлэх огноо
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-tx mb-2">
                Дуусах огноо
            </label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-tx focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Worker Selection */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-tx mb-2">
              ажилчид ({selectedEmployees.length} сонгогдсон)
          </label>
          <div className="bg-surface2 border border-border rounded-lg p-4 max-h-60 overflow-y-auto">
            {profiles.length === 0 ? (
              <p className="text-sm text-tx3 text-center">Ажилчид байхгүй</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {profiles.map((profile) => (
                  <label key={profile.id} className="flex items-center gap-2 p-2 rounded hover:bg-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(profile.id)}
                      onChange={() => toggleEmployeeSelection(profile.id)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-tx">{profile.full_name}</div>
                      <div className="text-xs text-tx3">
                        {profile.role === 'staff' ? 'Ажилчин' : 
                         profile.role === 'manager' ? 'Менежер' : 
                         profile.role === 'director' ? 'Директор' : 
                         profile.role === 'admin' ? 'Админ' : profile.role}
                        {profile.position && ` - ${profile.position}`}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-surface3 text-tx2">
                      {profile.role === 'staff' ? 'A' : 
                       profile.role === 'manager' ? 'M' : 
                       profile.role === 'director' ? 'D' : 
                       profile.role === 'admin' ? 'Ad' : '?'}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Үүсгэж байна...' : 'Төслийг үүсгэх'}
          </button>
          <Link
            href="/projects"
            className="px-4 py-2 bg-surface2 border border-border rounded-lg text-sm font-medium text-tx hover:bg-surface3 transition-colors"
          >
            Болих
          </Link>
        </div>
      </form>
    </div>
  )
}
