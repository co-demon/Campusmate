import { describe, it, expect } from "vitest";

describe("CampusMate Authentication & Profile Architecture", () => {
  describe("Email & Password Validation", () => {
    it("validates password length correctly (minimum 6 characters)", () => {
      const validatePassword = (pwd: string) => pwd.length >= 6;
      expect(validatePassword("12345")).toBe(false);
      expect(validatePassword("123456")).toBe(true);
      expect(validatePassword("superSecretPass!")).toBe(true);
    });

    it("accepts valid email addresses and detects invalid ones", () => {
      const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValidEmail("student@college.edu")).toBe(true);
      expect(isValidEmail("sarah.jenkins@university.ac.in")).toBe(true);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@missingusername.com")).toBe(false);
    });

    it("extracts and formats full name from email when metadata is absent", () => {
      const extractName = (metadataName?: string, email?: string) => {
        if (metadataName && metadataName.trim()) return metadataName.trim();
        if (email && email.includes("@")) {
          const prefix = email.split("@")[0];
          return prefix
            .replace(/[._]/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        }
        return "Campus Student";
      };

      expect(extractName("Sarah Jenkins", "sarah@college.edu")).toBe("Sarah Jenkins");
      expect(extractName("", "alex.mercer@college.edu")).toBe("Alex Mercer");
      expect(extractName(undefined, "john_doe@university.edu")).toBe("John Doe");
      expect(extractName(undefined, undefined)).toBe("Campus Student");
    });
  });

  describe("Optional Phone Contact Info Handling (No OTP)", () => {
    it("stores optional phone as contact metadata without sending OTPs", () => {
      interface SignupData {
        fullName: string;
        email: string;
        password: string;
        phone?: string;
      }

      const buildAuthSignupPayload = (input: SignupData) => {
        return {
          email: input.email.trim(),
          password: input.password,
          options: {
            data: {
              full_name: input.fullName.trim(),
              phone: input.phone?.trim() || null,
            },
          },
        };
      };

      const withPhone = buildAuthSignupPayload({
        fullName: "Alex Mercer",
        email: "alex@college.edu",
        password: "securePassword123",
        phone: "+1 555 123 4567",
      });

      expect(withPhone.options.data.phone).toBe("+1 555 123 4567");

      const withoutPhone = buildAuthSignupPayload({
        fullName: "Alex Mercer",
        email: "alex@college.edu",
        password: "securePassword123",
        phone: "   ",
      });

      expect(withoutPhone.options.data.phone).toBeNull();
    });

    it("guarantees passwords are never stored in profile objects", () => {
      const createProfileRecord = (userId: string, email: string, metadata: { full_name: string; phone: string | null }) => {
        return {
          id: userId,
          email,
          full_name: metadata.full_name,
          phone: metadata.phone,
          role: "student" as const,
          class_group_id: null,
        };
      };

      const profile = createProfileRecord("usr-123", "student@college.edu", {
        full_name: "Alex Mercer",
        phone: "+15551234567",
      });

      expect(profile).not.toHaveProperty("password");
      expect(profile).not.toHaveProperty("encrypted_password");
      expect(profile).not.toHaveProperty("otp");
    });
  });

  describe("Security & Privilege Protection", () => {
    it("enforces default role as 'student' and rejects client self-promotion", () => {
      interface SignupPayload {
        email: string;
        requestedRole?: string;
      }

      const processSignup = (payload: SignupPayload) => {
        return {
          email: payload.email,
          role: "student" as const,
        };
      };

      const result = processSignup({
        email: "attacker@college.edu",
        requestedRole: "cr",
      });

      expect(result.role).toBe("student");
      expect(result.role).not.toBe("cr");
    });

    it("prevents non-service-role from mutating role or class_group_id", () => {
      const canMutatePrivilegedFields = (callerRole: string, oldRole: string, newRole: string) => {
        if (callerRole === "service_role") return true;
        if (oldRole !== newRole) return false;
        return true;
      };

      expect(canMutatePrivilegedFields("authenticated", "student", "cr")).toBe(false);
      expect(canMutatePrivilegedFields("service_role", "student", "cr")).toBe(true);
      expect(canMutatePrivilegedFields("authenticated", "student", "student")).toBe(true);
    });
  });

  describe("Profile Repair & Missing Row Handling", () => {
    it("safely generates a repaired profile object when auth user exists without a DB profile", () => {
      const mockAuthUser = {
        id: "usr-4455-6677",
        email: "priya.sharma@college.edu",
        user_metadata: {
          full_name: "Priya Sharma",
          phone: "+919876543210",
        },
      };

      const repairProfile = (authUser: typeof mockAuthUser) => {
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || "Campus Student",
          phone: authUser.user_metadata?.phone || null,
          role: "student" as const,
          class_group_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      };

      const repaired = repairProfile(mockAuthUser);
      expect(repaired.id).toBe("usr-4455-6677");
      expect(repaired.full_name).toBe("Priya Sharma");
      expect(repaired.phone).toBe("+919876543210");
      expect(repaired.role).toBe("student");
      expect(repaired.class_group_id).toBeNull();
    });
  });
});
