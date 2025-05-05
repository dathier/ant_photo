import { NextResponse } from "next/server";
import { generateUploadToken } from "@/lib/qiniu";

export async function GET() {
  try {
    const token = generateUploadToken();
    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Error generating upload token:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate upload token" },
      { status: 500 }
    );
  }
}
