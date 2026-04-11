'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatCard } from '@/components/ui/StatCard'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import { TaskMiniList } from '@/components/tasks/TaskMiniList'
import type { TaskFull, TaskStatus } from '@/types/database'

interface BiyeleltInput {
  taskId: string
  taskTitle: string
  progress: number
  notes: string
  deadline: string
  status: TaskStatus
}

export default function StaffBiyeleltPage() {
  const [tasks, setTasks] = useState<TaskFull[]>([])
  const [inputs, setInputs] = useState<BiyeleltInput[]>([])
  const [submittedBiyelelt, setSubmittedBiyelelt] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user's tasks
      const { data: tasksData } = await supabase
        .from('tasks_full')
        .select('*')
        .eq('assignee_id', user.id)
        .in('status', ['new', 'in_progress', 'overdue'])

      // Load submitted biyelelt
      const { data: submittedData } = await supabase
        .from('task_completions')
        .select('*')
        .eq('submitted_by', user.id)
        .order('submitted_at', { ascending: false })

      setTasks(tasksData || [])
      setSubmittedBiyelelt(submittedData || [])

      // Initialize inputs
      if (tasksData) {
        setInputs(tasksData.map(task => ({
          taskId: task.id,
          taskTitle: task.title,
          progress: task.progress || 0,
          notes: '',
          deadline: task.deadline,
          status: task.status
        })))
      }
    } catch (err) {
      setError('Data loading failed')
    } finally {
      setLoading(false)
    }
  }

  const updateInput = (taskId: string, field: keyof BiyeleltInput, value: any) => {
    setInputs(prev => prev.map(input => 
      input.taskId === taskId ? { ...input, [field]: value } : input
    ))
  }

  const submitBiyelelt = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Submit each task completion
      for (const input of inputs) {
        if (input.progress > 0) {
          await supabase.from('task_completions').insert({
            task_id: input.taskId,
            submitted_by: user.id,
            progress: input.progress,
            notes: input.notes,
            submitted_at: new Date().toISOString()
          })

          // Update task status
          const newStatus = input.progress === 100 ? 'submitted' : 'in_progress'
          await supabase.from('tasks').update({
            progress: input.progress,
            status: newStatus
          }).eq('id', input.taskId)
        }
      }

      // Reload data
      await loadData()
    } catch (err) {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const exportToWord = async () => {
    // Create Word document content
    const content = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Biyelelt Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Biyelelt Report</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Progress</th>
                <th>Notes</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              ${inputs.map(input => `
                <tr>
                  <td>${input.taskTitle}</td>
                  <td>${input.progress}%</td>
                  <td>${input.notes || '-'}</td>
                  <td>${input.deadline}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    // Create blob and download
    const blob = new Blob([content], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `biyelelt-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div>Loading...</div>

  const myPending = tasks.filter(t => ['new','in_progress','overdue'].includes(t.status))
  const myDone = tasks.filter(t => t.status === 'done')

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-tx3 mb-1">Biyelelt</div>
          <h1 className="text-xl font-bold">Minii biyelelt</h1>
          <p className="text-sm text-tx2 mt-0.5">
            100% - 100% - 100%
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToWord}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            Word Export
          </button>
          <button
            onClick={submitBiyelelt}
            disabled={submitting}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Biyelelt'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Khuleeddej baina" value={myPending.length} sub="Ajillagdj baina" color="orange" icon="?" />
        <StatCard label="Shalgaltand" value={submittedBiyelelt.length} sub="Shalgaj baina" color="purple" icon="?" />
        <StatCard label="Duussan" value={myDone.length} sub="Batlagdaj baina" color="green" icon="?" />
      </div>

      {/* Excel-like Input Table */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold mb-4">Biyelelt oruulah (Excel-style)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-bold">Task Title</th>
                <th className="text-left p-3 text-sm font-bold">Progress (%)</th>
                <th className="text-left p-3 text-sm font-bold">Notes</th>
                <th className="text-left p-3 text-sm font-bold">Deadline</th>
                <th className="text-left p-3 text-sm font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((input, index) => (
                <tr key={input.taskId} className="border-b border-border hover:bg-surface2">
                  <td className="p-3">
                    <div className="text-sm font-medium">{input.taskTitle}</div>
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={input.progress}
                      onChange={(e) => updateInput(input.taskId, 'progress', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-surface2 border border-border rounded text-sm"
                    />
                    <div className="w-16 mt-1">
                      <ProgressBar value={input.progress} />
                    </div>
                  </td>
                  <td className="p-3">
                    <textarea
                      value={input.notes}
                      onChange={(e) => updateInput(input.taskId, 'notes', e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-2 py-1 bg-surface2 border border-border rounded text-sm resize-none"
                      rows={2}
                    />
                  </td>
                  <td className="p-3">
                    <div className="text-sm font-mono">{input.deadline}</div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={input.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submitted Biyelelt Display */}
      {submittedBiyelelt.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-bold mb-4">Ilgeesen biyeleltuud</h2>
          <div className="space-y-3">
            {submittedBiyelelt.map((submission, index) => (
              <div key={submission.id} className="p-4 bg-surface2 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-bold text-accent-light">
                    Progress: {submission.progress}%
                  </div>
                </div>
                {submission.notes && (
                  <div className="text-sm text-tx2 mb-2">
                    <strong>Notes:</strong> {submission.notes}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ProgressBar value={submission.progress} />
                  <span className="text-xs text-tx3">
                    {submission.progress === 100 ? 'Complete' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
