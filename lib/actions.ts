"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { getPublicUrl } from "./qiniu";

import { deleteFile } from "@/lib/qiniu";

const prisma = new PrismaClient();

// Admin credentials (hardcoded for simplicity as per requirements)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Auth token generation
function generateAuthToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Login action
export async function login(username: string, password: string) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateAuthToken();
    cookies().set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return { success: true };
  }

  return { success: false, message: "用户名或密码错误" };
}

// Check authentication
export async function checkAuth() {
  return !!cookies().has("auth_token");
}

// Upload photo action - 修改为只处理元数据，不处理文件上传
export async function uploadPhoto(formData: FormData) {
  try {
    const employeeId = formData.get("employeeId") as string;
    const name = (formData.get("name") as string) || "未提供";
    const phone = (formData.get("phone") as string) || "未提供";
    const department = formData.get("department") as string;
    const photoKey = formData.get("photoKey") as string;
    const photoUrl = formData.get("photoUrl") as string;

    if (!employeeId || !department || !photoKey || !photoUrl) {
      return { success: false, message: "请提供工号、部门和照片" };
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
        status: "unprocessed", // Default status is unprocessed
      },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, message: "上传过程中发生错误" };
  }
}

// Get photos with pagination and filters
export async function getPhotos(
  page: number,
  pageSize: number,
  filters?: {
    search?: string;
    department?: string;
    status?: string;
  }
): Promise<{ photos: PhotoWithEmployee[]; total: number }> {
  try {
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        {
          employee: {
            name: {
              contains: filters.search,
            },
          },
        },
        {
          employee: {
            employeeId: {
              contains: filters.search,
            },
          },
        },
      ];
    }

    if (filters?.department) {
      where.employee = {
        ...where.employee,
        department: filters.department,
      };
    }

    if (filters?.status) {
      where.status = filters.status;
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

    return {
      photos: photosWithPublicUrls as PhotoWithEmployee[],
      total,
    };
  } catch (error) {
    console.error("Error fetching photos:", error);
    return { photos: [], total: 0 };
  }
}

// Update photo status
export async function updatePhotoStatus(
  id: string,
  status: "processed" | "unprocessed"
) {
  try {
    await prisma.photo.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating photo status:", error);
    return { success: false, message: "更新照片状态失败" };
  }
}

// // Delete photo
// export async function deletePhoto(id: string) {
//   try {
//     const photo = await prisma.photo.findUnique({
//       where: { id },
//     });

//     if (!photo) {
//       return { success: false, message: "照片不存在" };
//     }

//     // Delete from Qiniu
//     await fetch(
//       `/api/delete-photo?key=${encodeURIComponent(photo.key)}&id=${photo.id}`,
//       {
//         method: "DELETE",
//       }
//     );

//     revalidatePath("/admin/dashboard");
//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting photo:", error);
//     return { success: false, message: "删除照片时发生错误" };
//   }
// }
// Delete photo
export async function deletePhoto(id: string) {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      return { success: false, message: "照片不存在" };
    }

    // 首先从数据库中删除照片记录
    await prisma.photo.delete({
      where: { id },
    });

    // 然后尝试从七牛云删除文件
    try {
      await deleteFile(photo.key);
    } catch (error) {
      console.error("Error deleting file from Qiniu:", error);
      // 即使从七牛云删除失败，我们也已经从数据库中删除了记录
      // 所以仍然返回成功
    }

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting photo:", error);
    return { success: false, message: "删除照片时发生错误" };
  }
}
