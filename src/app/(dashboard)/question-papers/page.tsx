"use client";

import { FileText, Download, Search, BookOpen } from "lucide-react";

const samplePapers = [
  { id: 1, code: "CS501", name: "Database Management Systems", year: "2023 End-Term", type: "Main Exam", solutions: true },
  { id: 2, code: "CS501", name: "Database Management Systems", year: "2023 Mid-Term", type: "Mid-Term", solutions: true },
  { id: 3, code: "CS502", name: "Operating Systems", year: "2023 End-Term", type: "Main Exam", solutions: false },
  { id: 4, code: "CS503", name: "Computer Networks", year: "2022 End-Term", type: "Main Exam", solutions: true },
  { id: 5, code: "CS504", name: "Theory of Computation", year: "2023 Mid-Term", type: "Mid-Term", solutions: true },
];

export default function QuestionPapersPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            Previous Year Question Papers
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Archived question papers, model answer keys, and previous exam analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-black/5 text-xs text-[#85858A] w-56">
          <Search className="w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search papers..."
            className="bg-transparent border-none outline-none text-xs text-[#202023] w-full"
          />
        </div>
      </div>

      <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
        <h2 className="text-base font-black text-[#202023]">Archived Exam Papers</h2>
        <div className="space-y-3">
          {samplePapers.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#202023] text-white flex items-center justify-center font-black">
                  <FileText className="w-5 h-5 text-[#D7F45A]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202023]">
                    {p.code} &bull; {p.name}
                  </h3>
                  <span className="text-[#85858A] text-[11px]">
                    {p.year} &bull; {p.type} {p.solutions ? "• Answer Key Included" : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#202023] text-white hover:bg-black font-bold text-xs transition-colors">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
