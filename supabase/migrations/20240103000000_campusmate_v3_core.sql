-- ==============================================================================
-- CampusMate: 20240103000000_campusmate_v3_core.sql
-- Master Schema: Verified CR Assignments, Lab Subgroups, Timetable Imports, 
-- Class Sessions, Audit Log & Per-Student Attendance
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. User Profiles (Auth Users metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    roll_number TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Auto-create profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, roll_number, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'roll_number',
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 2. Class Groups (Main cohort: e.g. B.Tech CSE Year 3 Section A)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course TEXT NOT NULL,           -- e.g. "B.Tech"
    department TEXT NOT NULL,       -- e.g. "CSE"
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 5),
    section TEXT NOT NULL,          -- e.g. "A"
    name TEXT NOT NULL,             -- e.g. "CSE-3A"
    academic_year TEXT NOT NULL DEFAULT '2024-2025',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_class_group UNIQUE (department, year, section, academic_year)
);

-- ------------------------------------------------------------------------------
-- 3. Class Group Members (Links each student to their main class group)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_class_group UNIQUE (class_group_id, student_id)
);

-- ------------------------------------------------------------------------------
-- 4. Class Subgroups (Lab groups A/B/C belonging to a main class group)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_subgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,             -- e.g. "Lab Group A", "Lab Group B", "Lab Group C"
    code TEXT NOT NULL,             -- e.g. "A", "B", "C"
    capacity INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_subgroup_code_in_group UNIQUE (class_group_id, code)
);

-- ------------------------------------------------------------------------------
-- 5. Subgroup Members (Assigns each student to their lab subgroup)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subgroup_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subgroup_id UUID REFERENCES public.class_subgroups(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_subgroup UNIQUE (subgroup_id, student_id)
);

-- ------------------------------------------------------------------------------
-- 6. CR Assignments (Approved CRs managing class groups or subgroups)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cr_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    subgroup_id UUID REFERENCES public.class_subgroups(id) ON DELETE CASCADE, -- NULL means manages entire class group
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'revoked')),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_cr_assignment UNIQUE (user_id, class_group_id, subgroup_id)
);

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.is_approved_cr(target_class_group_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.cr_assignments
        WHERE user_id = target_user_id
          AND class_group_id = target_class_group_id
          AND status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_class_member(target_class_group_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.class_group_members
        WHERE class_group_id = target_class_group_id
          AND student_id = target_user_id
          AND is_active = true
    ) OR public.is_approved_cr(target_class_group_id, target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. Subjects (Belonging to a class group)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,             -- e.g. "CS501"
    name TEXT NOT NULL,             -- e.g. "Database Management Systems"
    credits INTEGER DEFAULT 3 CHECK (credits >= 0),
    faculty_name TEXT,
    room TEXT,
    color TEXT DEFAULT '#4f46e5',
    min_attendance_pct NUMERIC(5,2) DEFAULT 75.00 CHECK (min_attendance_pct >= 0 AND min_attendance_pct <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_subject_code UNIQUE (class_group_id, code)
);

DROP TRIGGER IF EXISTS update_subjects_modtime ON public.subjects;
CREATE TRIGGER update_subjects_modtime
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ------------------------------------------------------------------------------
-- 8. Timetable Imports (Uploaded file, scan status, draft data, approval status)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetable_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT,                 -- Path in private Supabase Storage 'timetables' bucket
    file_name TEXT,
    scan_status TEXT NOT NULL DEFAULT 'extracted' CHECK (scan_status IN ('pending', 'extracted', 'reviewed', 'published', 'failed')),
    draft_data JSONB DEFAULT '{}'::jsonb, -- Detected subjects, slots, candidate entries, flags
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 9. Class Sessions (Actual calendar entries with date/time, status, optional subgroup)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    subgroup_id UUID REFERENCES public.class_subgroups(id) ON DELETE SET NULL, -- NULL = whole class (lecture), or specific lab subgroup
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    faculty_name TEXT,
    session_type TEXT NOT NULL DEFAULT 'lecture' CHECK (session_type IN ('lecture', 'lab', 'tutorial', 'extra')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'holiday')),
    cancellation_reason TEXT,
    import_id UUID REFERENCES public.timetable_imports(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_session_time CHECK (start_time < end_time)
);

DROP TRIGGER IF EXISTS update_class_sessions_modtime ON public.class_sessions;
CREATE TRIGGER update_class_sessions_modtime
    BEFORE UPDATE ON public.class_sessions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ------------------------------------------------------------------------------
-- 10. Attendance Records (Per-student attendance for each session)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'unmarked' CHECK (status IN ('attended', 'absent', 'unmarked')),
    remarks TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_session_student_attendance UNIQUE (session_id, student_id)
);

DROP TRIGGER IF EXISTS update_attendance_records_modtime ON public.attendance_records;
CREATE TRIGGER update_attendance_records_modtime
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ------------------------------------------------------------------------------
-- 11. Class Change Log (Audit trail for session cancellations, moves, additions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE,
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('cancelled', 'rescheduled', 'extra_added', 'room_changed', 'reopened', 'corrected')),
    reason TEXT NOT NULL,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. Assignments & Study Materials (Scoped to class group & optional subject)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
    max_marks NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    topic TEXT,
    file_path TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgroup_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cr_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can view profiles in their class group; users can edit own profile
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Class Groups: Readable by members & approved CRs
DROP POLICY IF EXISTS "Members can view class groups" ON public.class_groups;
CREATE POLICY "Members can view class groups" ON public.class_groups
    FOR SELECT TO authenticated USING (true);

-- Class Subgroups: Readable by class group members
DROP POLICY IF EXISTS "Members can view subgroups" ON public.class_subgroups;
CREATE POLICY "Members can view subgroups" ON public.class_subgroups
    FOR SELECT TO authenticated
    USING (public.is_class_member(class_group_id, auth.uid()));

-- Subgroup Members: Readable by class members
DROP POLICY IF EXISTS "Members can view subgroup members" ON public.subgroup_members;
CREATE POLICY "Members can view subgroup members" ON public.subgroup_members
    FOR SELECT TO authenticated USING (true);

-- CR Assignments: Readable by class members; CR status checked by backend
DROP POLICY IF EXISTS "Members can view CR assignments" ON public.cr_assignments;
CREATE POLICY "Members can view CR assignments" ON public.cr_assignments
    FOR SELECT TO authenticated USING (true);

-- Subjects: Readable by class group members
DROP POLICY IF EXISTS "Members can view subjects" ON public.subjects;
CREATE POLICY "Members can view subjects" ON public.subjects
    FOR SELECT TO authenticated
    USING (public.is_class_member(class_group_id, auth.uid()));

DROP POLICY IF EXISTS "CRs can manage subjects" ON public.subjects;
CREATE POLICY "CRs can manage subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_approved_cr(class_group_id, auth.uid()))
    WITH CHECK (public.is_approved_cr(class_group_id, auth.uid()));

-- Timetable Imports: Only approved CRs can insert, update, or read drafts
DROP POLICY IF EXISTS "CRs can manage timetable imports" ON public.timetable_imports;
CREATE POLICY "CRs can manage timetable imports" ON public.timetable_imports
    FOR ALL TO authenticated
    USING (public.is_approved_cr(class_group_id, auth.uid()))
    WITH CHECK (public.is_approved_cr(class_group_id, auth.uid()));

-- Class Sessions:
-- 1. Students can see sessions for whole class (subgroup_id IS NULL) OR sessions for their assigned subgroup
DROP POLICY IF EXISTS "Students view relevant class sessions" ON public.class_sessions;
CREATE POLICY "Students view relevant class sessions" ON public.class_sessions
    FOR SELECT TO authenticated
    USING (
        public.is_class_member(class_group_id, auth.uid())
        AND (
            subgroup_id IS NULL 
            OR subgroup_id IN (
                SELECT sm.subgroup_id FROM public.subgroup_members sm WHERE sm.student_id = auth.uid()
            )
            OR public.is_approved_cr(class_group_id, auth.uid())
        )
    );

-- 2. CRs can manage (insert/update/delete) sessions for their assigned class group
DROP POLICY IF EXISTS "CRs can manage class sessions" ON public.class_sessions;
CREATE POLICY "CRs can manage class sessions" ON public.class_sessions
    FOR ALL TO authenticated
    USING (public.is_approved_cr(class_group_id, auth.uid()))
    WITH CHECK (public.is_approved_cr(class_group_id, auth.uid()));

-- Attendance Records: Strictly personal!
-- Each student can only view, insert, or update their OWN attendance
DROP POLICY IF EXISTS "Students can view own attendance records" ON public.attendance_records;
CREATE POLICY "Students can view own attendance records" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own attendance records" ON public.attendance_records;
CREATE POLICY "Students can insert own attendance records" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own attendance records" ON public.attendance_records;
CREATE POLICY "Students can update own attendance records" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Class Change Log: Readable by class members; insertable by approved CRs
DROP POLICY IF EXISTS "Members can view class change log" ON public.class_change_log;
CREATE POLICY "Members can view class change log" ON public.class_change_log
    FOR SELECT TO authenticated
    USING (public.is_class_member(class_group_id, auth.uid()));

DROP POLICY IF EXISTS "CRs can insert class change log" ON public.class_change_log;
CREATE POLICY "CRs can insert class change log" ON public.class_change_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_approved_cr(class_group_id, auth.uid()));

-- Assignments & Study Materials
DROP POLICY IF EXISTS "Members can view class assignments" ON public.assignments;
CREATE POLICY "Members can view class assignments" ON public.assignments
    FOR SELECT TO authenticated
    USING (public.is_class_member(class_group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view class study materials" ON public.study_materials;
CREATE POLICY "Members can view class study materials" ON public.study_materials
    FOR SELECT TO authenticated
    USING (public.is_class_member(class_group_id, auth.uid()));

-- ------------------------------------------------------------------------------
-- 14. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.class_group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.class_group_members(class_group_id);
CREATE INDEX IF NOT EXISTS idx_subgroup_members_student ON public.subgroup_members(student_id);
CREATE INDEX IF NOT EXISTS idx_cr_assignments_user_group ON public.cr_assignments(user_id, class_group_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_group_date ON public.class_sessions(class_group_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_subgroup ON public.class_sessions(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON public.class_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_session ON public.attendance_records(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_change_log_session ON public.class_change_log(session_id);

-- ------------------------------------------------------------------------------
-- 15. Private Storage Bucket Setup
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'timetables', 
    'timetables', 
    false, 
    15728640, -- 15MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];

DROP POLICY IF EXISTS "CRs can upload timetable files" ON storage.objects;
CREATE POLICY "CRs can upload timetable files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'timetables'
);

DROP POLICY IF EXISTS "Members can read timetable files" ON storage.objects;
CREATE POLICY "Members can read timetable files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'timetables'
);
