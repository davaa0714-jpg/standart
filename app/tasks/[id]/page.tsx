import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusPill, TypeTag, PriorityDot, ProgressBar, Badge } from '@/components/ui/Badges'
import { PRIORITY_LABELS } from '@/types/database'
import { TaskActions } from '@/components/tasks/TaskActions'

export const dynamic = 'force-dynamic'

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: task } = await supabase.from('tasks_full').select('*').eq('id', params.id).single()
  if (!task) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: history } = await supabase
    .from('task_history').select('*, profiles(full_name)').eq('task_id', params.id).order('created_at')
  const { data: comments } = await supabase
    .from('task_comments').select('*, profiles(full_name,role)').eq('task_id', params.id).order('created_at')
  const { data: attachments } = await supabase
    .from('task_attachments').select('*').eq('task_id', params.id).order('uploaded_at', { ascending: false })

  const isAssignee = task.assignee_id === user.id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="text-xs text-tx3 mb-4">
        <Link href="/tasks" className="hover:text-tx">Үүрэг</Link> / <span className="text-tx2">{task.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Main */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Title card */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeTag type={task.task_type} />
                <PriorityDot priority={task.priority} showLabel />
              </div>
              <StatusPill status={task.status} />
            </div>
            <h1 className="text-lg font-bold mb-2">{task.title}</h1>
            {task.description && <p className="text-sm text-tx2 leading-relaxed">{task.description}</p>}

            {/* Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-tx3 mb-1">
                <span>Биелэлтийн явц</span>
                <span className="font-mono font-bold text-tx">{task.progress}%</span>
              </div>
              <ProgressBar value={task.progress} />
            </div>
          </div>

          {/* Actions */}
          <TaskActions
            task={task}
            userId={user.id}
            isAssignee={isAssignee}
            isAdmin={isAdmin}
          />

          {/* Attachments */}
          {(attachments?.length ?? 0) > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">📎 Хавсралт файлууд</div>
              <div className="flex flex-col gap-2">
                {attachments!.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 bg-surface2 rounded border border-border">
                    <span className="text-base">{a.file_type === 'word' ? '📄' : a.file_type === 'excel' ? '📊' : a.file_type === 'pdf' ? '📋' : '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{a.file_name}</div>
                      <div className="text-[10px] text-tx3">{a.uploaded_at?.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">💬 Коммент</div>
            {!comments?.length ? (
              <p className="text-xs text-tx3 text-center py-4">Коммент байхгүй</p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-surface2 border border-border rounded p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center text-[9px] font-bold text-primary-light">
                        {c.profiles?.full_name?.[0]}
                      </div>
                      <span className="text-xs font-semibold">{c.profiles?.full_name}</span>
                      <span className="text-[10px] text-tx3 ml-auto font-mono">{c.created_at?.slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-tx2 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — Info */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">Мэдээлэл</div>
            <div className="flex flex-col gap-3 text-sm">
              {[
                ['Хариуцагч', task.assignee_name ?? '—'],
                ['Хэлтэс', task.assignee_department ?? '—'],
                ['Өгсөн', task.assigned_by_name ?? '—'],
                ['Хурал', task.meeting_title ?? '—'],
                ['Биелэх хугацаа', task.deadline],
                ['Эрэмбэ', PRIORITY_LABELS[task.priority]],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-tx3 text-xs">{k}</span>
                  <span className={`text-xs font-medium text-right ${k === 'Биелэх хугацаа' && task.is_overdue ? 'text-danger-light' : ''}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs font-bold text-tx3 uppercase tracking-wide mb-3">Түүх</div>
            <div className="flex flex-col gap-0">
              {history?.map((h: any, i: number) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${i === (history.length - 1) ? 'bg-accent-light' : 'bg-border2'}`} />
                    {i < history.length - 1 && <div className="w-px flex-1 bg-border min-h-[16px] my-1" />}
                  </div>
                  <div className="pb-3">
                    <div className="text-xs font-medium">{h.action}</div>
                    <div className="text-[10px] text-tx3 font-mono">{h.created_at?.slice(0, 16).replace('T', ' ')}</div>
                    {h.profiles?.full_name && <div className="text-[10px] text-tx3">{h.profiles.full_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
