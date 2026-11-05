-- ==============================================================================
-- CampusMate: 20240105000000_onboarding_and_student_profiles.sql
-- First-Time Student Onboarding Fields, Profile Constraints & RLS Policies
-- ==============================================================================

-- 1. Add onboarding profile columns to public.profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='course') THEN
        ALTER TABLE public.profiles ADD COLUMN course TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='semester') THEN
        ALTER TABLE public.profiles ADD COLUMN semester INTEGER CHECK (semester >= 1 AND semester <= 12);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='class_group') THEN
        ALTER TABLE public.profiles ADD COLUMN class_group TEXT CHECK (class_group IN ('Group 1', 'Group 2', 'Group 3'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='class_roll_number') THEN
        ALTER TABLE public.profiles ADD COLUMN class_roll_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_onboarded') THEN
        ALTER TABLE public.profiles ADD COLUMN is_onboarded BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Populate class_roll_number from legacy roll_number if available
UPDATE public.profiles
SET class_roll_number = roll_number
WHERE class_roll_number IS NULL AND roll_number IS NOT NULL;

-- 3. Create index on cohort assignment
CREATE INDEX IF NOT EXISTS idx_profiles_cohort ON public.profiles (course, semester, class_group);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON public.profiles (id, is_onboarded);

-- 4. Update trigger to safely handle new OAuth & email signups with is_onboarded = false
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    parsed_full_name TEXT;
    parsed_phone TEXT;
    clean_email TEXT;
BEGIN
    -- Determine full name safely from metadata or email prefix
    parsed_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), ''),
        CASE 
            WHEN NEW.email IS NOT NULL AND NEW.email <> '' 
            THEN INITCAP(REPLACE(split_part(NEW.email, '@', 1), '.', ' '))
            ELSE 'Campus Student'
        END
    );

    -- Extract optional phone contact info provided by user during signup
    parsed_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
    clean_email := COALESCE(NEW.email, '');

    -- Insert profile with student default role and is_onboarded = false
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        class_group_id,
        is_onboarded
    ) VALUES (
        NEW.id,
        clean_email,
        parsed_full_name,
        parsed_phone,
        'student',
        NULL,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, 'Campus Student'), public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Security Trigger: Strict Role Escalation Prevention
-- Users can update personal and onboarding fields, but CANNOT self-assign 'cr' or 'admin'
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only service_role can elevate role to 'cr' or 'admin'
    IF (auth.jwt()->>'role' IS DISTINCT FROM 'service_role') THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Privilege Violation: Users cannot alter their own role. CR privileges must be assigned by an authorized administrator.';
        END IF;

        -- Prevent unauthorized changes to class_group_id once assigned
        IF (NEW.class_group_id IS DISTINCT FROM OLD.class_group_id AND OLD.class_group_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Class Group Assignment is immutable once assigned. Contact your department administrator.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure RLS Policies are clean and active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
