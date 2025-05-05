import { type NextRequest, NextResponse } from "next/server";
import { createQiniuUploader } from "@/lib/qiniu";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Missing key parameter" },
        { status: 400 }
      );
    }

    const qiniuUploader = createQiniuUploader();
    const url = qiniuUploader.getDownloadUrl(key);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Error refreshing image URL:", error);
    return NextResponse.json(
      { success: false, message: "Failed to refresh image URL" },
      { status: 500 }
    );
  }
}
