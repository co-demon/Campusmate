import { NextRequest, NextResponse } from "next/server";
import { parseTimetableFile } from "@/features/timetable/services/timetableParser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No timetable file provided. Please upload a PDF, Image, Excel, or CSV document." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const extracted = await parseTimetableFile(
      arrayBuffer,
      file.name,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      extracted,
    });
  } catch (error: any) {
    console.error("Timetable extraction error:", error);
    return NextResponse.json(
      {
        error: "Failed to extract timetable.",
        details: error?.message || "Unknown error occurred during document parsing.",
      },
      { status: 500 }
    );
  }
}
