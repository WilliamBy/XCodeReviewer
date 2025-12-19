/**
 * Admin Dashboard Page
 * Corporate Blue Theme
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseManager } from "@/components/database/DatabaseManager";
import { SystemConfig } from "@/components/system/SystemConfig";
import { Settings, Database, Terminal } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans relative">
      {/* Header */}
      <div className="cloud-card p-0 relative z-10">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-slate-800">系统管理</h1>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="config" className="w-full relative z-10">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 h-auto gap-1 rounded-lg mb-6">
          <TabsTrigger
            value="config"
            className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-3 text-slate-500 transition-all rounded text-sm flex items-center gap-2 font-medium"
          >
            <Settings className="w-4 h-4" />
            系统配置
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-3 text-slate-500 transition-all rounded text-sm flex items-center gap-2 font-medium"
          >
            <Database className="w-4 h-4" />
            数据管理
          </TabsTrigger>
        </TabsList>

        {/* System Config */}
        <TabsContent value="config" className="flex flex-col gap-6">
          <SystemConfig />
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <DatabaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
