"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ReportAbsenceModal } from "@/features/attendance/components/ReportAbsenceModal";
import { DeclareHolidayModal } from "@/features/attendance/components/DeclareHolidayModal";
import { AddExtraClassModal } from "@/features/attendance/components/AddExtraClassModal";
import { campusRepository } from "@/lib/database/campusRepository";
import { Subject } from "@/features/timetable/types/timetable.types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [extraClassModalOpen, setExtraClassModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    campusRepository.getSubjects().then(setSubjects);
  }, []);

  const handleReportAbsence = async (subjectId: string, date: string, remarks?: string) => {
    const occurrences = await campusRepository.getClassOccurrences(date, date);
    const occ = occurrences.find((o) => o.subject_id === subjectId);
    if (occ) {
      await campusRepository.reportAttendance(occ.id, "absent", remarks);
    } else {
      const added = await campusRepository.addExtraClass({
        subjectId,
        date,
        startTime: "09:00:00",
        endTime: "10:00:00",
      });
      if (added.occurrence) {
        await campusRepository.reportAttendance(added.occurrence.id, "absent", remarks);
      }
    }
    window.location.reload();
  };

  const handleDeclareHoliday = async (date: string, name: string, description?: string) => {
    await campusRepository.declareHoliday(date, name, description);
    window.location.reload();
  };

  const handleAddExtraClass = async (params: {
    subjectId: string;
    date: string;
    startTime: string;
    endTime: string;
    room?: string;
    facultyName?: string;
  }) => {
    await campusRepository.addExtraClass(params);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#E5F79E] p-0 sm:p-4 lg:p-6 flex items-center justify-center font-sans antialiased">
      {/* Floating Panel Container */}
      <div className="w-full max-w-[1680px] h-screen sm:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] rounded-none sm:rounded-[32px] overflow-hidden flex bg-[#E9E9E9] shadow-panel border border-black/5 relative">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex" />

        {/* Mobile Slide-Over Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <Sidebar className="relative z-10 w-72 h-full" />
          </div>
        )}

        {/* Main Light-Grey Dashboard Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#E9E9E9] overflow-hidden">
          <Header
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenAbsenceModal={() => setAbsenceModalOpen(true)}
            onOpenHolidayModal={() => setHolidayModalOpen(true)}
            onOpenExtraClassModal={() => setExtraClassModalOpen(true)}
          />

          <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 pt-1">
            <div className="max-w-[1400px] mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Global Modals */}
      <ReportAbsenceModal
        isOpen={absenceModalOpen}
        onClose={() => setAbsenceModalOpen(false)}
        subjects={subjects}
        onSubmit={handleReportAbsence}
      />

      <DeclareHolidayModal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        onSubmit={handleDeclareHoliday}
      />

      <AddExtraClassModal
        isOpen={extraClassModalOpen}
        onClose={() => setExtraClassModalOpen(false)}
        subjects={subjects}
        onSubmit={handleAddExtraClass}
      />
    </div>
  );
}
