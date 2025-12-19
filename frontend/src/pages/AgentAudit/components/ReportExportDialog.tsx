/**
 * Report Export Dialog Component - Enhanced Version
 * Corporate Blue Theme
 */

import { useState, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  FileJson,
  Download,
  Loader2,
  Check,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Settings2,
  ChevronDown,
  ChevronUp,
  Zap,
  FileDown
} from "lucide-react";
import { downloadAgentReport } from "@/shared/api/agentTasks";
import type { AgentTask, AgentFinding } from "@/shared/api/agentTasks";

// ============ Types ============

type ReportFormat = "markdown" | "json";

interface ReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: AgentTask | null;
  findings: AgentFinding[];
}

interface ExportOptions {
  includeCodeSnippets: boolean;
  includeRemediation: boolean;
  includeMetadata: boolean;
  compactMode: boolean;
}

// ============ Constants ============

const FORMAT_CONFIG: Record<ReportFormat, {
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  mime: string;
  color: string;
  bgColor: string;
}> = {
  markdown: {
    label: "Markdown",
    description: "可编辑文档格式",
    icon: <FileText className="w-5 h-5" />,
    extension: ".md",
    mime: "text/markdown",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  json: {
    label: "JSON",
    description: "结构化数据格式",
    icon: <FileJson className="w-5 h-5" />,
    extension: ".json",
    mime: "application/json",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
  },
};

// Default options
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeCodeSnippets: true,
  includeRemediation: true,
  includeMetadata: true,
  compactMode: false,
};

// ============ Helper Functions ============

// Get security score color
function getScoreColor(score: number): { text: string; bg: string; glow: string } {
  if (score >= 80) return { text: "text-emerald-600", bg: "stroke-emerald-500", glow: "drop-shadow-sm" };
  if (score >= 60) return { text: "text-amber-600", bg: "stroke-amber-500", glow: "drop-shadow-sm" };
  if (score >= 40) return { text: "text-orange-600", bg: "stroke-orange-500", glow: "drop-shadow-sm" };
  return { text: "text-rose-600", bg: "stroke-rose-500", glow: "drop-shadow-sm" };
}

// ============ Sub Components ============

// Circular progress component
const CircularProgress = memo(function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  className = "",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const colors = getScoreColor(value);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colors.bg} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold font-mono ${colors.text}`}>
          {value.toFixed(0)}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">分</span>
      </div>
    </div>
  );
});

// Enhanced stats panel
const EnhancedStatsPanel = memo(function EnhancedStatsPanel({
  task,
}: {
  task: AgentTask;
  findings: AgentFinding[];
}) {
  const totalFindings = task.findings_count || 0;
  const criticalAndHigh = (task.critical_count || 0) + (task.high_count || 0);
  const verified = task.verified_count || 0;
  const score = task.security_score || 0;

  const stats = [
    {
      icon: <Bug className="w-4 h-4" />,
      label: "漏洞总数",
      value: totalFindings,
      color: "text-slate-900",
      iconColor: "text-rose-500",
      trend: totalFindings > 0 ? "up" : null,
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "高危问题",
      value: criticalAndHigh,
      color: criticalAndHigh > 0 ? "text-rose-600" : "text-slate-500",
      iconColor: "text-orange-500",
      trend: criticalAndHigh > 0 ? "critical" : null,
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "已验证",
      value: verified,
      color: "text-emerald-600",
      iconColor: "text-emerald-500",
      trend: null,
    },
  ];

  return (
    <div className="flex items-stretch gap-4">
      {/* 环形安全评分 */}
      <div className="flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
        <CircularProgress value={score} size={72} strokeWidth={5} />
      </div>

      {/* 统计数字网格 */}
      <div className="flex-1 grid grid-cols-3 gap-2">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`${stat.iconColor}`}>
                {stat.icon}
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                {stat.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${stat.color}`}>
                {stat.value}
              </span>
              {stat.trend === "critical" && stat.value > 0 && (
                <Zap className="w-3 h-3 text-rose-500 animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Format selector
const FormatSelector = memo(function FormatSelector({
  activeFormat,
  onFormatChange,
}: {
  activeFormat: ReportFormat;
  onFormatChange: (format: ReportFormat) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(Object.keys(FORMAT_CONFIG) as ReportFormat[]).map((format) => {
        const config = FORMAT_CONFIG[format];
        const isActive = format === activeFormat;

        return (
          <button
            key={format}
            onClick={() => onFormatChange(format)}
            className={`
              relative p-4 rounded-xl border transition-all duration-300 text-left group
              ${isActive
                ? `${config.bgColor} border-opacity-100 shadow-sm ring-1 ring-opacity-50`
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }
            `}
          >
            {/* 选中指示器 */}
            {isActive && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <div className={`mb-2 ${isActive ? config.color : "text-slate-400 group-hover:text-slate-600"}`}>
              {config.icon}
            </div>

            <div className={`text-sm font-bold mb-0.5 ${isActive ? "text-slate-900" : "text-slate-700"}`}>
              {config.label}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {config.description}
            </div>
          </button>
        );
      })}
    </div>
  );
});

// Export options panel
const ExportOptionsPanel = memo(function ExportOptionsPanel({
  options,
  onOptionsChange,
  expanded,
  onToggle,
}: {
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const optionItems = [
    { key: "includeCodeSnippets", label: "包含代码片段", description: "导出相关的代码示例" },
    { key: "includeRemediation", label: "包含修复建议", description: "导出漏洞修复方案" },
    { key: "includeMetadata", label: "包含元数据", description: "导出任务和文件信息" },
    { key: "compactMode", label: "紧凑模式", description: "减少空白和间距" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-700">导出选项</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      <div
        className={`
          grid transition-all duration-300 ease-out
          ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
        `}
      >
        <div className="overflow-hidden">
          <div className="p-3 pt-0 space-y-2 bg-white border-t border-slate-200">
            {optionItems.map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.description}</div>
                </div>
                <Switch
                  checked={options[item.key as keyof ExportOptions]}
                  onCheckedChange={(checked: boolean) =>
                    onOptionsChange({ ...options, [item.key]: checked })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});



// ============ Main Component ============

export const ReportExportDialog = memo(function ReportExportDialog({
  open,
  onOpenChange,
  task,
  findings,
}: ReportExportDialogProps) {
  // State
  const [activeFormat, setActiveFormat] = useState<ReportFormat>("markdown");
  const [downloading, setDownloading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const handleDownload = async () => {
    if (!task) return;
    setDownloading(true);
    try {
      await downloadAgentReport(task.id, activeFormat);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              导出审计报告
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-slate-500 bg-slate-50">
              {task.id.slice(0, 8)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
          {/* Stats Summary */}
          <EnhancedStatsPanel task={task} findings={findings} />

          {/* Format Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">选择格式</h3>
            <FormatSelector
              activeFormat={activeFormat}
              onFormatChange={setActiveFormat}
            />
          </div>

          {/* Export Options */}
          <ExportOptionsPanel
            options={exportOptions}
            onOptionsChange={setExportOptions}
            expanded={optionsExpanded}
            onToggle={() => setOptionsExpanded(!optionsExpanded)}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-slate-600 border-slate-200 font-bold">
            取消
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-primary hover:bg-blue-700 text-white font-bold shadow-sm"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                导出 {FORMAT_CONFIG[activeFormat].label} 报告
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ReportExportDialog;
