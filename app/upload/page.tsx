"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { uploadPhoto } from "@/lib/actions";
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  Camera,
  User,
  Phone,
  Building,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function UploadPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("北京");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // 检查文件大小
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMessage("文件大小不能超过10MB");
        setStatus("error");
        return;
      }

      setFile(selectedFile);

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);

      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !department || !file) {
      setErrorMessage("请填写工号、选择部门并上传照片");
      return;
    }

    // 再次检查文件大小
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("文件大小不能超过10MB");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // 生成文件名
      const fileExt = file.name.split(".").pop();
      const fileName = `${employeeId}_${dayjs().format(
        "YYYYMMDD-HHmmss"
      )}.${fileExt}`;

      // 获取上传凭证
      const tokenResponse = await axios.get("/api/upload-token");
      const token = tokenResponse.data.token;

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

      // 上传文件到七牛云
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

      // 准备员工和照片信息
      const employeeFormData = new FormData();
      employeeFormData.append("employeeId", employeeId);
      employeeFormData.append("name", name || "未提供");
      employeeFormData.append("phone", phone || "未提供");
      employeeFormData.append("department", department);
      employeeFormData.append("photoKey", fileName);
      employeeFormData.append("photoUrl", downloadUrl);

      // 保存员工信息
      const result = await uploadPhoto(employeeFormData);

      if (result.success) {
        setStatus("success");
        // Auto return to upload page after 10 seconds
        setTimeout(() => {
          setEmployeeId("");
          setName("");
          setPhone("");
          setDepartment("北京");
          setFile(null);
          setPreview(null);
          setStatus("idle");
          setProgress(0);
        }, 10000);
      } else {
        setStatus("error");
        setErrorMessage(result.message || "上传失败，请重试");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setErrorMessage("上传过程中发生错误，请重试");
    } finally {
      setUploading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10 bg-gradient-to-b from-blue-50 to-white">
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
          <Image
            src="/logo.png"
            alt="公司标志"
            width={150}
            height={50}
            priority
          />
        </div>
        <Card className="w-full max-w-md border-none shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CheckCircle2 className="w-16 h-16 mx-auto text-white mb-4" />
            <CardTitle className="text-3xl font-bold">上传成功</CardTitle>
            <CardDescription className="text-white text-lg">
              您的照片已成功上传
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-8">
            <p className="text-gray-600">10秒后将自动返回上传页面</p>
            <div className="mt-6">
              <Button
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-lg py-6 px-8"
                onClick={() => {
                  setEmployeeId("");
                  setName("");
                  setPhone("");
                  setDepartment("北京");
                  setFile(null);
                  setPreview(null);
                  setStatus("idle");
                  setProgress(0);
                }}
              >
                立即返回
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10 bg-gradient-to-b from-red-50 to-white">
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
          <Image
            src="/logo.png"
            alt="公司标志"
            width={150}
            height={50}
            priority
          />
        </div>
        <Card className="w-full max-w-md border-none shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-lg">
            <AlertCircle className="w-16 h-16 mx-auto text-white mb-4" />
            <CardTitle className="text-3xl font-bold">上传失败</CardTitle>
            <CardDescription className="text-white text-lg">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center p-8">
            <Button
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-lg py-6 px-8"
              onClick={() => setStatus("idle")}
            >
              返回重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10 bg-gradient-to-b from-blue-50 to-white">
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
        <Image
          src="/logo.png"
          alt="公司标志"
          width={150}
          height={50}
          priority
        />
      </div>
      <Card className="w-full max-w-md border-none shadow-lg mt-12">
        <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">员工照片上传</CardTitle>
          <CardDescription className="text-neutral-100 text-md">
            请填写信息并上传您的照片
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="employeeId"
                className="text-lg flex items-center gap-2"
              >
                <Building className="h-5 w-5 text-blue-500" />
                工号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="请输入工号"
                required
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                姓名
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名（选填）"
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="department"
                className="text-lg flex items-center gap-2"
              >
                <Building className="h-5 w-5 text-blue-500" />
                部门 <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={department}
                onValueChange={setDepartment}
                className="flex flex-wrap gap-4"
                required
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="北京" id="beijing" />
                  <Label htmlFor="beijing" className="cursor-pointer">
                    北京
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="杭州" id="hangzhou" />
                  <Label htmlFor="hangzhou" className="cursor-pointer">
                    杭州
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="广州" id="guangzhou" />
                  <Label htmlFor="guangzhou" className="cursor-pointer">
                    广州
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-lg flex items-center gap-2"
              >
                <Phone className="h-5 w-5 text-blue-500" />
                手机号码
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号码（选填）"
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="photo"
                className="text-lg flex items-center gap-2"
              >
                <Camera className="h-5 w-5 text-blue-500" />
                照片 <span className="text-red-500">*</span>
              </Label>

              {preview ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 p-1">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="照片预览"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2 bg-white"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                  >
                    重新选择
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => document.getElementById("photo")?.click()}
                >
                  <div className="text-center">
                    <Camera className="mx-auto h-16 w-16 text-blue-400" />
                    <div className="mt-4 text-lg text-gray-600">
                      点击上传照片
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      支持 JPEG/PNG 格式，文件大小不超过10MB
                    </div>
                  </div>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    required
                  />
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>上传进度</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-3" />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={uploading || !employeeId || !department || !file}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  上传中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  提交
                </div>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center p-4 text-gray-500 text-sm">
          照片仅用于内部员工管理，我们将保护您的隐私
        </CardFooter>
      </Card>
    </div>
  );
}
