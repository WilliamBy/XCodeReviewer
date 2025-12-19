/**
 * Agent Detail Panel Component
 * Corporate Blue Theme
 */

import { memo } from "react";
import { X, Cpu, Scan, FileSearch, ShieldCheck, Bot, Repeat, Zap, Bug, FileCode, Clock, Network } from "lucide-react";
import { AGENT_STATUS_CONFIG } from "../constants";
import { findAgentInTree } from "../utils";
import type { AgentDetailPanelProps } from "../types";

// Agent type configurations
const AGENT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  orchestrator: {
    icon: <Cpu className="w-4 h-4" />,
    label: "Orchestrator",
    color: "text-violet-600",
    bg: "bg-violet-50"
  },
  recon: {
    icon: <Scan className="w-4 h-4" />,
    label: "Reconnaissance",
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  analysis: {
    icon: <FileSearch className="w-4 h-4" />,
    label: "Analysis",
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  verification: {
    icon: <ShieldCheck className="w-4 h-4" />,
    label: "Verification",
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
};

export const AgentDetailPanel = memo(function AgentDetailPanel({ agentId, treeNodes, onClose }: AgentDetailPanelProps) {
  const agent = findAgentInTree(treeNodes, agentId);
  if (!agent) return null;

  const statusConfig = AGENT_STATUS_CONFIG[agent.status] || AGENT_STATUS_CONFIG.created;
  const typeConfig = AGENT_TYPE_CONFIG[agent.agent_type] || {
    icon: <Bot className="w-4 h-4" />,
    label: "Agent",
    color: "text-slate-600",
    bg: "bg-slate-50"
  };

  const isRunning = agent.status === 'running';

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          {/* Agent type icon with color */}
          <div className={`p-2 rounded-lg ${typeConfig.bg} ${typeConfig.color}`}>
            {typeConfig.icon}
          </div>

          {/* Agent name */}
          <div>
            <span className="text-sm font-bold text-slate-800 block leading-tight">{agent.agent_name}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{typeConfig.label}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={`
              w-3 h-3 rounded-full border-2 border-white shadow-sm
              ${isRunning ? 'bg-emerald-500 animate-pulse' : ''}
              ${agent.status === 'completed' ? 'bg-emerald-500' : ''}
              ${agent.status === 'failed' ? 'bg-rose-500' : ''}
              ${agent.status === 'waiting' ? 'bg-amber-500' : ''}
              ${agent.status === 'created' ? 'bg-slate-400' : ''}
            `} />
            {isRunning && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-30" />
            )}
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide
            ${agent.status === 'completed' ? 'text-emerald-600' : ''}
            ${agent.status === 'failed' ? 'text-rose-600' : ''}
            ${agent.status === 'waiting' ? 'text-amber-600' : ''}
            ${agent.status === 'created' || agent.status === 'running' ? 'text-slate-600' : ''}
          `}>
            {statusConfig.text || agent.status}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Iterations */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <Repeat className="w-4 h-4 text-blue-500" />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Runs</div>
            <div className="text-sm text-slate-900 font-bold">{agent.iterations || 0}</div>
          </div>
        </div>

        {/* Tool Calls */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <Zap className="w-4 h-4 text-amber-500" />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Tools</div>
            <div className="text-sm text-slate-900 font-bold">{agent.tool_calls || 0}</div>
          </div>
        </div>

        {/* Findings - Only show for Orchestrator (root agent with no parent) */}
        {!agent.parent_agent_id && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Bug className={`w-4 h-4 ${agent.findings_count > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <div className="min-w-0">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Findings</div>
              <div className={`text-sm font-bold ${agent.findings_count > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {agent.findings_count}
              </div>
            </div>
          </div>
        )}

        {/* Duration/Status - Show for sub-agents instead of Findings */}
        {agent.parent_agent_id && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <Clock className="w-4 h-4 text-slate-500" />
            <div className="min-w-0">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">
                {agent.duration_ms ? "Time" : "Status"}
              </div>
              <div className="text-sm text-slate-900 font-bold">
                {agent.duration_ms
                  ? `${(agent.duration_ms / 1000).toFixed(1)}s`
                  : (AGENT_STATUS_CONFIG[agent.status]?.text || agent.status)
                }
              </div>
            </div>
          </div>
        )}

        {/* Tokens */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <FileCode className="w-4 h-4 text-violet-500" />
          <div className="min-w-0">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Tokens</div>
            <div className="text-sm text-slate-900 font-bold">
              {((agent.tokens_used || 0) / 1000).toFixed(1)}k
            </div>
          </div>
        </div>
      </div>

      {/* Task description */}
      {agent.task_description && (
        <div className="px-4 pb-4">
          <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Current Task</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {agent.task_description}
            </p>
          </div>
        </div>
      )}

      {/* Sub-agents indicator */}
      {agent.children && agent.children.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Network className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              {agent.children.length} Sub-agent{agent.children.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default AgentDetailPanel;
