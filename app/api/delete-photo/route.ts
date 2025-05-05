import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { deleteFile } from "@/lib/qiniu";

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const id = url.searchParams.get("id");

    if (!key || !id) {
      return NextResponse.json(
        { success: false, message: "Missing key or id parameter" },
        { status: 400 }
      );
    }

    // Delete from Qiniu
    await deleteFile(key);

    // Delete from database
    await prisma.photo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
