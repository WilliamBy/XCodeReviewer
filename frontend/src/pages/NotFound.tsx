/**
 * Not Found Page
 * Corporate Blue Theme
 */

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-sm border border-slate-100">
          <FileQuestion className="w-12 h-12 text-slate-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">404</h1>
          <h2 className="text-xl font-medium text-slate-700">页面未找到</h2>
          <p className="text-slate-500">
            抱歉，您访问的页面不存在或已被移除。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <Button variant="outline" className="w-full sm:w-auto border-slate-200" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回上一页
          </Button>
        </div>
      </div>
    </div>
  );
}
