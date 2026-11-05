-- ==============================================================================
-- CampusMate: 20240104000000_auth_and_profiles.sql
-- Production Authentication, Profiles, Trigger and Row Level Security Setup
-- ==============================================================================

-- 1. Ensure public.profiles table exists with all required columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'cr', 'admin')),
    class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
    roll_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist in case table was created previously with older schema
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'cr', 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='class_group_id') THEN
        ALTER TABLE public.profiles ADD COLUMN class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_timestamp_trg ON public.profiles;
CREATE TRIGGER update_profiles_timestamp_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_profiles_timestamp();

-- 3. Robust Auth User Creation Trigger: handle_new_auth_user
-- Securely creates a student profile upon Supabase Auth signup (Email / Optional Google OAuth)
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

    -- Insert profile with student default role
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        class_group_id
    ) VALUES (
        NEW.id,
        clean_email,
        parsed_full_name,
        parsed_phone,
        'student',
        NULL
    )
        parsed_phone,
        'student',
        NULL
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, 'Campus Student'), public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach auth user creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Security Definer: Prevent non-service-role users from escalating to CR or changing class group
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only service_role (backend admin process) can change role or class_group_id directly
    IF (auth.jwt()->>'role' IS DISTINCT FROM 'service_role') THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Privilege Violation: Users cannot alter their own role. CR privileges must be assigned by an authorized administrator.';
        END IF;

        IF (NEW.class_group_id IS DISTINCT FROM OLD.class_group_id AND OLD.class_group_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Class Group Assignment is immutable once assigned. Contact your department administrator.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 5. Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

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

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);
