"use client";

import { FileSpreadsheet, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";

const sampleAssignments = [
  { id: 1, subject: "CS501 • DBMS", title: "Normalization & SQL Triggers Assignment", due: "Nov 10, 2024", status: "Pending", points: "20 pts" },
  { id: 2, subject: "CS502 • OS", title: "Dining Philosophers & Semaphore Implementation", due: "Nov 14, 2024", status: "In Progress", points: "25 pts" },
  { id: 3, subject: "CS503 • CN", title: "Packet Sniffing with Wireshark Lab Report", due: "Nov 18, 2024", status: "Pending", points: "15 pts" },
  { id: 4, subject: "CS504 • TOC", title: "Turing Machine & Regular Languages Problem Set", due: "Nov 02, 2024", status: "Submitted", points: "20 pts" },
];

export default function AssignmentsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            Assignments & Submissions
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Track coursework deadlines, submissions, and grades across all enrolled subjects.
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-[#202023] text-white hover:bg-black transition-colors self-start">
          <Plus className="w-3.5 h-3.5" />
          <span>New Assignment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#85858A]">Pending</span>
          <span className="text-2xl font-black text-[#202023] mt-1 block">3 Assignments</span>
        </div>
        <div className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#85858A]">Submitted</span>
          <span className="text-2xl font-black text-[#202023] mt-1 block">1 Completed</span>
        </div>
        <div className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#85858A]">Next Due Date</span>
          <span className="text-2xl font-black text-[#202023] mt-1 block">Nov 10</span>
        </div>
        <div className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card">
          <span className="text-[10px] font-bold uppercase text-[#85858A]">Average Score</span>
          <span className="text-2xl font-black text-[#202023] mt-1 block">94.5%</span>
        </div>
      </div>

      <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
        <h2 className="text-base font-black text-[#202023]">Current Semester Coursework</h2>
        <div className="space-y-3">
          {sampleAssignments.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#D7F45A] text-[#202023] inline-block mb-1">
                  {a.subject}
                </span>
                <h3 className="font-bold text-sm text-[#202023]">{a.title}</h3>
                <span className="text-[#85858A] text-[11px] flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" /> Due {a.due} &bull; {a.points}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${
                  a.status === 'Submitted'
                    ? 'bg-[#202023] text-white'
                    : 'bg-[#D7F45A] text-[#202023]'
                }`}>
                  {a.status}
                </span>
                <button className="px-3 py-1.5 rounded-full border border-black/10 font-bold hover:bg-black/5">
                  View Brief
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
