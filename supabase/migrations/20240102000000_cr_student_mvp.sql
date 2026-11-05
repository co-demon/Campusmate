-- ==============================================================================
-- CampusMate: 20240102000000_cr_student_mvp.sql
-- Core Schema for Class Representative (CR) Timetable Management & Student Attendance
-- ==============================================================================

-- Enable extensions
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

-- 1. Class Groups (e.g. B.Tech CSE Year 3 Section A)
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

-- 2. User Profiles (Linked to Supabase Auth users)
-- Role is ENFORCED by database; client cannot self-grant CR or admin privileges
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,                     -- Prepared for phone OTP authentication
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'cr', 'admin')),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
    target_attendance_pct NUMERIC(5,2) DEFAULT 75.00 CHECK (target_attendance_pct >= 0 AND target_attendance_pct <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist even if public.profiles already existed from earlier schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_modtime

    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Auto-create profile on Supabase Auth signup (default role: student)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, class_group_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student', -- Always default to student, NEVER trust user metadata for role
        (NEW.raw_user_meta_data->>'class_group_id')::UUID
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Timetable Versions (Uploaded and managed by authorized CRs)
CREATE TABLE IF NOT EXISTS public.timetable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    file_path TEXT,                 -- Path in private Supabase Storage 'timetables' bucket
    file_name TEXT,
    notes TEXT,                     -- e.g. "Revised after Lab slot rescheduling"
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_version UNIQUE (class_group_id, version_number)
);

DROP TRIGGER IF EXISTS update_timetable_versions_modtime ON public.timetable_versions;
CREATE TRIGGER update_timetable_versions_modtime
    BEFORE UPDATE ON public.timetable_versions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 4. Timetable Entries (Individual slots in a timetable version)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES public.timetable_versions(id) ON DELETE CASCADE NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 7), -- 1=Monday, 7=Sunday
    subject_code TEXT NOT NULL,     -- e.g. "CS501"
    subject_name TEXT NOT NULL,     -- e.g. "Database Management Systems"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,                      -- e.g. "LH-301"
    instructor TEXT,                -- e.g. "Dr. Arvind Sharma"
    slot_type TEXT NOT NULL DEFAULT 'lecture' CHECK (slot_type IN ('lecture', 'lab', 'tutorial')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time)
);

-- 5. Attendance Records (Personal to each student; CR cannot edit)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('attended', 'absent')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Strictly prevent duplicate attendance for the same student, slot, and date
    CONSTRAINT unique_student_slot_date UNIQUE (student_id, timetable_entry_id, date)
);

DROP TRIGGER IF EXISTS update_attendance_records_modtime ON public.attendance_records;
CREATE TRIGGER update_attendance_records_modtime
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 6. Class Announcements (Cancellations, holidays, extra classes posted by CR)
CREATE TABLE IF NOT EXISTS public.class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cancellation', 'holiday', 'extra_class', 'general')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    affected_date DATE,
    affected_subject TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;

-- Class Groups: Readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view class groups" ON public.class_groups;
CREATE POLICY "Authenticated users can view class groups" ON public.class_groups
    FOR SELECT TO authenticated USING (true);

-- Profiles: Users can view profiles in their class group; users can only update own profile (excluding role)
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
CREATE POLICY "Users can view relevant profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR class_group_id IN (SELECT p.class_group_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- Timetable Versions:
-- 1. Students can view published versions for their class group
DROP POLICY IF EXISTS "Students can view published timetable versions" ON public.timetable_versions;
CREATE POLICY "Students can view published timetable versions" ON public.timetable_versions
    FOR SELECT TO authenticated
    USING (
        status = 'published' AND
        class_group_id IN (SELECT p.class_group_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- 2. CRs and Admins can view, insert, update drafts for their class group
DROP POLICY IF EXISTS "CRs can manage drafts for their class group" ON public.timetable_versions;
CREATE POLICY "CRs can manage drafts for their class group" ON public.timetable_versions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.role IN ('cr', 'admin') 
              AND p.class_group_id = timetable_versions.class_group_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.role IN ('cr', 'admin') 
              AND p.class_group_id = timetable_versions.class_group_id
        )
    );

-- Timetable Entries:
-- Readable if the parent timetable version is readable
DROP POLICY IF EXISTS "Users can view entries for readable versions" ON public.timetable_entries;
CREATE POLICY "Users can view entries for readable versions" ON public.timetable_entries
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.timetable_versions v
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE v.id = timetable_entries.version_id
              AND (
                  (v.status = 'published' AND v.class_group_id = p.class_group_id)
                  OR (p.role IN ('cr', 'admin') AND v.class_group_id = p.class_group_id)
              )
        )
    );

-- CRs can insert, update, delete entries for their draft versions
DROP POLICY IF EXISTS "CRs can edit entries for draft versions" ON public.timetable_entries;
CREATE POLICY "CRs can edit entries for draft versions" ON public.timetable_entries
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.timetable_versions v
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE v.id = timetable_entries.version_id
              AND v.status = 'draft'
              AND p.role IN ('cr', 'admin')
              AND v.class_group_id = p.class_group_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.timetable_versions v
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE v.id = timetable_entries.version_id
              AND v.status = 'draft'
              AND p.role IN ('cr', 'admin')
              AND v.class_group_id = p.class_group_id
        )
    );

-- Attendance Records: Strictly Personal!
-- Students can only view, record, or edit their OWN attendance records
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance_records;
CREATE POLICY "Students can view own attendance" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own attendance" ON public.attendance_records;
CREATE POLICY "Students can insert own attendance" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own attendance" ON public.attendance_records;
CREATE POLICY "Students can update own attendance" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can delete own attendance" ON public.attendance_records;
CREATE POLICY "Students can delete own attendance" ON public.attendance_records
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());

-- Class Announcements:
-- Students can view announcements for their class group
DROP POLICY IF EXISTS "Students can view announcements" ON public.class_announcements;
CREATE POLICY "Students can view announcements" ON public.class_announcements
    FOR SELECT TO authenticated
    USING (
        class_group_id IN (SELECT p.class_group_id FROM public.profiles p WHERE p.id = auth.uid())
    );

-- CRs can insert and manage announcements for their class group
DROP POLICY IF EXISTS "CRs can manage announcements" ON public.class_announcements;
CREATE POLICY "CRs can manage announcements" ON public.class_announcements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.role IN ('cr', 'admin') 
              AND p.class_group_id = class_announcements.class_group_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
              AND p.role IN ('cr', 'admin') 
              AND p.class_group_id = class_announcements.class_group_id
        )
    );

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_class_group ON public.profiles(class_group_id);
CREATE INDEX IF NOT EXISTS idx_versions_group_status ON public.timetable_versions(class_group_id, status);
CREATE INDEX IF NOT EXISTS idx_entries_version ON public.timetable_entries(version_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_announcements_group_date ON public.class_announcements(class_group_id, affected_date);

-- ==============================================================================
-- Storage Bucket & Security Policy
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'timetables', 
    'timetables', 
    false, 
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- Storage access: CRs can upload to timetables bucket for their class group
DROP POLICY IF EXISTS "CRs can upload timetable files" ON storage.objects;
CREATE POLICY "CRs can upload timetable files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'timetables' AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('cr', 'admin')
    )
);

-- Students and CRs in that class group can read timetable files
DROP POLICY IF EXISTS "Class members can read timetable files" ON storage.objects;
CREATE POLICY "Class members can read timetable files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'timetables'
);
