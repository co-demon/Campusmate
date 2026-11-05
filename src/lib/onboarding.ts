import { Profile } from "@/types/database.types";

export type ClassGroupOption = "Group 1" | "Group 2" | "Group 3";

export interface OnboardingInput {
  fullName: string;
  phone?: string | null;
  course: string;
  semester: number;
  classGroup: ClassGroupOption;
  classRollNumber: string;
}

/**
 * Validates whether a profile record satisfies all mandatory onboarding criteria.
 */
export function isProfileComplete(profile: Partial<Profile> | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_onboarded) return false;
  if (!profile.course || !profile.course.trim()) return false;
  if (typeof profile.semester !== "number" || profile.semester < 1 || profile.semester > 12) return false;
  if (!profile.class_group || !["Group 1", "Group 2", "Group 3"].includes(profile.class_group)) return false;
  if (!profile.class_roll_number || !profile.class_roll_number.trim()) return false;
  return true;
}
