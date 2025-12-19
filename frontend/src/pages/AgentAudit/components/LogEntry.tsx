/**
 * Log Entry Component
 * Corporate Blue Theme
 */

import { memo } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Clock,
  CheckCircle2, Wifi, XOctagon, AlertTriangle,
  Play, Square, ArrowRight, terminal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LogEntryProps } from "../types";

// Log type labels for display
const LOG_TYPE_LABELS: Record<string, string> = {
  thinking: '思考',
  tool: '工具',
  phase: '阶段',
  finding: '漏洞',
  dispatch: '调度',
  info: '信息',
  error: '错误',
  user: '用户',
};

// Helper to format title (remove emojis and clean up)
function formatTitle(title: string, type: string): string {
  // Remove common emojis
  let cleaned = title
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[✅🔗🛑✕⚠️❌⚡🔄🔍💡📁📄🐛🛡️]/g, '')
    .trim();

  // Remove leading punctuation/symbols
  cleaned = cleaned.replace(/^[:\-–—•·]\s*/, '');

  return cleaned || title;
}

// Get status icon for info/system messages
function getStatusIcon(title: string) {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('connect') || lowerTitle.includes('stream')) {
    return <Wifi className="w-3.5 h-3.5 text-emerald-500" />;
  }
  if (lowerTitle.includes('complete') || lowerTitle.includes('success') || lowerTitle.includes('done')) {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  }
  if (lowerTitle.includes('cancel') || lowerTitle.includes('stop') || lowerTitle.includes('abort')) {
    return <XOctagon className="w-3.5 h-3.5 text-amber-500" />;
  }
  if (lowerTitle.includes('error') || lowerTitle.includes('fail')) {
    return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
  }
  if (lowerTitle.includes('start') || lowerTitle.includes('begin') || lowerTitle.includes('init')) {
    return <Play className="w-3.5 h-3.5 text-blue-500" />;
  }
  return null;
}

export const LogEntry = memo(function LogEntry({ item, isExpanded, onToggle }: LogEntryProps) {
  const isThinking = item.type === 'thinking';
  const isTool = item.type === 'tool';
  const isFinding = item.type === 'finding';
  const isError = item.type === 'error';
  const isInfo = item.type === 'info';
  const showContent = isThinking || isExpanded;
  const isCollapsible = !isThinking && item.content;

  const formattedTitle = formatTitle(item.title, item.type);
  const statusIcon = isInfo ? getStatusIcon(formattedTitle) : null;

  // Determine styles based on type
  let containerClass = "bg-white border-slate-200";
  let typeBadgeClass = "bg-slate-100 text-slate-500";
  let iconColor = "text-slate-400";

  if (isThinking) {
    containerClass = "bg-violet-50/50 border-violet-100";
    typeBadgeClass = "bg-violet-100 text-violet-600";
    iconColor = "text-violet-500";
  } else if (isTool) {
    containerClass = "bg-amber-50/50 border-amber-100";
    typeBadgeClass = "bg-amber-100 text-amber-600";
    iconColor = "text-amber-500";
  } else if (isFinding) {
    containerClass = "bg-rose-50/50 border-rose-100 shadow-sm";
    typeBadgeClass = "bg-rose-100 text-rose-600";
    iconColor = "text-rose-500";
  } else if (isError) {
    containerClass = "bg-red-50/50 border-red-100";
    typeBadgeClass = "bg-red-100 text-red-600";
    iconColor = "text-red-500";
  } else if (item.type === 'dispatch') {
    containerClass = "bg-sky-50/50 border-sky-100";
    typeBadgeClass = "bg-sky-100 text-sky-600";
    iconColor = "text-sky-500";
  } else if (item.type === 'phase') {
    containerClass = "bg-teal-50/50 border-teal-100";
    typeBadgeClass = "bg-teal-100 text-teal-600";
    iconColor = "text-teal-500";
  } else if (item.type === 'user') {
    containerClass = "bg-indigo-50/50 border-indigo-100";
    typeBadgeClass = "bg-indigo-100 text-indigo-600";
    iconColor = "text-indigo-500";
  }

  return (
    <div
      className={`
        group relative mb-2 transition-all duration-200 ease-out
        ${isCollapsible ? 'cursor-pointer' : ''}
      `}
      onClick={isCollapsible ? onToggle : undefined}
    >
      {/* Main card */}
      <div className={`
        relative rounded-lg border overflow-hidden shadow-sm
        ${containerClass}
        ${isCollapsible ? 'hover:shadow-md transition-shadow' : ''}
      `}>
        {/* Content */}
        <div className="relative px-4 py-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            {/* Type label */}
            <span className={`
              text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
              ${typeBadgeClass}
              flex-shrink-0
            `}>
              {LOG_TYPE_LABELS[item.type] || 'LOG'}
            </span>

            {/* Timestamp */}
            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
              {item.time}
            </span>

            {/* Separator */}
            <div className="h-3 w-px bg-slate-200 flex-shrink-0" />

            {/* Status icon for info messages */}
            {statusIcon && <span className="flex-shrink-0">{statusIcon}</span>}

            {/* Title - for non-thinking types */}
            {!isThinking && (
              <span className={`text-sm font-medium truncate flex-1 ${isError || isFinding ? 'text-slate-800' : 'text-slate-600'}`}>
                {formattedTitle}
              </span>
            )}

            {/* Streaming cursor */}
            {item.isStreaming && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-xs text-primary font-medium">Thinking...</span>
              </div>
            )}

            {/* Tool status */}
            {item.tool?.status === 'running' && (
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                <span className="text-[10px] text-amber-600 font-bold uppercase">运行中...</span>
              </div>
            )}

            {item.tool?.status === 'completed' && (
              <div className="flex items-center gap-1 flex-shrink-0 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Agent badge */}
            {item.agentName && (
              <Badge
                variant="outline"
                className="h-5 px-2 text-[10px] uppercase tracking-wide border-primary/20 text-primary bg-primary/5 flex-shrink-0 font-semibold"
              >
                {item.agentName}
              </Badge>
            )}

            {/* Right side info */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              {/* Duration badge */}
              {item.tool?.duration !== undefined && (
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.tool.duration}ms
                </span>
              )}

              {/* Severity badge */}
              {item.severity && (
                <Badge
                  className={`
                    text-[9px] uppercase tracking-wider font-bold px-1.5 py-0 shadow-none
                    ${item.severity === 'critical' ? 'bg-rose-100 text-rose-600 hover:bg-rose-100' :
                      item.severity === 'high' ? 'bg-orange-100 text-orange-600 hover:bg-orange-100' :
                        item.severity === 'medium' ? 'bg-amber-100 text-amber-600 hover:bg-amber-100' :
                          'bg-slate-100 text-slate-600 hover:bg-slate-100'
                    }
                  `}
                >
                  {item.severity}
                </Badge>
              )}

              {/* Expand indicator */}
              {isCollapsible && (
                <div className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thinking content - always visible with special styling */}
          {isThinking && item.content && (
            <div className="mt-3 relative pl-3 border-l-2 border-violet-200 ml-1">
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words font-medium">
                {item.content}
              </div>
            </div>
          )}

          {/* Collapsible content */}
          {!isThinking && showContent && item.content && (
            <div className="mt-3 overflow-hidden animate-in slide-in-from-top-1 duration-200">
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                {/* Mini header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-100/50">
                  <div className="flex items-center gap-2">
                    <Square className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {isTool ? 'Output' : 'Details'}
                    </span>
                  </div>
                </div>
                {/* Content */}
                <div className="p-3 bg-white">
                  <pre className="text-xs font-mono text-slate-600 max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words leading-relaxed">
                    {item.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LogEntry;
