"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UploadForm() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);

    try {
      if (!file) throw new Error("请选择文件");
      if (!employeeId) throw new Error("请输入工号");
      if (!name) throw new Error("请输入姓名");
      if (!phone) throw new Error("请输入手机号");
      if (!department) throw new Error("请选择部门");
      if (file.size > 10 * 1024 * 1024) throw new Error("文件大小不能超过10MB");

      // 获取上传凭证
      const tokenResponse = await axios.get("/api/upload-token");
      const token = tokenResponse.data.token;

      // 生成文件名
      const fileExt = file.name.split(".").pop();
      const fileName = `${employeeId}_${dayjs().format(
        "YYYYMMDD-HHmmss"
      )}.${fileExt}`;

      // 上传到七牛云
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);
      formData.append("key", fileName);

      // 确定上传区域
      const region = process.env.NEXT_PUBLIC_QINIU_REGION || "z0";
      const uploadUrl = `https://upload${
        region === "z0" ? "" : `-${region}`
      }.qiniup.com`;

      const uploadResponse = await axios.post(uploadUrl, formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
        },
      });

      // 获取下载链接
      const downloadResponse = await axios.get(
        `/api/download-url?key=${fileName}`
      );
      const downloadUrl = downloadResponse.data.url;

      // 保存员工信息
      const saveResponse = await axios.post("/api/save-employee", {
        employeeId,
        name,
        phone,
        department, // 添加部门信息
        photoKey: fileName,
        photoUrl: downloadUrl,
      });

      if (!saveResponse.data.success) {
        throw new Error(saveResponse.data.message || "保存员工信息失败");
      }

      // 显示成功反馈
      toast({
        title: "🎉 上传成功",
        description: "照片已安全上传至云端",
      });

      // 重置表单
      setEmployeeId("");
      setName("");
      setPhone("");
      setDepartment("");
      setFile(null);
      setProgress(0);

      // 延迟刷新页面
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error) {
      toast({
        title: "⚠️ 上传失败",
        variant: "destructive",
        description: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 bg-white rounded-xl shadow-sm"
    >
      {/* 工号输入 */}
      <div className="space-y-2">
        <Label htmlFor="employeeId" className="text-base">
          工号
        </Label>
        <Input
          id="employeeId"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
          className="h-12 text-base"
          placeholder="请输入您的工号"
        />
      </div>

      {/* 姓名输入 */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">
          姓名
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 text-base"
          placeholder="请输入您的姓名"
        />
      </div>

      {/* 部门选择 */}
      <div className="space-y-2">
        <Label htmlFor="department" className="text-base">
          部门
        </Label>
        <Select value={department} onValueChange={setDepartment} required>
          <SelectTrigger id="department" className="h-12 text-base">
            <SelectValue placeholder="请选择部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="北京">北京</SelectItem>
            <SelectItem value="杭州">杭州</SelectItem>
            <SelectItem value="广州">广州</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 手机号输入 */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base">
          手机号
        </Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="h-12 text-base"
          placeholder="请输入您的手机号"
        />
      </div>

      {/* 文件上传 */}
      <div className="space-y-2">
        <Label htmlFor="file" className="text-base">
          选择照片
        </Label>
        <div className="relative">
          <Input
            id="file"
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
            className="h-12 py-2 text-base file:hidden" // 隐藏原生文件输入
          />
          <div className="absolute right-2 top-2">
            <label
              htmlFor="file"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              选择文件
            </label>
          </div>
        </div>
        {file && (
          <p className="text-sm text-muted-foreground mt-1">
            已选择文件: {file.name}
          </p>
        )}
      </div>

      {/* 进度条 */}
      {progress > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2.5" />
          <p className="text-sm text-center text-muted-foreground">
            上传进度 {progress}%
          </p>
        </div>
      )}

      {/* 提交按钮 */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base gap-2"
        size="lg"
      >
        {loading ? (
          <>
            <span className="animate-pulse">⏳</span>
            上传中...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            立即上传
          </>
        )}
      </Button>

      {/* 帮助文本 */}
      <p className="text-sm text-muted-foreground text-center">
        支持 JPEG/PNG 格式，文件大小不超过10MB
      </p>
    </form>
  );
}
