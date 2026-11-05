"use client";

import { useState } from "react";
import { Subject } from "@/features/timetable/types/timetable.types";
import { X, CalendarPlus } from "lucide-react";

interface AddExtraClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSubmit: (params: {
    subjectId: string;
    date: string;
    startTime: string;
    endTime: string;
    room?: string;
    facultyName?: string;
  }) => Promise<void>;
}

export function AddExtraClassModal({
  isOpen,
  onClose,
  subjects,
  onSubmit,
}: AddExtraClassModalProps) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [room, setRoom] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !date || !startTime || !endTime) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        subjectId,
        date,
        startTime: startTime + ":00",
        endTime: endTime + ":00",
        room: room || undefined,
        facultyName: facultyName || undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-black/10 rounded-[28px] w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#85858A] hover:text-[#202023] p-1.5 rounded-full hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center font-bold">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#202023]">Add Extra Class</h2>
            <p className="text-[11px] text-[#85858A]">Schedule a makeup lecture or special lab session</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              required
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Room (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. LH-301"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Faculty (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Sharma"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#85858A] hover:text-[#202023] rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black text-[#202023] bg-[#D7F45A] hover:bg-[#cbf03f] rounded-full shadow-xs disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Adding..." : "Add Occurrence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
