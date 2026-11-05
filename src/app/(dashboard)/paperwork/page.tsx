"use client";

import { FolderLock, FileCheck, Clock, Download, Plus } from "lucide-react";

const sampleDocuments = [
  { id: 1, title: "Bonafide Student Certificate Application", department: "Dean Academic Affairs", status: "Approved", date: "Oct 24, 2024" },
  { id: 2, title: "Medical Leave & Attendance Exemption Form", department: "Hostel & Health Center", status: "Under Review", date: "Nov 01, 2024" },
  { id: 3, title: "Railway / Transit Concession Voucher", department: "Student Welfare Office", status: "Ready for Pickup", date: "Oct 15, 2024" },
  { id: 4, title: "Library No-Dues Clearance Request", department: "Central Library", status: "Approved", date: "Sep 20, 2024" },
];

export default function PaperworkPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            College Paperwork & Forms
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Automated certificate requests, leave applications, and administrative approvals.
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-[#202023] text-white hover:bg-black transition-colors self-start">
          <Plus className="w-3.5 h-3.5" />
          <span>New Document Request</span>
        </button>
      </div>

      <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
        <h2 className="text-base font-black text-[#202023]">Active Administrative Requests</h2>
        <div className="space-y-3">
          {sampleDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#202023] text-white flex items-center justify-center font-black">
                  <FolderLock className="w-5 h-5 text-[#D7F45A]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202023]">{doc.title}</h3>
                  <span className="text-[#85858A] text-[11px]">
                    {doc.department} &bull; Requested on {doc.date}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${
                  doc.status === 'Approved' || doc.status === 'Ready for Pickup'
                    ? 'bg-[#D7F45A] text-[#202023]'
                    : 'bg-[#202023] text-white'
                }`}>
                  {doc.status}
                </span>
                <button className="px-3 py-1.5 rounded-full border border-black/10 font-bold hover:bg-black/5">
                  Track
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
