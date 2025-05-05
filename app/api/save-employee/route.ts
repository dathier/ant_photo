import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { employeeId, name, phone, department, photoKey, photoUrl } = body;

    if (
      !employeeId ||
      !name ||
      !phone ||
      !department ||
      !photoKey ||
      !photoUrl
    ) {
      return NextResponse.json(
        { success: false, message: "请提供所有必填字段" },
        { status: 400 }
      );
    }

    // Create or update employee
    const employee = await prisma.employee.upsert({
      where: { employeeId },
      update: { name, phone, department },
      create: { employeeId, name, phone, department },
    });

    // Save photo record to database
    await prisma.photo.create({
      data: {
        url: photoUrl,
        key: photoKey,
        employeeId: employee.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving employee:", error);
    return NextResponse.json(
      { success: false, message: "保存员工信息失败" },
      { status: 500 }
    );
  }
}
