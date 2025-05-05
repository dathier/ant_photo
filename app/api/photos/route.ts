import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getPublicUrl } from "@/lib/qiniu";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number.parseInt(url.searchParams.get("page") || "1");
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "10");
    const search = url.searchParams.get("search") || "";
    const department = url.searchParams.get("department") || "";
    const status = url.searchParams.get("status") || "";

    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where: any = {};

    if (search) {
      where.OR = [
        {
          employee: {
            name: {
              contains: search,
            },
          },
        },
        {
          employee: {
            employeeId: {
              contains: search,
            },
          },
        },
      ];
    }

    if (department) {
      where.employee = {
        ...where.employee,
        department,
      };
    }

    if (status) {
      where.status = status;
    }

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          employee: true,
        },
      }),
      prisma.photo.count({ where }),
    ]);

    // Generate public URLs for each photo
    const photosWithPublicUrls = photos.map((photo) => ({
      ...photo,
      url: getPublicUrl(photo.key),
    }));

    return NextResponse.json({
      success: true,
      photos: photosWithPublicUrls,
      total,
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
