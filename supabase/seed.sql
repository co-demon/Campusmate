-- ==============================================================================
-- CampusMate: seed.sql
-- Out-of-the-box Seed Data for CampusMate v3 Architecture
-- Includes: Class Group (CSE-3A), Lab Subgroups (A, B, C), Approved CR,
-- Subjects (including EC301 Digital Electronics), Class Sessions, and Change Log
-- ==============================================================================

-- 1. Class Group
INSERT INTO public.class_groups (id, course, department, year, section, name, academic_year)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'B.Tech',
    'CSE',
    3,
    'A',
    'CSE-3A',
    '2024-2025'
) ON CONFLICT DO NOTHING;

-- 2. Class Subgroups (Lab A, Lab B, Lab C)
INSERT INTO public.class_subgroups (id, class_group_id, name, code, capacity)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Lab Group A', 'A', 25),
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Lab Group B', 'B', 25),
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Lab Group C', 'C', 25)
ON CONFLICT DO NOTHING;

-- 3. Subjects for CSE-3A (Using valid hex UUIDs: a0000000-...)
INSERT INTO public.subjects (id, class_group_id, code, name, credits, faculty_name, room, color, min_attendance_pct)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CS501', 'Database Management Systems', 4, 'Dr. Arvind Sharma', 'LH-301', '#4f46e5', 75.0),
    ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'CS502', 'Operating Systems', 4, 'Prof. Rajesh Mehta', 'LH-302', '#0ea5e9', 75.0),
    ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'CS503', 'Computer Networks', 3, 'Dr. Kavita Patel', 'LH-301', '#10b981', 75.0),
    ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'CS504', 'Theory of Computation', 3, 'Prof. Sunita Gupta', 'LH-303', '#f59e0b', 75.0),
    ('a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'CS505L', 'Web Tech & DBMS Lab', 2, 'Dr. Arvind Sharma', 'CS Lab 2', '#8b5cf6', 75.0),
    ('a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'EC301', 'Digital Electronics', 3, 'Dr. P. Sen', 'LH-204', '#ec4899', 75.0)
ON CONFLICT DO NOTHING;
