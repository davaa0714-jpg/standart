// lib/db.ts — Бүх database query-үүд нэг дор

import { createClient } from './supabase/server'
import type { Task, TaskFull, TaskStatus, Meeting, Profile, StaffStats, MeetingStats } from '@/types/database'

// ── TASKS ─────────────────────────────────────────────────────────

export async function getTasks(filters?: {
  status?: TaskStatus
  assignee_id?: string
  meeting_id?: string
  org_id?: string
}) {
  const db = createClient()
  let q = db.from('tasks_full').select('*').order('deadline', { ascending: true })
  if (filters?.status)      q = q.eq('status', filters.status)
  if (filters?.assignee_id) q = q.eq('assignee_id', filters.assignee_id)
  if (filters?.meeting_id)  q = q.eq('meeting_id', filters.meeting_id)
  if (filters?.org_id)      q = q.eq('org_id', filters.org_id)
  return q
}

export async function getTaskById(id: string) {
  const db = createClient()
  return db.from('tasks_full').select('*').eq('id', id).single()
}

export async function createTask(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const db = createClient()
  const { data: task, error } = await (db.from('tasks').insert(data as any).select().single() as any)
  if (error) throw error

  // Хариуцагчид мэдэгдэл илгээх
  if (task.assignee_id) {
    const dbNotif = createClient() as any
    await dbNotif.from('notifications').insert({
      profile_id: task.assignee_id,
      task_id: task.id,
      type: 'assigned',
      title: 'Шинэ үүрэг хүлээн авлаа',
      body: task.title,
    })
  }

  // Түүх бүртгэх
  const dbHistory = createClient() as any
  await dbHistory.from('task_history').insert({
    task_id: task.id,
    profile_id: task.created_by,
    action: 'created',
    new_status: 'new',
  })

  return task
}

export async function updateTask(id: string, data: Partial<Task>, updatedBy?: string) {
  const db = createClient()

  // Одоогийн статусыг авах
  const { data: old } = await db.from('tasks').select('status').eq('id', id).single()

  const { data: task, error } = await db
    .from('tasks').update(data).eq('id', id).select().single()
  if (error) throw error

  // Статус өөрчлөгдсөн бол түүхэнд бүртгэх
  if (old && data.status && old.status !== data.status) {
    const dbHistory = createClient() as any
    await dbHistory.from('task_history').insert({
      task_id: id,
      profile_id: updatedBy ?? null,
      action: 'updated',
      old_status: old.status,
      new_status: data.status,
    })
  }

  return task
}

export async function submitTask(id: string, note: string, submittedBy: string) {
  const db = createClient()
  const { data: task } = await db.from('tasks').select('assigned_by, title').eq('id', id).single()

  await updateTask(id, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    submitted_note: note,
    progress: 100,
  }, submittedBy)

  // Удирдлагад мэдэгдэл
  if (task?.assigned_by) {
    const dbNotif = createClient() as any
    await dbNotif.from('notifications').insert({
      profile_id: task.assigned_by,
      task_id: id,
      type: 'submitted',
      title: 'Биелэлт ирлээ',
      body: task.title,
    })
  }
}

export async function reviewTask(
  id: string,
  approved: boolean,
  note: string,
  reviewedBy: string
) {
  const db = createClient()
  const { data: task } = await db.from('tasks').select('assignee_id, title').eq('id', id).single()

  await updateTask(id, {
    status: approved ? 'done' : 'in_progress',
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_note: note,
  }, reviewedBy)

  // Ажилтанд мэдэгдэл
  if (task?.assignee_id) {
    const dbNotif = createClient() as any
    await dbNotif.from('notifications').insert({
      profile_id: task.assignee_id,
      task_id: id,
      type: approved ? 'approved' : 'rejected',
      title: approved ? '✅ Үүрэг батлагдлаа' : '↩️ Буцаагдлаа — дахин хийнэ үү',
      body: note || task.title,
    })
  }
}

// ── MEETINGS ──────────────────────────────────────────────────────

export async function getMeetings(org_id?: string) {
  const db = createClient()
  let q = db.from('meeting_stats').select('*').order('held_at', { ascending: false })
  if (org_id) q = q.eq('org_id', org_id)
  return q
}

export async function getMeetingById(id: string) {
  const db = createClient()
  return db.from('meeting_stats').select('*').eq('id', id).single()
}

export async function createMeeting(data: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) {
  const db = createClient()
  return (db.from('meetings').insert(data as any).select().single() as any)
}

// ── PROFILES ──────────────────────────────────────────────────────

export async function getProfiles(org_id?: string) {
  const db = createClient()
  let q = db.from('profiles').select('*').eq('is_active', true).order('full_name')
  if (org_id) q = q.eq('org_id', org_id)
  return q
}

export async function getProfile(id: string) {
  const db = createClient()
  return db.from('profiles').select('*').eq('id', id).single()
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────

export async function getNotifications(profile_id: string) {
  const db = createClient()
  return db
    .from('notifications')
    .select('*, tasks(title, deadline)')
    .eq('profile_id', profile_id)
    .order('created_at', { ascending: false })
    .limit(50)
}

export async function markNotifRead(id: string) {
  const db = createClient()
  return db.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotifsRead(profile_id: string) {
  const db = createClient()
  return db.from('notifications').update({ is_read: true }).eq('profile_id', profile_id)
}

// ── STATS ─────────────────────────────────────────────────────────

export async function getStaffStats(org_id?: string) {
  const db = createClient()
  let q = db.from('staff_stats').select('*').order('completion_pct', { ascending: false })
  if (org_id) {
    const dbAny = db as any
    q = dbAny.from('staff_stats').select('*').eq('org_id', org_id).order('completion_pct', { ascending: false })
  }
  return q
}

export async function getDashboardStats(org_id: string) {
  const db = createClient()
  const { data: tasks } = await db
    .from('tasks')
    .select('status')
    .eq('org_id', org_id)

  if (!tasks) return null

  return {
    total:    tasks.length,
    new:      tasks.filter(t => t.status === 'new').length,
    progress: tasks.filter(t => t.status === 'in_progress').length,
    submitted:tasks.filter(t => t.status === 'submitted').length,
    reviewing:tasks.filter(t => t.status === 'reviewing').length,
    done:     tasks.filter(t => t.status === 'done').length,
    overdue:  tasks.filter(t => t.status === 'overdue').length,
    pct: tasks.length
      ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100)
      : 0,
  }
}

// ── COMMENTS ──────────────────────────────────────────────────────

export async function getComments(task_id: string) {
  const db = createClient()
  return db
    .from('task_comments')
    .select('*, profiles(full_name, avatar_url, role)')
    .eq('task_id', task_id)
    .order('created_at', { ascending: true })
}

export async function addComment(task_id: string, profile_id: string, content: string) {
  const db = createClient()
  return db.from('task_comments').insert({ task_id, profile_id, content }).select().single()
}

// ── HISTORY ───────────────────────────────────────────────────────

export async function getTaskHistory(task_id: string) {
  const db = createClient()
  return db
    .from('task_history')
    .select('*, profiles(full_name)')
    .eq('task_id', task_id)
    .order('created_at', { ascending: true })
}

// ── ATTACHMENTS ───────────────────────────────────────────────────

export async function getAttachments(task_id: string) {
  const db = createClient()
  return db
    .from('task_attachments')
    .select('*, profiles(full_name)')
    .eq('task_id', task_id)
    .order('uploaded_at', { ascending: false })
}

export async function uploadAttachment(
  task_id: string,
  file: File,
  uploaded_by: string
) {
  const db = createClient()
  const path = `${task_id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await db.storage
    .from('task-attachments')
    .upload(path, file)

  if (uploadError) throw uploadError

  const fileType = file.name.endsWith('.docx') ? 'word'
    : file.name.endsWith('.xlsx') ? 'excel'
    : file.name.endsWith('.pdf') ? 'pdf'
    : file.type.startsWith('image/') ? 'image' : 'other'

  return db.from('task_attachments').insert({
    task_id,
    file_name: file.name,
    file_path: path,
    file_type: fileType,
    file_size: file.size,
    uploaded_by,
  }).select().single()
}

export async function getAttachmentUrl(path: string) {
  const db = createClient()
  const { data } = await db.storage
    .from('task-attachments')
    .createSignedUrl(path, 3600) // 1 цаг хүчинтэй
  return data?.signedUrl
}
