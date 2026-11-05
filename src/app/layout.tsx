import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusMate — Smart Attendance & Class Planner",
  description: "Automated timetable extraction, academic calendar generation, and intelligent attendance planner for college students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
