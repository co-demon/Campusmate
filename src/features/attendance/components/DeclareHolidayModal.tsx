"use client";

import { useState } from "react";
import { X, CalendarX } from "lucide-react";

interface DeclareHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, name: string, description?: string) => Promise<void>;
}

export function DeclareHolidayModal({
  isOpen,
  onClose,
  onSubmit,
}: DeclareHolidayModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    setIsSubmitting(true);
    try {
      await onSubmit(date, name, description);
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
            <CalendarX className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#202023]">Declare College Holiday</h2>
            <p className="text-[11px] text-[#85858A]">Cancels scheduled lectures without counting as absences</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              Holiday Name
            </label>
            <input
              type="text"
              placeholder="e.g. Founder's Day, Heavy Rain Holiday, Sports Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              Holiday Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Declared by Principal notification #412"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
            />
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
              {isSubmitting ? "Applying..." : "Declare Holiday"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
