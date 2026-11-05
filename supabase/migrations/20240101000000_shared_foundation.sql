-- ==============================================================================
-- CampusMate: 00_shared_foundation.sql
-- Core Schema: Profiles, Colleges, Departments, Semesters, Subjects, Files
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Colleges
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_college_dept_code UNIQUE (college_id, code)
);

-- 3. Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- e.g. "2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Semesters (Per-user or Per-academic-year)
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    number INTEGER NOT NULL CHECK (number >= 1 AND number <= 12),
    label TEXT NOT NULL, -- e.g. "Semester 5 (Fall 2024)"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_semesters_updated_at ON public.semesters;
CREATE TRIGGER update_semesters_updated_at
    BEFORE UPDATE ON public.semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    current_semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    target_attendance_pct NUMERIC(5,2) DEFAULT 75.00 CHECK (target_attendance_pct >= 0 AND target_attendance_pct <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Subjects (Reusable across attendance, assignments, question papers)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL, -- e.g. "CS501"
    name TEXT NOT NULL, -- e.g. "Database Management Systems"
    credits INTEGER DEFAULT 3 CHECK (credits >= 0),
    faculty_name TEXT,
    room TEXT,
    color TEXT DEFAULT '#4f46e5',
    min_attendance_pct NUMERIC(5,2) DEFAULT 75.00 CHECK (min_attendance_pct >= 0 AND min_attendance_pct <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_subject_code UNIQUE (user_id, code)
);

DROP TRIGGER IF EXISTS update_subjects_updated_at ON public.subjects;
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_subject_semester UNIQUE (user_id, subject_id, semester_id)
);

-- 8. Files (Uploaded timetables, notes, assignments metadata)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bucket_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    purpose TEXT NOT NULL CHECK (purpose IN ('timetable', 'assignment', 'submission', 'question_paper', 'notes', 'profile')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Colleges & Departments & Academic Years: Publicly readable by authenticated users
DROP POLICY IF EXISTS "Authenticated users can view colleges" ON public.colleges;
CREATE POLICY "Authenticated users can view colleges" ON public.colleges
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments" ON public.departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view academic_years" ON public.academic_years;
CREATE POLICY "Authenticated users can view academic_years" ON public.academic_years
    FOR SELECT TO authenticated USING (true);

-- Profiles: Users access only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Semesters: User isolated
DROP POLICY IF EXISTS "Users can view own semesters" ON public.semesters;
CREATE POLICY "Users can view own semesters" ON public.semesters
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own semesters" ON public.semesters;
CREATE POLICY "Users can insert own semesters" ON public.semesters
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own semesters" ON public.semesters;
CREATE POLICY "Users can update own semesters" ON public.semesters
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own semesters" ON public.semesters;
CREATE POLICY "Users can delete own semesters" ON public.semesters
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Subjects: User isolated
DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
CREATE POLICY "Users can view own subjects" ON public.subjects
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subjects" ON public.subjects;
CREATE POLICY "Users can insert own subjects" ON public.subjects
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
CREATE POLICY "Users can update own subjects" ON public.subjects
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;
CREATE POLICY "Users can delete own subjects" ON public.subjects
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enrollments: User isolated
DROP POLICY IF EXISTS "Users can manage own enrollments" ON public.enrollments;
CREATE POLICY "Users can manage own enrollments" ON public.enrollments
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Files: User isolated
DROP POLICY IF EXISTS "Users can manage own files" ON public.files;
CREATE POLICY "Users can manage own files" ON public.files
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_semesters_user_id ON public.semesters(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
