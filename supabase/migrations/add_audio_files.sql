-- ============================================================
-- MIGRATION: Add Audio Files Support (Safe to run on existing DB)
-- ============================================================

-- 1. Create audio_files table (if not exists)
create table if not exists audio_files (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid references organizations(id),
  uploaded_by uuid references profiles(id),
  name        text not null,
  file_path   text not null,               -- Supabase Storage path
  file_type   text,                        -- 'webm'|'mp3'|'wav'|'ogg'
  file_size   bigint,
  duration    int,                         -- Seconds
  created_at  timestamptz default now()
);

-- 2. Enable RLS
alter table audio_files enable row level security;

-- 3. Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "audio_files_org_view" on audio_files;
drop policy if exists "audio_files_insert" on audio_files;
drop policy if exists "audio_files_update_own" on audio_files;
drop policy if exists "audio_files_delete_own" on audio_files;
drop function if exists get_user_org_id();

-- 4. Create RLS policies
-- View: Org-гээр эсвэл өөрийн upload-г харна (infinite recursion-аас зайлсхийхийн тулд security definer function ашиглана)
create or replace function get_user_org_id()
returns uuid as $$
begin
  return (select org_id from profiles where id = auth.uid() limit 1);
end;
$$ language plpgsql security definer;

create policy "audio_files_org_view" on audio_files
  for select using (
    org_id = get_user_org_id()
    or uploaded_by = auth.uid()
  );

-- Insert: Зөвхөн өөрийн upload
create policy "audio_files_insert" on audio_files
  for insert with check (uploaded_by = auth.uid());

-- Update: Зөвхөн өөрийн файлууд
create policy "audio_files_update_own" on audio_files
  for update using (uploaded_by = auth.uid());

-- Delete: Зөвхөн өөрийн файлууд
create policy "audio_files_delete_own" on audio_files
  for delete using (uploaded_by = auth.uid());

-- 5. Add indexes (if not exists)
create index if not exists idx_audio_files_org on audio_files(org_id);
create index if not exists idx_audio_files_user on audio_files(uploaded_by);

-- 6. Storage bucket-груу оруулах (Dashboard-аар хийнэ, эсвэл SQL-ээр хийж болохгүй)
-- Хэрэглэгчид: Supabase Dashboard → Storage → New bucket → "audio-files" нэр өгнө
