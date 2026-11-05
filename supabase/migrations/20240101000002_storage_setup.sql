-- ==============================================================================
-- CampusMate: 02_storage_setup.sql
-- Storage Buckets & Policies for Timetables and Student Documents
-- ==============================================================================

-- Create buckets for timetables and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('timetables', 'timetables', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']),
    ('student_documents', 'student_documents', false, 20971520, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for storage.objects
-- Note: users store files in folders prefixed by their auth.uid() e.g. "userId/filename.pdf"

DROP POLICY IF EXISTS "Users can upload their own files to timetables bucket" ON storage.objects;
CREATE POLICY "Users can upload their own files to timetables bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'timetables' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own files in timetables bucket" ON storage.objects;
CREATE POLICY "Users can view their own files in timetables bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'timetables' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own files in timetables bucket" ON storage.objects;
CREATE POLICY "Users can delete their own files in timetables bucket"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'timetables' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload their own files to student_documents bucket" ON storage.objects;
CREATE POLICY "Users can upload their own files to student_documents bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'student_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own files in student_documents bucket" ON storage.objects;
CREATE POLICY "Users can view their own files in student_documents bucket"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'student_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own files in student_documents bucket" ON storage.objects;
CREATE POLICY "Users can delete their own files in student_documents bucket"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'student_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

