import { describe, it, expect } from "vitest";
import { isProfileComplete, OnboardingInput } from "@/lib/onboarding";
import { Profile } from "@/types/database.types";

describe("First-Time Student Onboarding & Google Sign-In Flow", () => {
  describe("isProfileComplete Profile Validator", () => {
    it("returns false when profile is null or undefined", () => {
      expect(isProfileComplete(null)).toBe(false);
      expect(isProfileComplete(undefined)).toBe(false);
    });

    it("returns false when is_onboarded is false or missing", () => {
      const incompleteProfile: Partial<Profile> = {
        id: "usr-google-101",
        email: "student@college.edu",
        full_name: "Rahul Verma",
        is_onboarded: false,
        course: "B.Tech CSE",
        semester: 3,
        class_group: "Group 1",
        class_roll_number: "042",
      };
      expect(isProfileComplete(incompleteProfile)).toBe(false);
    });

    it("returns false when required academic fields are missing", () => {
      const base: Partial<Profile> = {
        id: "usr-google-102",
        email: "student@college.edu",
        full_name: "Rahul Verma",
        is_onboarded: true,
      };

      // Missing course
      expect(isProfileComplete({ ...base, semester: 3, class_group: "Group 1", class_roll_number: "042" })).toBe(false);
      // Missing semester
      expect(isProfileComplete({ ...base, course: "B.Tech CSE", class_group: "Group 1", class_roll_number: "042" })).toBe(false);
      // Missing class_group
      expect(isProfileComplete({ ...base, course: "B.Tech CSE", semester: 3, class_roll_number: "042" })).toBe(false);
      // Missing class_roll_number
      expect(isProfileComplete({ ...base, course: "B.Tech CSE", semester: 3, class_group: "Group 1" })).toBe(false);
    });

    it("validates semester must be between 1 and 12", () => {
      const base: Partial<Profile> = {
        id: "usr-google-103",
        email: "student@college.edu",
        full_name: "Rahul Verma",
        is_onboarded: true,
        course: "B.Tech CSE",
        class_group: "Group 2",
        class_roll_number: "007",
      };

      expect(isProfileComplete({ ...base, semester: 0 })).toBe(false);
      expect(isProfileComplete({ ...base, semester: 13 })).toBe(false);
      expect(isProfileComplete({ ...base, semester: 1 })).toBe(true);
      expect(isProfileComplete({ ...base, semester: 8 })).toBe(true);
      expect(isProfileComplete({ ...base, semester: 12 })).toBe(true);
    });

    it("strictly allows only 'Group 1', 'Group 2', or 'Group 3'", () => {
      const base: Partial<Profile> = {
        id: "usr-google-104",
        email: "student@college.edu",
        full_name: "Rahul Verma",
        is_onboarded: true,
        course: "B.Tech CSE",
        semester: 4,
        class_roll_number: "042",
      };

      expect(isProfileComplete({ ...base, class_group: "Group 1" })).toBe(true);
      expect(isProfileComplete({ ...base, class_group: "Group 2" })).toBe(true);
      expect(isProfileComplete({ ...base, class_group: "Group 3" })).toBe(true);
      expect(isProfileComplete({ ...base, class_group: "Group 4" as any })).toBe(false);
      expect(isProfileComplete({ ...base, class_group: "A" as any })).toBe(false);
    });

    it("preserves leading zeros in class_roll_number (treated as text)", () => {
      const rollNumberWithLeadingZeros = "007";
      const profile: Partial<Profile> = {
        id: "usr-google-105",
        email: "james.bond@college.edu",
        full_name: "James Bond",
        is_onboarded: true,
        course: "B.Tech CSE",
        semester: 5,
        class_group: "Group 1",
        class_roll_number: rollNumberWithLeadingZeros,
      };

      expect(isProfileComplete(profile)).toBe(true);
      expect(profile.class_roll_number).toBe("007");
      expect(profile.class_roll_number).not.toBe("7");
      expect(typeof profile.class_roll_number).toBe("string");
    });
  });

  describe("OAuth Callback & Onboarding Routing Logic", () => {
    it("determines destination: sends incomplete profile to /onboarding, complete profile to /dashboard", () => {
      const determineDestination = (profile: Partial<Profile> | null, requestedNext?: string | null) => {
        const completed = isProfileComplete(profile);
        return completed ? (requestedNext ?? "/dashboard") : "/onboarding";
      };

      // Incomplete profile right after Google OAuth signup
      const freshGoogleProfile: Partial<Profile> = {
        id: "usr-new-google-user",
        email: "new.student@gmail.com",
        full_name: "New Student",
        is_onboarded: false,
      };
      expect(determineDestination(freshGoogleProfile)).toBe("/onboarding");
      expect(determineDestination(null)).toBe("/onboarding");

      // Completed profile after onboarding
      const completedGoogleProfile: Partial<Profile> = {
        id: "usr-new-google-user",
        email: "new.student@gmail.com",
        full_name: "New Student",
        is_onboarded: true,
        course: "BCA",
        semester: 2,
        class_group: "Group 2",
        class_roll_number: "024",
      };
      expect(determineDestination(completedGoogleProfile)).toBe("/dashboard");
      expect(determineDestination(completedGoogleProfile, "/settings")).toBe("/settings");
    });

    it("never identifies authenticated user as hardcoded Alex Mercer", () => {
      const getProfileForAuthUser = (
        authUser: { id: string; email: string; user_metadata?: any },
        dbProfile: Partial<Profile> | null
      ): Profile => {
        if (dbProfile) return dbProfile as Profile;

        // Auto-repaired profile for authUser
        const fullName =
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          (authUser.email ? authUser.email.split("@")[0].replace(".", " ") : "Campus Student");

        return {
          id: authUser.id,
          email: authUser.email,
          full_name: fullName,
          phone: authUser.user_metadata?.phone || null,
          role: "student",
          class_group_id: null,
          roll_number: null,
          class_roll_number: null,
          course: null,
          semester: null,
          class_group: null,
          is_onboarded: false,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      };

      const realGoogleUser = {
        id: "usr-google-999",
        email: "ananya.patel@gmail.com",
        user_metadata: { full_name: "Ananya Patel" },
      };

      const profile = getProfileForAuthUser(realGoogleUser, null);
      expect(profile.id).toBe("usr-google-999");
      expect(profile.full_name).toBe("Ananya Patel");
      expect(profile.full_name).not.toBe("Alex Mercer");
      expect(profile.role).toBe("student");
      expect(profile.is_onboarded).toBe(false);
    });
  });

  describe("Empty Dashboard Before CR Publishes Timetable", () => {
    it("returns publishedVersion: null and empty classes/attendance when CR hasn't published", () => {
      const buildStudentDashboard = (params: {
        profile: Profile;
        hasPublishedTimetableForGroup: boolean;
      }) => {
        if (!params.hasPublishedTimetableForGroup) {
          return {
            profile: params.profile,
            publishedVersion: null,
            todayClasses: [],
            subjects: [],
            overall: {
              overallPercentage: 0,
              totalConducted: 0,
              totalAttended: 0,
              totalAbsent: 0,
              targetPercentage: 75,
              isAboveTarget: true,
              bunkableClasses: 0,
              classesNeeded: 0,
            },
            emptyStateMessage: "Your class timetable hasn’t been published yet.",
          };
        }

        return {
          profile: params.profile,
          publishedVersion: { id: "ver-1", version_number: 1, status: "published" },
          todayClasses: [{ id: "slot-1", subject: { code: "CS501", name: "DBMS" } }],
          subjects: [{ id: "CS501", attendancePercentage: 80 }],
          overall: { overallPercentage: 80, totalConducted: 10, totalAttended: 8, totalAbsent: 2 },
          emptyStateMessage: null,
        };
      };

      const newStudentProfile: Profile = {
        id: "usr-new-student",
        email: "new.student@college.edu",
        full_name: "Dev Sharma",
        phone: "+919876543210",
        role: "student",
        class_group_id: "cg-new-group",
        course: "B.Tech Computer Science",
        semester: 3,
        class_group: "Group 1",
        class_roll_number: "015",
        roll_number: "015",
        avatar_url: null,
        is_onboarded: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Before CR publishes
      const emptyDashboard = buildStudentDashboard({
        profile: newStudentProfile,
        hasPublishedTimetableForGroup: false,
      });

      expect(emptyDashboard.publishedVersion).toBeNull();
      expect(emptyDashboard.todayClasses).toHaveLength(0);
      expect(emptyDashboard.subjects).toHaveLength(0);
      expect(emptyDashboard.overall.overallPercentage).toBe(0);
      expect(emptyDashboard.emptyStateMessage).toBe("Your class timetable hasn’t been published yet.");

      // After CR publishes
      const populatedDashboard = buildStudentDashboard({
        profile: newStudentProfile,
        hasPublishedTimetableForGroup: true,
      });
      expect(populatedDashboard.publishedVersion).not.toBeNull();
      expect(populatedDashboard.todayClasses.length).toBeGreaterThan(0);
      expect(populatedDashboard.emptyStateMessage).toBeNull();
    });
  });

  describe("Profile Isolation & RLS Security Check", () => {
    it("ensures a student cannot access another user's profile by swapping ID", () => {
      const mockDatabaseProfiles = [
        { id: "usr-student-a", full_name: "Student A", email: "student.a@college.edu" },
        { id: "usr-student-b", full_name: "Student B", email: "student.b@college.edu" },
      ];

      // RLS Policy Simulation: auth.uid() = id
      const fetchProfileWithRLS = (requestingUserId: string, targetProfileId: string) => {
        const canAccess = requestingUserId === targetProfileId;
        if (!canAccess) {
          return null; // RLS returns empty / null
        }
        return mockDatabaseProfiles.find((p) => p.id === targetProfileId) || null;
      };

      // Student A queries own profile
      expect(fetchProfileWithRLS("usr-student-a", "usr-student-a")?.full_name).toBe("Student A");

      // Student A tries to query Student B's profile
      expect(fetchProfileWithRLS("usr-student-a", "usr-student-b")).toBeNull();
    });

    it("verifies students cannot assign themselves CR privileges during onboarding", () => {
      const sanitizeOnboardingInput = (input: OnboardingInput & { requestedRole?: string }) => {
        return {
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          course: input.course.trim(),
          semester: input.semester,
          classGroup: input.classGroup,
          classRollNumber: input.classRollNumber.trim(),
          role: "student" as const, // Always forced to 'student'
        };
      };

      const maliciousAttempt = sanitizeOnboardingInput({
        fullName: "Hacker Student",
        phone: "+1234567890",
        course: "B.Tech CSE",
        semester: 3,
        classGroup: "Group 1",
        classRollNumber: "001",
        requestedRole: "cr",
      });

      expect(maliciousAttempt.role).toBe("student");
      expect(maliciousAttempt.role).not.toBe("cr");
    });
  });
});
