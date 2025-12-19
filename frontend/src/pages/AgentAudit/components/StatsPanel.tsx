/**
 * Stats Panel Component
 * Corporate Blue Theme
 */

import { memo } from "react";
import { Activity, FileCode, Repeat, Zap, Bug, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StatsPanelProps } from "../types";

// Circular progress component
function CircularProgress({ value, size = 48, strokeWidth = 3, color = "primary" }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const colorMap: Record<string, string> = {
    primary: '#2563eb', // blue-600
    emerald: '#10b981', // emerald-500
    rose: '#f43f5e',    // rose-500
    amber: '#f59e0b',   // amber-500
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0" // slate-200
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colorMap[color] || colorMap.primary}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// Metric card component
function MetricCard({ icon, label, value, suffix = "", colorClass = "text-slate-500", bgClass = "bg-white" }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 shadow-sm ${bgClass}`}>
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold truncate">{label}</div>
        <div className="text-lg font-bold text-slate-900 leading-tight">
          {value}<span className="text-slate-400 text-xs font-normal ml-0.5">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

export const StatsPanel = memo(function StatsPanel({ task, findings }: StatsPanelProps) {
  if (!task) return null;

  const severityCounts = {
    critical: task.critical_count || 0,
    high: task.high_count || 0,
    medium: task.medium_count || 0,
    low: task.low_count || 0,
  };
  const totalFindings = task.findings_count || 0;
  const progressPercent = task.progress_percentage || 0;

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'amber';
    return 'rose';
  };

  return (
    <div className="space-y-4">
      {/* Progress Section */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-1.5 rounded-md">
              <Activity className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">总体进度</span>
          </div>
          <span className="text-sm text-primary font-bold">{progressPercent.toFixed(0)}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* File progress */}
        <div className="flex items-center justify-between mt-2.5 text-xs font-medium">
          <span className="text-slate-500">已分析文件</span>
          <span className="text-slate-700">
            {task.analyzed_files}<span className="text-slate-400 mx-1">/</span>{task.total_files}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Repeat className="w-4 h-4" />}
          label="迭代次数"
          value={task.total_iterations || 0}
          colorClass="text-teal-600 bg-teal-50"
        />
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="工具调用"
          value={task.tool_calls_count || 0}
          colorClass="text-amber-600 bg-amber-50"
        />
        <MetricCard
          icon={<FileCode className="w-4 h-4" />}
          label="Token 消耗"
          value={((task.tokens_used || 0) / 1000).toFixed(1)}
          suffix="k"
          colorClass="text-violet-600 bg-violet-50"
        />
        <MetricCard
          icon={<Bug className="w-4 h-4" />}
          label="发现问题"
          value={totalFindings}
          colorClass={totalFindings > 0 ? "text-rose-600 bg-rose-50" : "text-slate-400 bg-slate-50"}
        />
      </div>

      {/* Findings breakdown */}
      {totalFindings > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-rose-50 p-1.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">问题分布</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {severityCounts.critical > 0 && (
              <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-xs font-bold px-2 py-1">
                严重: {severityCounts.critical}
              </Badge>
            )}
            {severityCounts.high > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs font-bold px-2 py-1">
                高危: {severityCounts.high}
              </Badge>
            )}
            {severityCounts.medium > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs font-bold px-2 py-1">
                中等: {severityCounts.medium}
              </Badge>
            )}
            {severityCounts.low > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs font-bold px-2 py-1">
                低危: {severityCounts.low}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Security Score */}
      {task.security_score !== null && task.security_score !== undefined && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 p-1.5 rounded-md">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">安全评分</span>
            </div>
            <div className="relative">
              <CircularProgress
                value={task.security_score}
                size={48}
                strokeWidth={4}
                color={getScoreColor(task.security_score)}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${task.security_score >= 80 ? 'text-emerald-500' :
                    task.security_score >= 60 ? 'text-amber-500' :
                      'text-rose-500'
                  }`}>
                  {task.security_score.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default StatsPanel;
