/**
 * Agent Tree Node Component
 * Corporate Blue Theme
 */

import { useState, memo } from "react";
import { ChevronDown, ChevronRight, Bot, Cpu, Scan, FileSearch, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AGENT_STATUS_CONFIG } from "../constants";
import type { AgentTreeNodeItemProps } from "../types";

// Agent type icons
const AGENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Cpu className="w-3.5 h-3.5 text-violet-600" />,
  recon: <Scan className="w-3.5 h-3.5 text-blue-600" />,
  analysis: <FileSearch className="w-3.5 h-3.5 text-amber-600" />,
  verification: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
};

// Status glow colors (simplified for light theme)
const STATUS_STYLES: Record<string, string> = {
  running: 'ring-2 ring-emerald-500/20 bg-emerald-50/50',
  completed: '',
  failed: 'ring-2 ring-rose-500/20 bg-rose-50/50',
  waiting: 'opacity-80',
  created: 'opacity-80',
};

export const AgentTreeNodeItem = memo(function AgentTreeNodeItem({
  node,
  depth = 0,
  selectedId,
  onSelect
}: AgentTreeNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.agent_id;
  const isRunning = node.status === 'running';

  const typeIcon = AGENT_TYPE_ICONS[node.agent_type] || <Bot className="w-3.5 h-3.5 text-slate-400" />;

  return (
    <div className="relative">
      {/* Connection line to parent - vertical line */}
      {depth > 0 && (
        <div
          className="absolute top-0 w-px bg-slate-200"
          style={{
            left: `${depth * 20 - 10}px`,
            height: '24px',
          }}
        />
      )}

      {/* Horizontal connector line */}
      {depth > 0 && (
        <div
          className="absolute top-[24px] h-px bg-slate-200"
          style={{
            left: `${depth * 20 - 10}px`,
            width: '10px',
          }}
        />
      )}

      {/* Node item */}
      <div
        className={`
          group relative flex items-center gap-2.5 py-2.5 px-3 cursor-pointer rounded-lg mb-1
          transition-all duration-200 ease-out border
          ${isSelected
            ? 'bg-blue-50 border-blue-200 shadow-sm'
            : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
          }
          ${STATUS_STYLES[node.status] || ''}
        `}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => onSelect(node.agent_id)}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className={`
              flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors
              ${isSelected ? 'bg-blue-100 hover:bg-blue-200 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}
            `}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Status indicator */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <div className={`
            w-2.5 h-2.5 rounded-full transition-all duration-300 border-2 border-white shadow-sm
            ${isRunning ? 'bg-emerald-500 animate-pulse' : ''}
            ${node.status === 'completed' ? 'bg-emerald-500' : ''}
            ${node.status === 'failed' ? 'bg-rose-500' : ''}
            ${node.status === 'waiting' ? 'bg-amber-400' : ''}
            ${node.status === 'created' ? 'bg-slate-400' : ''}
          `} />
          {isRunning && (
            <div className="absolute inset-0 w-full h-full rounded-full bg-emerald-500 animate-ping opacity-30" />
          )}
        </div>

        {/* Agent type icon */}
        <div className={`flex-shrink-0 p-1.5 rounded-md ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
          {typeIcon}
        </div>

        {/* Agent name */}
        <span className={`
          text-sm truncate flex-1 transition-colors duration-200 font-medium
          ${isSelected ? 'text-blue-900' : 'text-slate-700 group-hover:text-slate-900'}
        `}>
          {node.agent_name}
        </span>

        {/* Metrics badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Iterations */}
          {(node.iterations ?? 0) > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold
              ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}
            `}>
              {node.iterations}x
            </span>
          )}

          {/* Findings count - Only show for Orchestrator (root agent) */}
          {!node.parent_agent_id && node.findings_count > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-rose-100 text-rose-600 border border-rose-200 shadow-none font-bold">
              {node.findings_count}
            </Badge>
          )}
        </div>
      </div>

      {/* Children with animated reveal */}
      {expanded && hasChildren && (
        <div
          className="relative pl-0"
          style={{
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          {/* Vertical connection line for children */}
          <div
            className="absolute bg-slate-200"
            style={{
              left: `${(depth + 1) * 20 - 10}px`,
              top: '0',
              bottom: '12px',
              width: '1px'
            }}
          />

          {node.children.map((child, index) => (
            <AgentTreeNodeItem
              key={child.agent_id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Inline animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

export default AgentTreeNodeItem;
