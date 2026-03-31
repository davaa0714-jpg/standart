'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusPill, TypeTag, ProgressBar } from '@/components/ui/Badges'
import type { TaskFull, TaskStatus } from '@/types/database'

interface EditableTask extends TaskFull {
  status: TaskStatus
  editedProgress?: number
  editedNote?: string
}

interface CompletionSubmitModalProps {
  tasks: EditableTask[]
}

export function CompletionSubmitModal({ tasks }: CompletionSubmitModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending')
  const [editableTasks, setEditableTasks] = useState<EditableTask[]>(tasks)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Filter tasks
  const pendingTasks = editableTasks.filter(t => ['new', 'in_progress', 'overdue'].includes(t.status))
  const submittedTasks = editableTasks.filter(t => t.status === 'submitted' || t.status === 'reviewing')

  // Handle progress change
  const handleProgressChange = (taskId: string, value: number) => {
    setEditableTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, editedProgress: value } : t
    ))
  }

  // Handle note change  
  const handleNoteChange = (taskId: string, value: string) => {
    setEditableTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, editedNote: value } : t
    ))
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    
    const tasksToUpdate = editableTasks.filter(t => t.editedProgress !== undefined || t.editedNote)
    
    try {
      const response = await fetch('/api/tasks/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: tasksToUpdate.map(t => ({
            id: t.id,
            progress: t.editedProgress ?? t.progress,
            submitted_note: t.editedNote,
            status: t.status === 'new' || t.status === 'in_progress' || t.status === 'overdue' ? 'submitted' : t.status
          }))
        })
      })
      
      if (response.ok) {
        setSaveMessage('✅ Хадгалагдлаа!')
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('❌ Алдаа гарлаа')
      }
    } catch (error) {
      setSaveMessage('❌ Алдаа гарлаа')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
      >
        <span>📤</span> Биелэлт илгээх
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Биелэлт илгээх</h2>
            <p className="text-xs text-tx3 mt-0.5">Дууссан үүргийн биелэлтийг илгээж баталгаажуулна</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-surface3 rounded-lg transition-colors text-tx3 hover:text-tx"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-accent-light text-accent-light'
                : 'border-transparent text-tx3 hover:text-tx'
            }`}
          >
            Илгээх ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'submitted'
                ? 'border-accent-light text-accent-light'
                : 'border-transparent text-tx3 hover:text-tx'
            }`}
          >
            Илгээсэн ({submittedTasks.length})
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'pending' && pendingTasks.length === 0 && (
            <div className="text-center py-12 text-tx3">
              <div className="text-4xl mb-3">🎉</div>
              <p>Илгээх үүрэг алга</p>
            </div>
          )}
          {activeTab === 'submitted' && submittedTasks.length === 0 && (
            <div className="text-center py-12 text-tx3">
              <div className="text-4xl mb-3">⏳</div>
              <p>Илгээсэн үүрэг алга</p>
            </div>
          )}
          {(activeTab === 'pending' ? pendingTasks : submittedTasks).length > 0 && (
            <table className="w-full">
              <thead className="bg-surface2 sticky top-0">
                <tr className="text-left text-xs text-tx3">
                  <th className="px-3 py-2 font-medium rounded-l-lg">Үүрэг</th>
                  <th className="px-3 py-2 font-medium">Төрөл</th>
                  <th className="px-3 py-2 font-medium">Хугацаа</th>
                  <th className="px-3 py-2 font-medium">Явц (%)</th>
                  <th className="px-3 py-2 font-medium">Тэмдэглэл</th>
                  <th className="px-3 py-2 font-medium">Төлөв</th>
                  <th className="px-3 py-2 font-medium rounded-r-lg text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(activeTab === 'pending' ? pendingTasks : submittedTasks).map((task) => (
                  <tr key={task.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-3 py-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium hover:text-accent-light transition-colors"
                      >
                        {task.title}
                      </Link>
                      <p className="text-xs text-tx3 mt-0.5">{task.meeting_title}</p>
                    </td>
                    <td className="px-3 py-3">
                      <TypeTag type={task.task_type} />
                    </td>
                    <td className="px-3 py-3 text-sm font-mono text-tx3">
                      {task.deadline}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={task.editedProgress ?? task.progress}
                          onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm bg-surface border border-border rounded focus:border-accent focus:outline-none"
                        />
                        <span className="text-xs text-tx3">%</span>
                      </div>
                      <div className="w-24 mt-1">
                        <ProgressBar value={task.editedProgress ?? task.progress} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <textarea
                        placeholder="Тэмдэглэл бичих..."
                        value={task.editedNote || ''}
                        onChange={(e) => handleNoteChange(task.id, e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 text-xs bg-surface border border-border rounded focus:border-accent focus:outline-none resize-none"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={task.status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      {activeTab === 'pending' ? (
                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                        >
                          📤 Илгээх
                        </Link>
                      ) : (
                        <span className="text-xs text-tx3">
                          {task.status === 'submitted' ? 'Хүлээгдэж буй' : 'Хянаж буй'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-surface2/30">
          <div className="text-sm">
            {saveMessage && (
              <span className={saveMessage.includes('✅') ? 'text-accent-light' : 'text-danger-light'}>
                {saveMessage}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Хадгалж байна...' : '💾 Хадгалах'}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm text-tx2 hover:text-tx transition-colors"
            >
              Хаах
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
