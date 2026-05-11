# 🏫 Greenfield Academy — Secondary School Website

A complete, production-ready Nigerian secondary school management website.
Public marketing site + Student Portal + Teacher Dashboard + Admin Panel,
backed by Supabase (Postgres / Auth / Storage / RLS) and Paystack payments.

> **School name:** Greenfield Academy (placeholder — find/replace to rebrand)
> **Motto:** _Knowledge · Discipline · Excellence_
> **Stack mirrored:** Next.js 14 (App Router) + Tailwind + Supabase + Paystack

---

## ✨ Features

### 🌍 Public website (`index.html`)
- Hero **carousel** (4 slides, auto-rotate, dot navigation)
- About the School + Principal's Message
- Academic Programs (JSS / SSS — Sciences / Arts / Commercial)
- Why Choose Us · Testimonials · Gallery
- Latest News (live from `blog_posts` Supabase table, falls back to seed)
- Contact section with map + form (saves to `contact_messages`)
- Apply for Admission form (`apply.html` → `pending_admissions` table)

### 🔐 Authentication (`login.html`)
- Email/password sign-in & sign-up via Supabase Auth
- Three roles auto-routed: **admin / teacher / student**
- Demo accounts (mock mode, no real keys needed):
  - `admin@greenfield.ng`
  - `teacher@greenfield.ng`
  - `student@greenfield.ng`
  - (any password — works without Supabase configured)

### 🎓 Student Portal (`student/index.html`)
- Profile (Name, Class, Admission No., Prefect Title, Guardian)
- Fee status with **Paystack** "Pay Now" button (Inline checkout)
- Result Checker (term + session selectors)
- **Result locking**: unpaid term → "🔒 Results Locked" banner
- Assignment downloads (filtered by subject/term, PDFs from Storage)
- **Printable Result Slip** with school header, subject table, grades,
  remarks, signature lines (`window.print()` → PDF)

### 🧑‍🏫 Teacher Dashboard (`teacher/index.html`)
- KPI overview (classes / subjects / assignments / results)
- **Bulk Result Entry** spreadsheet:
  - CA (40) + Exam (60) inputs, auto-total, auto-grade preview
  - Loads existing results, upserts on save
  - Filters by class · subject · term · session
- **Upload Assignments** (PDF → Supabase Storage)
- Filter uploaded assignments by class · subject · term

### 🛡️ Admin Panel (`admin/index.html`)
- KPI cards: active students, teachers, pending admissions, outstanding fees
- **Charts** (Chart.js): fee collection by term + class distribution doughnut
- **Admissions**: approve/reject pending applications, assign admission
  number + class in one click
- **Students**: search, filter by class, edit class & prefect title
- **Teachers**: list, add new, edit subject assignments
- **Fees**: every payment record, filter by term/status
- **Blog CMS**: create / edit / delete blog posts (used by public site)

---

## 🇳🇬 Nigerian-specific features

- ✅ **Term system**: 1st / 2nd / 3rd Term enum
- ✅ **Sessions**: e.g. `2024/2025`
- ✅ **Prefect titles**: Head Boy, Head Girl, Time Keeper, Sports, Library
- ✅ **WAEC grading**: A1 (75+), B2 (70-74), B3 (65-69), C4-C6 (50-64), D7 (45-49), E8 (40-44), F9 (<40) — with remarks
- ✅ **Result format**: school header, motto, address, signature lines
- ✅ **Paystack** payment gateway (Inline popup; webhook verifies server-side)
- ✅ **Naira (₦)** formatting everywhere

---

## 🗂 File structure

```
.
├── index.html                ← Public landing page
├── login.html                ← Auth (login + signup)
├── apply.html                ← Admission application form
├── student/index.html        ← Student Portal
├── teacher/index.html        ← Teacher Dashboard
├── admin/index.html          ← Admin Panel
├── css/style.css             ← All styles
├── js/
│   ├── config.js             ← ⚠️ Edit Supabase/Paystack keys here
│   ├── supabase-client.js    ← Singleton + helpers + mock client
│   ├── main.js               ← Public site interactions
│   ├── student.js            ← Student portal logic
│   ├── teacher.js            ← Teacher dashboard logic
│   └── admin.js              ← Admin panel logic
├── supabase/
│   ├── schema.sql            ← Tables, enums, triggers, helper functions
│   ├── rls.sql               ← Row Level Security policies
│   ├── storage.sql           ← Buckets + policies
│   └── seed.sql              ← Subjects, classes, sample blog post
├── paystack/
│   ├── webhook.js            ← Webhook handler (Next.js + Edge Function)
│   └── init-payment.js       ← Optional server-side init route
├── NEXTJS_MIGRATION.md       ← Step-by-step Next.js port guide
└── README.md
```

---

## 🚀 Setup — 5-minute quickstart

### 1. Mock mode (zero config)
Just open `index.html` in your browser. The app boots with a built-in mock
Supabase client + seed data so you can click through every feature
including dashboards and Paystack popup (test mode). Demo logins above.

### 2. Real Supabase
1. Create a new Supabase project at https://app.supabase.com
2. In the **SQL Editor**, run these files in order:
   ```
   supabase/schema.sql
   supabase/rls.sql
   supabase/storage.sql
   supabase/seed.sql      (optional — seeds subjects + classes)
   ```
3. **Authentication → Settings**: enable Email provider, disable confirm-email
   (or configure SMTP) for the fastest dev loop.
4. **Storage**: confirm the `assignments`, `result-pdfs`, `avatars` buckets
   were created by `storage.sql`.
5. Copy your project URL + anon key from **Settings → API**.
6. Edit `js/config.js`:
   ```js
   window.GA_CONFIG = {
     SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...',
     PAYSTACK_PUBLIC_KEY: 'pk_test_xxx',
     ...
   };
   ```
7. Reload — you're now talking to your real Supabase instance.

### 3. Paystack
1. Get keys from https://dashboard.paystack.com/#/settings/developers
2. Put the **public** key in `js/config.js`.
3. Deploy `paystack/webhook.js` (see comments inside) as either:
   - A Next.js route `app/api/paystack/webhook/route.ts`, or
   - A Supabase Edge Function `paystack-webhook`
4. Add your webhook URL in the Paystack dashboard.

### 4. Production deploy
**Static (this repo):** push to Vercel / Netlify / Cloudflare Pages — no build step.
**Next.js port:** see `NEXTJS_MIGRATION.md` for the full mapping.

---

## 🧭 URI map

| Path | Description | Access |
|---|---|---|
| `/` | Public landing page | Anyone |
| `/apply.html` | Admission application | Anyone |
| `/login.html` | Sign in / sign up | Anyone |
| `/student/` | Student dashboard | Role: student |
| `/teacher/` | Teacher dashboard | Role: teacher (or admin) |
| `/admin/` | Admin panel | Role: admin |

REST endpoints (Next.js port):
- `POST /api/paystack/init` — initialize a payment (optional redirect flow)
- `POST /api/paystack/webhook` — Paystack signature-verified webhook
- `POST /api/contact` — store a contact message (or use direct Supabase insert)

---

## 📊 Data model

| Table | Purpose | Key fields |
|---|---|---|
| `profiles` | 1:1 with `auth.users` | `id`, `role` enum, `full_name`, `email` |
| `students` | Enrolled students | `admission_no`, `class_id`, `prefect_title`, `status` |
| `staff` | Teachers | `profile_id`, `subject_ids[]` (uuid array), `phone` |
| `classes` | JSS1A, SS2B… | `name`, `level` (JSS/SSS), `teacher_id` |
| `subjects` | Curriculum | `name`, `code` |
| `results` | Grades | `ca_score` (0-40), `exam_score` (0-60), auto `total`, `grade`, `remark` |
| `assignments` | PDFs | `class_id`, `subject_id`, `term`, `file_url` |
| `payments` | Paystack | `student_id`, `term`, `session`, `paystack_ref`, `status` |
| `pending_admissions` | Applications | `class_applying`, `guardian_*`, `status` |
| `blog_posts` | News CMS | `title`, `slug`, `cover`, `body`, `published_at` |
| `contact_messages` | Inbox | `name`, `email`, `message` |

### Key triggers
- `handle_new_user()` — creates a `profiles` row when `auth.users` is inserted
- `calc_grade()` — auto-fills `grade` + `remark` whenever a `results` row is saved

### Key RLS rules
- `results_student_select` — student can only read own results **and only when the matching term's payment is `paid`** (this is the result-locking enforcement)
- `assignments_student_read` — student sees assignments for their `class_id`
- `staff_admin_write` — only admins manage teaching staff
- `pending_public_insert` — anyone can apply for admission

---

## 🎬 Demo accounts (mock mode)

| Email | Role | Lands in |
|---|---|---|
| `admin@greenfield.ng` | admin | `/admin/` |
| `teacher@greenfield.ng` | teacher | `/teacher/` |
| `student@greenfield.ng` | student | `/student/` |

Any password works in mock mode. State persists in `localStorage` under key `ga_mock_store_v1` — clear it to reset seeds.

---

## ✅ Implemented vs. roadmap

### Done
- [x] Public landing page (hero slider, all 8 sections)
- [x] Auth (login, signup, role routing)
- [x] Admission application form
- [x] Student Portal (profile, fees, results, assignments, slip, lock)
- [x] Teacher Dashboard (bulk results, assignment uploads, filters)
- [x] Admin Panel (admissions, students, teachers, fees, blog, charts)
- [x] Supabase schema + triggers + RLS + Storage policies
- [x] Paystack inline checkout + webhook handler
- [x] Printable result slip
- [x] Mock client so the UI runs without backend creds

### Suggested next steps
- [ ] Per-student result PDF generation server-side (jsPDF or React-PDF)
- [ ] SMS notifications to guardians on result publication (Termii API)
- [ ] Attendance module (per-class daily roll-call)
- [ ] Library / book lending module
- [ ] Multi-school SaaS mode (tenant_id on every row)
- [ ] React Native parent companion app

---

## 🎨 Branding (rename the school)

Find-and-replace **"Greenfield Academy"** → your school name across:
- `js/config.js` (school name, motto, address, phone, email, fees)
- All HTML `<title>` tags (5 files)
- The `<span class="logo-mark">G</span>` initial in each header
- Hero copy in `index.html`
- Color palette: edit the CSS variables at the top of `css/style.css`

That's it — under 10 minutes to rebrand for any Nigerian secondary school.

---

## 📄 License

MIT — adapt freely for any Nigerian secondary school.

Built with 💚 for Nigerian education.
