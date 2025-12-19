/**
 * Header Component
 * Corporate Blue Theme
 */

import { Square, Download, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { HeaderProps } from "../types";

export function Header({
  task,
  isRunning,
  isCancelling,
  onCancel,
  onExport,
  onNewAudit
}: HeaderProps) {
  return (
    <header className="flex-shrink-0 h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-sm relative z-20">
      {/* Left side - Brand and task info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 p-1.5 transition-transform hover:scale-105 duration-300">
            <img src="/src/assets/cea_logo_v2.png" alt="CeaAudit Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">CeaAudit</h1>
            <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wider">Agent Security</p>
          </div>
        </div>

        {/* Task info */}
        {task && (
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm font-medium">
              任务:
            </span>
            <span className="text-slate-900 text-sm font-bold truncate max-w-[200px]">
              {task.name || task.id.slice(0, 8)}
            </span>
            <StatusBadge status={task.status} />
          </div>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-3">
        {isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="h-9 px-4 text-xs font-bold uppercase tracking-wide text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all shadow-sm"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                <span>停止中...</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 mr-2 fill-current" />
                <span>中止任务</span>
              </>
            )}
          </Button>
        )}

        <div className="h-8 w-px bg-slate-200 mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!task}
          className="h-9 px-4 text-xs font-bold uppercase tracking-wide text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5 mr-2" />
          <span>导出报告</span>
        </Button>

        <Button
          size="sm"
          onClick={onNewAudit}
          className="h-9 px-4 text-xs font-bold uppercase tracking-wide bg-primary hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white transition-all"
        >
          <Play className="w-3.5 h-3.5 mr-2 fill-current" />
          <span>新建审计</span>
        </Button>
      </div>
    </header>
  );
}

export default Header;
