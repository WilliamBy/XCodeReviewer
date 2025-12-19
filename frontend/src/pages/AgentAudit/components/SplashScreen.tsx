import { Activity, Shield, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-200 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-violet-200 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-3xl shadow-xl mb-8 border border-slate-100 p-3 transform hover:scale-105 transition-transform duration-500">
            <img src="/src/assets/cea_logo_v2.png" alt="CeaAudit Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Cea<span className="text-primary">Audit</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium tracking-wide">
            智能代码安全审计平台
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-lg mx-auto transform transition-all hover:shadow-2xl duration-500">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700 uppercase">System Status</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center text-center hover:bg-blue-100 transition-colors cursor-default">
                  <Shield className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-bold text-slate-800">全量审计</h3>
                  <p className="text-xs text-slate-500 mt-1">深度代码漏洞扫描</p>
                </div>
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 flex flex-col items-center text-center hover:bg-violet-100 transition-colors cursor-default">
                  <Zap className="w-8 h-8 text-violet-600 mb-2" />
                  <h3 className="font-bold text-slate-800">智能修复</h3>
                  <p className="text-xs text-slate-500 mt-1">AI 驱动自动修复</p>
                </div>
              </div>

              <Button
                onClick={onComplete}
                className="w-full h-14 text-lg font-bold bg-primary hover:bg-blue-700 shadow-lg shadow-blue-500/20 group transition-all active:scale-[0.98]"
              >
                开始审计任务
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-slate-400 text-xs font-medium">
          &copy; 2024 CeaAudit Security. All rights reserved. V3.0.0
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
