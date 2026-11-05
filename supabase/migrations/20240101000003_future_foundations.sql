-- ==============================================================================
-- CampusMate: 03_future_foundations.sql
-- Foundational Schema for Future Modules: Assignments, Question Papers, Study Materials, Notifications
-- ==============================================================================

-- 1. Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
    max_marks NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Assignment Submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    submission_text TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    grade NUMERIC(5,2),
    feedback TEXT
);

-- 3. Question Papers (Previous Years Questions)
CREATE TABLE IF NOT EXISTS public.question_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('mid_term', 'end_term', 'quiz', 'supplementary')),
    year INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Study Materials
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    topic TEXT,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'attendance_warning', 'unconfirmed_reminder', 'holiday', 'schedule_change')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own assignments" ON public.assignments;
CREATE POLICY "Users can manage own assignments" ON public.assignments
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own submissions" ON public.assignment_submissions;
CREATE POLICY "Users can manage own submissions" ON public.assignment_submissions
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view question papers" ON public.question_papers;
CREATE POLICY "Users can view question papers" ON public.question_papers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage own study materials" ON public.study_materials;
CREATE POLICY "Users can manage own study materials" ON public.study_materials
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

