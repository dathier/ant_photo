"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  LogOut,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  checkAuth,
  getPhotos,
  deletePhoto,
  updatePhotoStatus,
} from "@/lib/actions";
import type { PhotoWithEmployee } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<PhotoWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithEmployee | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const pageSize = 10;

  useEffect(() => {
    const verifyAuth = async () => {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        router.push("/admin/login");
      } else {
        fetchPhotos();
      }
    };

    verifyAuth();
  }, [router, currentPage, searchQuery, departmentFilter, statusFilter]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const filters = {
        search: searchQuery || undefined,
        department: departmentFilter || undefined,
        status: statusFilter || undefined,
      };

      const result = await getPhotos(currentPage, pageSize, filters);
      setPhotos(result.photos);
      setTotalPages(Math.ceil(result.total / pageSize));
    } catch (error) {
      console.error("Failed to fetch photos:", error);
      toast({
        title: "获取照片失败",
        description: "请刷新页面重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "auth_token=; Max-Age=0; path=/;";
    router.push("/admin/login");
  };

  const handlePhotoClick = (photo: PhotoWithEmployee) => {
    setSelectedPhoto(photo);
    setPreviewOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setPhotoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (photoToDelete) {
      try {
        setIsDeleting(true);
        const result = await deletePhoto(photoToDelete);

        if (result.success) {
          toast({
            title: "删除成功",
            description: "照片已成功删除",
          });

          // 从本地状态中移除已删除的照片
          setPhotos(photos.filter((photo) => photo.id !== photoToDelete));

          // 如果当前页面没有照片了，且不是第一页，则返回上一页
          if (photos.length === 1 && currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
          } else {
            // 否则重新获取当前页面的照片
            fetchPhotos();
          }
        } else {
          toast({
            title: "删除失败",
            description: result.message || "无法删除照片，请重试",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to delete photo:", error);
        toast({
          title: "删除失败",
          description: "发生错误，请重试",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setPhotoToDelete(null);
      }
    }
  };

  const handleDownload = (photo: PhotoWithEmployee) => {
    // 创建一个临时链接
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = `${photo.employee.employeeId}_${photo.employee.name}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (
    id: string,
    status: "processed" | "unprocessed"
  ) => {
    try {
      const result = await updatePhotoStatus(id, status);

      if (result.success) {
        // 更新本地状态
        setPhotos(
          photos.map((photo) =>
            photo.id === id ? { ...photo, status } : photo
          )
        );

        toast({
          title: "状态更新成功",
          description: `照片已标记为${
            status === "processed" ? "已处理" : "未处理"
          }`,
        });
      } else {
        toast({
          title: "状态更新失败",
          description: result.message || "无法更新状态，请重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "状态更新失败",
        description: "发生错误，请重试",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchPhotos();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="container py-4 mx-auto">
      {/* <div className="flex justify-center mb-6">
        <Image
          src="/logo.png"
          alt="公司标志"
          width={180}
          height={60}
          priority
        />
      </div> */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">员工照片管理</CardTitle>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4">
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="搜索姓名或工号..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部部门</SelectItem>
                    <SelectItem value="北京">北京</SelectItem>
                    <SelectItem value="杭州">杭州</SelectItem>
                    <SelectItem value="广州">广州</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="处理状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="processed">已处理</SelectItem>
                    <SelectItem value="unprocessed">未处理</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit">搜索</Button>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  重置
                </Button>
              </div>
            </form>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <p>加载中...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-10">
              <p>暂无照片数据</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>缩略图</TableHead>
                      <TableHead>工号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>部门</TableHead>
                      <TableHead>上传时间</TableHead>
                      <TableHead>处理状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {photos.map((photo) => (
                      <TableRow key={photo.id}>
                        <TableCell>
                          <div
                            className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-md"
                            onClick={() => handlePhotoClick(photo)}
                          >
                            <Image
                              src={photo.url || "/placeholder.svg"}
                              alt={`${photo.employee.name}的照片`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        </TableCell>
                        <TableCell>{photo.employee.employeeId}</TableCell>
                        <TableCell>{photo.employee.name}</TableCell>
                        <TableCell>
                          {photo.employee.phone &&
                          photo.employee.phone !== "未提供" ? (
                            photo.employee.phone
                          ) : (
                            <span className="text-gray-400 text-sm">
                              未提供
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {photo.employee.department || "未设置"}
                        </TableCell>
                        <TableCell>
                          {new Date(photo.createdAt).toLocaleString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          {photo.status === "processed" ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 hover:bg-green-50"
                            >
                              已处理
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50"
                            >
                              未处理
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(photo)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {photo.status === "processed" ? (
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-yellow-600"
                                onClick={() =>
                                  handleStatusChange(photo.id, "unprocessed")
                                }
                                title="标记为未处理"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-green-600"
                                onClick={() =>
                                  handleStatusChange(photo.id, "processed")
                                }
                                title="标记为已处理"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteClick(photo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      className={
                        currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>照片预览</DialogTitle>
            <DialogDescription>
              {selectedPhoto && (
                <>
                  {`${selectedPhoto.employee.name} (${
                    selectedPhoto.employee.employeeId
                  }) - ${selectedPhoto.employee.department || "未设置部门"}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <>
              {/* 显示手机号 */}
              <div className="mb-2 text-sm text-gray-600">
                手机号:{" "}
                {selectedPhoto.employee.phone &&
                selectedPhoto.employee.phone !== "未提供" ? (
                  selectedPhoto.employee.phone
                ) : (
                  <span className="text-gray-400">未提供</span>
                )}
              </div>

              {/* 状态徽章 */}
              <div className="mt-1 mb-3">
                {selectedPhoto.status === "processed" ? (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    已处理
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700"
                  >
                    未处理
                  </Badge>
                )}
              </div>

              <div className="relative aspect-square w-full overflow-hidden rounded-md">
                <Image
                  src={selectedPhoto.url || "/placeholder.svg"}
                  alt={`${selectedPhoto.employee.name}的照片`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这张照片吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className={isDeleting ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isDeleting ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
