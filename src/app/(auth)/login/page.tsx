import { AuthCard } from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E5F79E] p-4 font-sans">
      <AuthCard initialMode="signin" />
    </div>
  );
}
