import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/qiniu";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Missing key parameter" },
        { status: 400 }
      );
    }

    const downloadUrl = getPublicUrl(key);
    return NextResponse.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
