# 🏛️ Газрын Шуурхай Хурал — Үүрэг Даалгаварын Систем

Next.js 14 + Supabase дээр бүтээсэн газрын алба, хурлын үүрэг даалгаварыг удирдах бүрэн систем.

---

## 🚀 Суулгах заавар (алхам алхмаар)

### 1 — Supabase Project үүсгэх
1. supabase.com → New project
2. Settings → API → Project URL + anon key хуулна

### 2 — Database суулгах ⚠️ ЭХЭЛЖ ХИЙ
1. Supabase → SQL Editor → New Query
2. supabase/schema.sql файлын бүгдийг paste → Run

### 3 — Storage Bucket
1. Supabase → Storage → New bucket
2. Name: task-attachments, Private сонгоно

### 4 — Төсөл суулгах
```bash
npm install
cp .env.example .env.local
# .env.local дотор SUPABASE_URL, ANON_KEY оруулна
npm run dev
```
http://localhost:3000

### 5 — Анхны Admin
```sql
UPDATE profiles SET role = 'admin'
WHERE id = 'ТАНЫ-USER-ID';
```

---

## 👥 Эрхүүд
| Эрх | Боломж |
|-----|--------|
| admin | Бүгдийг харна, үүрэг өгнө, батална |
| inspector | Үүрэг өгнө, биелэлт хянана |
| staff | Өөрийн үүргийг харна, биелэлт илгээнэ |

---

## 📤 Export
Word (.docx), Excel (.xlsx), PDF (.pdf) — архивын стандарт форматаар

---

## 🛠️ Стек
Next.js 14 · Supabase · TypeScript · Tailwind · docx · ExcelJS · jsPDF
