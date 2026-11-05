# CampusMate — Smart Attendance & Class Planner

CampusMate is a scalable, modular full-stack college productivity platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, Storage)**.

The first core module is the **Smart Attendance & Class Planner**, which automatically extracts student timetables from uploaded documents (PDF, images, spreadsheets), generates a semester calendar of class occurrences, tracks attendance via student-reported absences, and computes attendance predictions ("Can I Take a Holiday?").

---

## 1. Key Features

- **Automated Timetable Upload & Extraction**:
  - Accepts PDF, PNG, JPG, Excel (.xlsx, .xls), and CSV timetable files.
  - Automatically identifies subject codes, full names, weekly slots, classrooms, and faculty names.
  - Interactive **Review & Confirmation** screen to inspect or edit extracted slots before calendar generation.
  - 1-Click "Load Sample Timetable" for instant testability without needing sample files.
- **Academic Calendar Generation**:
  - Automatically generates all individual recurring class occurrences across the semester.
  - Strictly prevents duplicate classes on repeated uploads.
  - Preserves recorded attendance history across timetable updates.
- **Frictionless Attendance Tracking**:
  - Core philosophy: *The system manages the timetable and calculations; the student only reports what the system cannot know.*
  - Unconfirmed attendance remains distinct from attended and absent records.
  - 1-Click "Confirm All as Attended" daily reminder action.
  - Instant "I was Absent" quick reporting directly from today's schedule or calendar.
- **Pure Calculation Engine**:
  - Conducted classes = completed non-cancelled regular and extra classes.
  - Cancelled classes are never counted as conducted or absences.
  - Extra classes count toward conducted and attended counts.
  - Exact formulas for target recovery: $\lceil \frac{T \cdot C - 100 \cdot A}{100 - T} \rceil$.
  - Exact formulas for safe bunk capacity: $\lfloor \frac{100 \cdot A - T \cdot C}{T} \rfloor$.
- **"Can I Take a Holiday?" Bunk Planner**:
  - Select any future date to simulate the impact of missing all classes scheduled on that day.
  - Real-time projection comparing current attendance vs projected attendance per subject and overall.
  - Calculates recovery classes needed if attendance drops below the 75% target threshold.
- **Holidays, Cancellations & Extra Classes**:
  - Declare college holidays in one click (cancels all scheduled classes on that date without marking students absent).
  - Add extra or makeup lectures on the fly.
- **Modern UI & Themes**:
  - Polished modern productivity interface inspired by contemporary tools.
  - Dark mode and Light mode with instant theme toggle and system preference detection.
  - Responsive mobile layout with slide-out navigation.

---

## 2. Technology Stack

- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS, Lucide React Icons
- **Database, Auth & Storage**: Supabase (PostgreSQL, Row Level Security, Storage Buckets)
- **Forms & Validation**: Zod, React Hook Form
- **File Parsing**: SheetJS (`xlsx`) for Excel/CSV, extensible AI/OCR API connectors
- **Testing**: Vitest (12 comprehensive unit tests for math, duplicate prevention, and recurrence)

---

## 3. Project Structure

CampusMate follows a **Modular Monolith** architecture:

```text
campusmate/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx         # Supabase Auth & 1-click Demo sign-in
│   │   │   └── signup/page.tsx        # Account registration
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Shell, sidebar, header, global action modals
│   │   │   ├── dashboard/page.tsx     # Today's schedule, unconfirmed alert, quick actions
│   │   │   ├── attendance/page.tsx    # Subject-wise attendance breakdown, thresholds, history
│   │   │   ├── timetable/
│   │   │   │   ├── page.tsx           # Weekly timetable grid matrix (Mon-Fri)
│   │   │   │   └── upload/page.tsx    # Document upload, OCR/AI preview, review & confirm
│   │   │   ├── calendar/page.tsx      # Monthly/daily class occurrences and holiday flags
│   │   │   ├── planner/page.tsx       # "Can I Take a Holiday?" bunk projection engine
│   │   │   └── settings/page.tsx      # Attendance target %, semester dates, reset demo
│   │   └── api/
│   │       └── timetable/extract/     # Multipart file upload parser (PDF, Image, Excel, CSV)
│   ├── components/
│   │   ├── layout/                    # Sidebar, Header, ThemeToggle
│   │   └── ui/                        # Buttons, Badges, Modals
│   ├── features/
│   │   ├── attendance/
│   │   │   ├── components/            # ReportAbsenceModal, DeclareHolidayModal, AddExtraClassModal
│   │   │   ├── services/              # attendanceEngine.ts (pure math & business logic)
│   │   │   ├── types/                 # AttendanceStatus, SubjectAttendanceSummary, BunkSimulation
│   │   │   └── tests/                 # Vitest test suite for math and bunk calculations
│   │   └── timetable/
│   │       ├── services/              # calendarGenerator.ts, timetableParser.ts
│   │       ├── types/                 # TimetableEntry, ClassOccurrence, ExtractedTimetable
│   │       └── tests/                 # Vitest test suite for recurrence and duplicate prevention
│   ├── lib/
│   │   ├── supabase/                  # client.ts, server.ts, admin.ts, middleware.ts
│   │   └── database/                  # campusRepository.ts (dual-mode Supabase + local repository)
│   └── types/
│       └── database.types.ts          # Generated Supabase database TypeScript schema
├── supabase/
│   ├── migrations/
│   │   ├── 20240101000000_shared_foundation.sql     # Profiles, Colleges, Semesters, Subjects, Files
│   │   ├── 20240101000001_attendance_timetable.sql   # Timetable entries, Class occurrences, Attendance, Holidays
│   │   ├── 20240101000002_storage_setup.sql          # Private storage buckets & RLS policies
│   │   └── 20240101000003_future_foundations.sql     # Assignments, Question papers, Study materials, Notifications
│   └── seed.sql                                      # CS Department Semester 5 seed data
└── .env.example                                      # Environment variables template
```

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 20+ (recommended v22 or v24)
- npm 10+

### Installation

```bash
# 1. Clone or open the project directory
cd campusmate

# 2. Install dependencies
npm install

# 3. Create your local environment configuration
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> **Instant Local Demo Mode**:
> CampusMate is configured with an offline-first repository. Even without configuring Supabase credentials, the app runs with full interactivity:
> - View preloaded Computer Science Semester 5 timetable and today's classes.
> - Report absences or confirm attendance.
> - Upload timetables (or use the sample button).
> - Test the "Can I Take a Holiday?" simulator.
> - Declare holidays or add extra classes.

---

## 5. Connecting Supabase (Production Setup)

To connect your remote Supabase PostgreSQL project:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings -> API** and copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Public Key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key -> `SUPABASE_SERVICE_ROLE_KEY`
3. Paste them into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```
4. Apply the database migrations:
   - Option A: Run via Supabase CLI:
     ```bash
     supabase db push
     ```
   - Option B: Open the Supabase Dashboard **SQL Editor** and execute the migration files in order:
     1. `supabase/migrations/20240101000000_shared_foundation.sql`
     2. `supabase/migrations/20240101000001_attendance_timetable.sql`
     3. `supabase/migrations/20240101000002_storage_setup.sql`
     4. `supabase/migrations/20240101000003_future_foundations.sql`
     5. `supabase/seed.sql`

---

## 6. Running Tests

CampusMate uses **Vitest** for fast unit testing of pure calculation and scheduling logic:

```bash
# Run all unit test suites
npm run test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- Attendance percentage formula with attended, absent, and unconfirmed states.
- Exclusion of cancelled classes from conducted and absence counts.
- Inclusion of extra classes in conducted count.
- Maximum bunk allowance calculation when above target.
- Target recovery classes needed when below target.
- "Can I Take a Holiday?" predictive what-if simulator.
- Calendar recurrence generation from timetable slots.
- Strict duplicate occurrence prevention on timetable re-generation.
- Emergency holiday mass-cancellation without penalty.
- Time string normalization and OCR parser heuristics.

---

## 7. Future Modules Integration Roadmap

CampusMate's shared database foundation (`profiles`, `colleges`, `departments`, `semesters`, `subjects`, `enrollments`, `files`) was specifically designed to support future modules without schema rewrites:

1. **Assignments & Submissions (`assignments`, `assignment_submissions`)**:
   - Reference `subjects(id)` and `semesters(id)`. Submissions link directly to private storage in `files(id)`.
2. **Previous Years Question Papers (`question_papers`)**:
   - Organized by `subject_id`, `exam_type` (mid-term, end-term), and `year`. Linked to PDF storage.
3. **Study Materials & Lecture Notes (`study_materials`)**:
   - Tagged by `subject_id` and topics for subject-level resource sharing.
4. **Notifications (`notifications`)**:
   - Automatically alerts students when unconfirmed attendance exceeds 3 classes, when attendance dips below 75%, or when college holidays are declared.
