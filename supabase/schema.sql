-- ============================================================
-- ГАЗРЫН ШУУРХАЙ ХУРАЛ — SUPABASE DATABASE SCHEMA
-- ============================================================
-- Supabase dashboard дээр:
--   SQL Editor → New Query → энэ файлыг paste хийж → Run
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. БАЙГУУЛЛАГА (Organizations)
-- ============================================================
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  short_name  text,
  logo_url    text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 2. ХЭРЭГЛЭГЧ / АЖИЛТАН (Users / Staff)
-- ============================================================
-- auth.users-тай холбосон профайл
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  org_id        uuid references organizations(id),
  full_name     text not null,
  position      text,                          -- Албан тушаал
  department    text,                          -- Хэлтэс
  phone         text,
  role          text not null default 'staff'  -- 'admin' | 'inspector' | 'staff'
                check (role in ('admin','inspector','staff')),
  is_active     boolean default true,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 3. ХУРАЛ (Meetings)
-- ============================================================
create table meetings (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id),
  title         text not null,                 -- Хурлын нэр
  meeting_no    int,                           -- Дугаар (1, 2, 3...)
  held_at       date not null,                 -- Болсон огноо
  location      text,                          -- Байршил
  chair_id      uuid references profiles(id),  -- Даргалагч
  secretary_id  uuid references profiles(id),  -- Нарийн бичгийн дарга
  note          text,                          -- Тэмдэглэл
  status        text default 'open'
                check (status in ('open','closed')),
  created_by    uuid references profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 4. ХУРЛЫН ОРОЛЦОГЧИД (Meeting Attendees)
-- ============================================================
create table meeting_attendees (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid references meetings(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  unique(meeting_id, profile_id)
);

-- ============================================================
-- 5. ҮҮРЭГ ДААЛГАВАР (Tasks)
-- ============================================================
create table tasks (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id),
  meeting_id    uuid references meetings(id) on delete set null,

  title         text not null,                 -- Үүргийн гарчиг
  description   text,                          -- Дэлгэрэнгүй

  task_type     text not null default 'uureg'
                check (task_type in ('uureg','daalgavar','medeelel')),
                -- uureg=Үүрэг | daalgavar=Даалгавар | medeelel=Мэдээлэл

  priority      text not null default 'mid'
                check (priority in ('high','mid','low')),

  assignee_id   uuid references profiles(id),  -- Хариуцагч ажилтан
  assigned_by   uuid references profiles(id),  -- Өгсөн удирдлага

  deadline      date not null,                 -- Биелэх хугацаа
  notify_days   int default 3,                 -- Хэдэн хоногийн өмнө мэдэгдэх

  status        text not null default 'new'
                check (status in ('new','in_progress','submitted','reviewing','done','overdue')),
  progress      int default 0 check (progress between 0 and 100),

  -- Биелэлтийн мэдээлэл
  submitted_at  timestamptz,
  submitted_note text,
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  review_note   text,

  created_by    uuid references profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 6. ҮҮРГИЙН ХАВСРАЛТ ФАЙЛ (Task Attachments)
-- ============================================================
create table task_attachments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references tasks(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,               -- Supabase Storage path
  file_type   text,                        -- 'word'|'excel'|'pdf'|'image'|'other'
  file_size   bigint,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

-- ============================================================
-- 7. ҮҮРГИЙН БИЕЛЭЛТИЙН ТҮҮХ (Task History / Timeline)
-- ============================================================
create table task_history (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references tasks(id) on delete cascade,
  profile_id  uuid references profiles(id),
  action      text not null,               -- 'created'|'updated'|'submitted'|'reviewed'|'approved'|'rejected'
  old_status  text,
  new_status  text,
  note        text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 8. КОММЕНТ / САНАЛ ХҮСЭЛТ (Comments)
-- ============================================================
create table task_comments (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid references tasks(id) on delete cascade,
  profile_id  uuid references profiles(id),
  content     text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 9. МЭДЭГДЭЛ (Notifications)
-- ============================================================
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references profiles(id) on delete cascade,
  task_id     uuid references tasks(id) on delete cascade,
  type        text not null
              check (type in ('deadline_near','deadline_overdue','submitted','reviewed','approved','rejected','assigned')),
  title       text not null,
  body        text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- 10. ЭКСПОРТ ЛОГО (Export Log)
-- ============================================================
create table export_logs (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organizations(id),
  exported_by   uuid references profiles(id),
  export_type   text not null check (export_type in ('word','excel','pdf')),
  scope         text,                        -- 'all'|'meeting'|'staff'
  scope_id      uuid,
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES — Гүйцэтгэл сайжруулах
-- ============================================================
create index idx_tasks_assignee   on tasks(assignee_id);
create index idx_tasks_meeting    on tasks(meeting_id);
create index idx_tasks_status     on tasks(status);
create index idx_tasks_deadline   on tasks(deadline);
create index idx_tasks_org        on tasks(org_id);
create index idx_notifications_profile on notifications(profile_id, is_read);
create index idx_history_task     on task_history(task_id);
create index idx_comments_task    on task_comments(task_id);

-- ============================================================
-- UPDATED_AT АВТОМАТ ШИНЭЧЛЭЛТ
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_meetings_updated
  before update on meetings
  for each row execute function update_updated_at();

create trigger trg_tasks_updated
  before update on tasks
  for each row execute function update_updated_at();

-- ============================================================
-- TASK HISTORY АВТОМАТ БҮРТГЭЛ
-- ============================================================
create or replace function log_task_history()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into task_history(task_id, profile_id, action, old_status, new_status)
    values (new.id, new.updated_at::text::uuid, 'updated', old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- ХУГАЦАА ХЭТЭРСЭН АВТОМАТ ТЭМДЭГЛЭГЧ
-- ============================================================
-- Cron job (pg_cron) ашиглан өдөр бүр ажиллуулна
-- Supabase dashboard → Extensions → pg_cron идэвхжүүлсний дараа:
/*
select cron.schedule(
  'mark-overdue-tasks',
  '0 8 * * *',   -- Өдөр бүр 08:00-д
  $$
    update tasks
    set status = 'overdue'
    where status in ('new','in_progress')
      and deadline < current_date;

    insert into notifications(profile_id, task_id, type, title, body)
    select
      t.assignee_id,
      t.id,
      'deadline_overdue',
      'Хугацаа хэтэрлээ: ' || t.title,
      'Биелэх хугацаа ' || t.deadline::text || ' байсан үүрэг хугацаа хэтэрлээ.'
    from tasks t
    where t.status = 'overdue'
      and t.assignee_id is not null
      and not exists (
        select 1 from notifications n
        where n.task_id = t.id
          and n.type = 'deadline_overdue'
          and n.created_at::date = current_date
      );
  $$
);
*/

-- ============================================================
-- МЭДЭГДЭЛ — Хугацаа дөхөж байх үед
-- ============================================================
/*
select cron.schedule(
  'notify-deadline-near',
  '0 9 * * *',
  $$
    insert into notifications(profile_id, task_id, type, title, body)
    select
      t.assignee_id,
      t.id,
      'deadline_near',
      t.notify_days::text || ' хоногийн дараа дуусна: ' || t.title,
      'Биелэх хугацаа: ' || t.deadline::text
    from tasks t
    where t.status in ('new','in_progress')
      and t.assignee_id is not null
      and t.deadline = current_date + t.notify_days
      and not exists (
        select 1 from notifications n
        where n.task_id = t.id
          and n.type = 'deadline_near'
          and n.created_at::date = current_date
      );
  $$
);
*/

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table organizations      enable row level security;
alter table profiles           enable row level security;
alter table meetings           enable row level security;
alter table meeting_attendees  enable row level security;
alter table tasks              enable row level security;
alter table task_attachments   enable row level security;
alter table task_history       enable row level security;
alter table task_comments      enable row level security;
alter table notifications      enable row level security;
alter table export_logs        enable row level security;

-- Profiles: өөрийн байгууллагынхыг харна
create policy "profiles_org_view" on profiles
  for select using (
    org_id = (select org_id from profiles where id = auth.uid())
  );

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid());

-- Meetings: байгууллагынхаа хурлуудыг харна
create policy "meetings_org_view" on meetings
  for select using (
    org_id = (select org_id from profiles where id = auth.uid())
  );

create policy "meetings_admin_manage" on meetings
  for all using (
    (select role from profiles where id = auth.uid()) in ('admin','inspector')
  );

-- Tasks: ажилтан өөрийн, inspector/admin бүгдийг харна
create policy "tasks_assignee_view" on tasks
  for select using (
    assignee_id = auth.uid()
    or (select role from profiles where id = auth.uid()) in ('admin','inspector')
  );

create policy "tasks_staff_update_own" on tasks
  for update using (
    assignee_id = auth.uid()
    or (select role from profiles where id = auth.uid()) in ('admin','inspector')
  );

create policy "tasks_admin_insert" on tasks
  for insert with check (
    (select role from profiles where id = auth.uid()) in ('admin','inspector')
  );

-- Notifications: зөвхөн өөрийнхөө
create policy "notifications_own" on notifications
  for all using (profile_id = auth.uid());

-- Comments: байгууллагынхаа tasks-ийн коммент
create policy "comments_view" on task_comments
  for select using (
    exists (
      select 1 from tasks t
      where t.id = task_id
        and (t.assignee_id = auth.uid()
          or (select role from profiles where id = auth.uid()) in ('admin','inspector'))
    )
  );

create policy "comments_insert" on task_comments
  for insert with check (profile_id = auth.uid());

-- Attachments: task харах эрхтэй бол харна
create policy "attachments_view" on task_attachments
  for select using (
    exists (
      select 1 from tasks t
      where t.id = task_id
        and (t.assignee_id = auth.uid()
          or (select role from profiles where id = auth.uid()) in ('admin','inspector'))
    )
  );

-- History: task харах эрхтэй бол харна
create policy "history_view" on task_history
  for select using (
    exists (
      select 1 from tasks t
      where t.id = task_id
        and (t.assignee_id = auth.uid()
          or (select role from profiles where id = auth.uid()) in ('admin','inspector'))
    )
  );

-- ============================================================
-- STORAGE BUCKET (Supabase Storage)
-- ============================================================
-- Dashboard → Storage → New bucket → "task-attachments" (private)
/*
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false);

create policy "attachments_upload" on storage.objects
  for insert with check (bucket_id = 'task-attachments' and auth.uid() is not null);

create policy "attachments_read" on storage.objects
  for select using (bucket_id = 'task-attachments' and auth.uid() is not null);
*/

-- ============================================================
-- DEMO ӨГӨГДӨЛ (Туршихад ашиглана)
-- ============================================================
-- Байгууллага
insert into organizations (id, name, short_name)
values ('00000000-0000-0000-0000-000000000001', 'Газрын Харилцааны Алба', 'ГХА');

-- Хурлууд (profiles нэмсний дараа chair_id-г тохируулна)
insert into meetings (org_id, title, meeting_no, held_at, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Газрын шуурхай хурал #4', 4, '2025-05-12', 'open'),
  ('00000000-0000-0000-0000-000000000001', 'Газрын шуурхай хурал #3', 3, '2025-04-28', 'open'),
  ('00000000-0000-0000-0000-000000000001', 'Газрын шуурхай хурал #2', 2, '2025-04-10', 'closed'),
  ('00000000-0000-0000-0000-000000000001', 'Газрын шуурхай хурал #1', 1, '2025-03-22', 'closed');

-- ============================================================
-- VIEWS — Хэрэглэхэд хялбар
-- ============================================================

-- Үүргийн бүрэн дэлгэрэнгүй
create or replace view tasks_full as
select
  t.*,
  p_a.full_name   as assignee_name,
  p_a.position    as assignee_position,
  p_a.department  as assignee_department,
  p_b.full_name   as assigned_by_name,
  p_r.full_name   as reviewed_by_name,
  m.title         as meeting_title,
  m.meeting_no    as meeting_no,
  m.held_at       as meeting_date,
  case
    when t.deadline < current_date and t.status not in ('done','submitted','reviewing')
    then true else false
  end             as is_overdue,
  current_date - t.deadline as days_overdue
from tasks t
left join profiles p_a on p_a.id = t.assignee_id
left join profiles p_b on p_b.id = t.assigned_by
left join profiles p_r on p_r.id = t.reviewed_by
left join meetings m   on m.id = t.meeting_id;

-- Ажилтны биелэлтийн статистик
create or replace view staff_stats as
select
  p.id,
  p.full_name,
  p.position,
  p.department,
  count(t.id)                                           as total_tasks,
  count(t.id) filter (where t.status = 'done')         as done_tasks,
  count(t.id) filter (where t.status = 'overdue')      as overdue_tasks,
  count(t.id) filter (where t.status in ('new','in_progress')) as pending_tasks,
  case when count(t.id) > 0
    then round(count(t.id) filter (where t.status='done')::numeric / count(t.id) * 100)
    else 0
  end                                                   as completion_pct
from profiles p
left join tasks t on t.assignee_id = p.id
group by p.id, p.full_name, p.position, p.department;

-- Хурлын статистик
create or replace view meeting_stats as
select
  m.*,
  p.full_name as chair_name,
  count(t.id)                                       as total_tasks,
  count(t.id) filter (where t.status = 'done')     as done_tasks,
  count(t.id) filter (where t.status = 'overdue')  as overdue_tasks,
  case when count(t.id) > 0
    then round(count(t.id) filter (where t.status='done')::numeric / count(t.id) * 100)
    else 0
  end                                               as completion_pct
from meetings m
left join profiles p on p.id = m.chair_id
left join tasks t on t.meeting_id = m.id
group by m.id, p.full_name;

-- ============================================================
-- FINISHED
-- ============================================================
-- Дараагийн алхам:
-- 1. Supabase → SQL Editor → энэ файлыг ажиллуулна
-- 2. Authentication → Email signup идэвхжүүлнэ
-- 3. Storage → "task-attachments" bucket үүсгэнэ
-- 4. .env.local файлд SUPABASE_URL, SUPABASE_ANON_KEY нэмнэ
-- ============================================================
