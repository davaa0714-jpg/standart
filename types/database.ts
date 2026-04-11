export type Role = 'admin' | 'director' | 'manager' | 'staff'
export type TaskType = 'uureg' | 'daalgavar' | 'medeelel'
export type Priority = 'high' | 'mid' | 'low'
export type TaskStatus = 'new' | 'in_progress' | 'submitted' | 'reviewing' | 'done' | 'overdue'
export type MeetingStatus = 'scheduled' | 'held' | 'cancelled'
export type NotifType = 'deadline_near' | 'deadline_overdue' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'assigned'
export type ExportType = 'word' | 'excel' | 'pdf'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at'>
        Update: Partial<Omit<Organization, 'id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      meetings: {
        Row: Meeting
        Insert: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Meeting, 'id'>>
      }
      meeting_attendees: {
        Row: MeetingAttendee
        Insert: Omit<MeetingAttendee, 'id'>
        Update: never
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id'>>
      }
      task_attachments: {
        Row: TaskAttachment
        Insert: Omit<TaskAttachment, 'id' | 'uploaded_at'>
        Update: never
      }
      task_history: {
        Row: TaskHistory
        Insert: Omit<TaskHistory, 'id' | 'created_at'>
        Update: never
      }
      task_comments: {
        Row: TaskComment
        Insert: Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<TaskComment, 'content'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Pick<Notification, 'is_read'>>
      }
      export_logs: {
        Row: ExportLog
        Insert: Omit<ExportLog, 'id' | 'created_at'>
        Update: never
      }
      audio_files: {
        Row: AudioFile
        Insert: Omit<AudioFile, 'id' | 'created_at'>
        Update: Partial<Pick<AudioFile, 'name'>>
      }
    }
    Views: {
      tasks_full: { Row: TaskFull }
      staff_stats: { Row: StaffStats }
      meeting_stats: { Row: MeetingStats }
    }
    Functions: Record<string, never>
  }
}

// ── ENTITY TYPES ──────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
  created_at: string
}

export interface Profile {
  id: string
  org_id: string | null
  full_name: string
  position: string | null
  department: string | null
  phone: string | null
  role: Role
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  org_id: string | null
  created_by: string | null
  meeting_date: string
  held_date: string | null
  location: string | null
  notes: string | null
  status: 'scheduled' | 'held' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface MeetingAttendee {
  id: string
  meeting_id: string
  profile_id: string
}

export interface Task {
  id: string
  org_id: string | null
  meeting_id: string | null
  title: string
  description: string | null
  task_type: TaskType
  priority: Priority
  assignee_id: string | null
  assigned_by: string | null
  deadline: string
  notify_days: number
  status: TaskStatus
  progress: number
  submitted_at: string | null
  submitted_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  profile_id: string | null
  action: string
  old_status: string | null
  new_status: string | null
  note: string | null
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  profile_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  profile_id: string
  task_id: string | null
  type: NotifType
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

export interface ExportLog {
  id: string
  org_id: string | null
  exported_by: string | null
  export_type: ExportType
  scope: string | null
  scope_id: string | null
  created_at: string
}

export interface AudioFile {
  id: string
  org_id: string | null
  uploaded_by: string | null
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  duration: number | null
  created_at: string
}

// ── VIEW TYPES ────────────────────────────────────────────────────

export interface TaskFull extends Task {
  assignee_name: string | null
  assignee_position: string | null
  assignee_department: string | null
  assigned_by_name: string | null
  reviewed_by_name: string | null
  meeting_title: string | null
  meeting_no: number | null
  meeting_date: string | null
  is_overdue: boolean
  days_overdue: number | null
}

export interface StaffStats {
  id: string
  full_name: string
  position: string | null
  department: string | null
  total_tasks: number
  done_tasks: number
  overdue_tasks: number
  pending_tasks: number
  completion_pct: number
}

export interface MeetingStats extends Meeting {
  chair_name: string | null
  total_tasks: number
  done_tasks: number
  overdue_tasks: number
  completion_pct: number
}

// ── HELPER MAPS ───────────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  uureg: 'Үүрэг',
  daalgavar: 'Даалгавар',
  medeelel: 'Мэдээлэл',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Өндөр',
  mid: 'Дунд',
  low: 'Бага',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Шинэ',
  in_progress: 'Хийгдэж байна',
  submitted: 'Биелэлт илгээсэн',
  reviewing: 'Хянагдаж байна',
  done: 'Биелсэн',
  overdue: 'Хугацаа хэтэрсэн',
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Дээд удирдлага',
  director: 'Захирал',
  manager: 'Менежер',
  staff: 'Ажилтан',
}
