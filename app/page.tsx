import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-10">
      {/* <div className="mb-8">
        <Image
          src="/logo.png"
          alt="公司标志"
          width={180}
          height={60}
          priority
        />
      </div> */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">员工照片收集系统</CardTitle>
          <CardDescription>请选择您需要的功能</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Link href="/upload" className="w-full">
            <Button className="w-full text-lg py-6">员工照片上传</Button>
          </Link>
          <Link href="/admin/login" className="w-full">
            <Button variant="outline" className="w-full text-lg py-6">
              管理员入口
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
