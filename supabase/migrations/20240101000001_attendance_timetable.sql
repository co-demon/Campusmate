-- ==============================================================================
-- CampusMate: 01_attendance_timetable.sql
-- Feature Schema: Timetable entries, Class occurrences, Attendance records, Holidays
-- ==============================================================================

-- 1. Timetable Entries (Recurring weekly pattern)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    faculty_name TEXT,
    slot_type TEXT NOT NULL DEFAULT 'lecture' CHECK (slot_type IN ('lecture', 'lab', 'tutorial')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_slot_time CHECK (start_time < end_time)
);

-- 2. Class Occurrences (Individual scheduled instances)
CREATE TABLE IF NOT EXISTS public.class_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL, -- NULL for extra classes
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    faculty_name TEXT,
    event_type TEXT NOT NULL DEFAULT 'regular' CHECK (event_type IN ('regular', 'extra', 'rescheduled')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_occurrence_time CHECK (start_time < end_time),
    -- Strictly prevent duplicate class occurrences for a user at the same date and time for a subject
    CONSTRAINT unique_user_subject_date_time UNIQUE (user_id, subject_id, date, start_time)
);

DROP TRIGGER IF EXISTS update_class_occurrences_updated_at ON public.class_occurrences;
CREATE TRIGGER update_class_occurrences_updated_at
    BEFORE UPDATE ON public.class_occurrences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_occurrence_id UUID REFERENCES public.class_occurrences(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (status IN ('unconfirmed', 'attended', 'absent')),
    remarks TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Holidays
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL if global/college-wide
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    applies_to_all BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Timetable Entries Policies
DROP POLICY IF EXISTS "Users can manage own timetable entries" ON public.timetable_entries;
CREATE POLICY "Users can manage own timetable entries" ON public.timetable_entries
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Class Occurrences Policies
DROP POLICY IF EXISTS "Users can manage own class occurrences" ON public.class_occurrences;
CREATE POLICY "Users can manage own class occurrences" ON public.class_occurrences
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attendance Records Policies
DROP POLICY IF EXISTS "Users can manage own attendance records" ON public.attendance_records;
CREATE POLICY "Users can manage own attendance records" ON public.attendance_records
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Holidays Policies: View college holidays or user-created holidays
DROP POLICY IF EXISTS "Users can view relevant holidays" ON public.holidays;
CREATE POLICY "Users can view relevant holidays" ON public.holidays
    FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own custom holidays" ON public.holidays;
CREATE POLICY "Users can manage own custom holidays" ON public.holidays
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_timetable_user_semester ON public.timetable_entries(user_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_user_date ON public.class_occurrences(user_id, date);
CREATE INDEX IF NOT EXISTS idx_occurrences_user_subject ON public.class_occurrences(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_status ON public.attendance_records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
