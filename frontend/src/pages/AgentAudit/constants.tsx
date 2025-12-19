/**
 * Agent Audit Constants
 * Shared constants for the Agent Audit page
 * Corporate Blue Theme
 */

import React from "react";
import {
  Brain, Wrench, Target, Bug, Zap, Terminal,
  AlertTriangle, Shield, Search, FileCode,
  CheckCircle2, XCircle, Clock, Loader2, Square, Bot,
  Cpu, Scan, FileSearch, ShieldCheck
} from "lucide-react";

// ============ Severity Colors (Corporate Blue Theme) ============

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-rose-700 bg-rose-50 border border-rose-200",
  high: "text-orange-700 bg-orange-50 border border-orange-200",
  medium: "text-amber-700 bg-amber-50 border border-amber-200",
  low: "text-blue-700 bg-blue-50 border border-blue-200",
  info: "text-slate-600 bg-slate-50 border border-slate-200",
};

// ============ Action Verbs for Animation ============

export const ACTION_VERBS = [
  "正在分析", "正在扫描", "正在探测", "正在调查",
  "正在检查", "正在审计", "正在测试", "正在探索",
  "正在处理", "正在评估", "正在追踪", "正在映射"
];

// ============ Log Type Configurations ============

export const LOG_TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
}> = {
  thinking: {
    icon: React.createElement(Brain, { className: "w-4 h-4 text-violet-600" }),
    borderColor: "border-l-violet-500",
    bgColor: "bg-violet-50"
  },
  tool: {
    icon: React.createElement(Wrench, { className: "w-4 h-4 text-amber-600" }),
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-50"
  },
  phase: {
    icon: React.createElement(Target, { className: "w-4 h-4 text-teal-600" }),
    borderColor: "border-l-teal-500",
    bgColor: "bg-teal-50"
  },
  finding: {
    icon: React.createElement(Bug, { className: "w-4 h-4 text-rose-600" }),
    borderColor: "border-l-rose-500",
    bgColor: "bg-rose-50"
  },
  dispatch: {
    icon: React.createElement(Zap, { className: "w-4 h-4 text-blue-600" }),
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50"
  },
  info: {
    icon: React.createElement(Terminal, { className: "w-4 h-4 text-slate-500" }),
    borderColor: "border-l-slate-400",
    bgColor: "bg-slate-50"
  },
  error: {
    icon: React.createElement(AlertTriangle, { className: "w-4 h-4 text-red-600" }),
    borderColor: "border-l-red-500",
    bgColor: "bg-red-50"
  },
  user: {
    icon: React.createElement(Shield, { className: "w-4 h-4 text-indigo-600" }),
    borderColor: "border-l-indigo-500",
    bgColor: "bg-indigo-50"
  },
};

// ============ Agent Status Configurations ============

export const AGENT_STATUS_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  text: string;
  animate?: boolean;
}> = {
  running: {
    icon: React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500" }),
    color: "text-emerald-600",
    text: "运行中",
    animate: true
  },
  completed: {
    icon: React.createElement(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" }),
    color: "text-emerald-600",
    text: "已完成"
  },
  failed: {
    icon: React.createElement(XCircle, { className: "w-3.5 h-3.5 text-rose-600" }),
    color: "text-rose-600",
    text: "失败"
  },
  waiting: {
    icon: React.createElement(Clock, { className: "w-3.5 h-3.5 text-amber-500" }),
    color: "text-amber-600",
    text: "等待中"
  },
  created: {
    icon: React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-slate-400" }),
    color: "text-slate-500",
    text: "已创建"
  },
};

// ============ Agent Type Configurations ============

export const AGENT_TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  orchestrator: {
    icon: React.createElement(Cpu, { className: "w-3.5 h-3.5 text-violet-600" }),
    label: "编排代理",
    color: "violet"
  },
  recon: {
    icon: React.createElement(Scan, { className: "w-3.5 h-3.5 text-blue-600" }),
    label: "侦察代理",
    color: "blue"
  },
  analysis: {
    icon: React.createElement(FileSearch, { className: "w-3.5 h-3.5 text-amber-600" }),
    label: "分析代理",
    color: "amber"
  },
  verification: {
    icon: React.createElement(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }),
    label: "验证代理",
    color: "emerald"
  },
};

// ============ Task Status Configurations ============

export const TASK_STATUS_CONFIG: Record<string, {
  bg: string;
  icon: React.ReactNode;
  text: string;
}> = {
  pending: {
    bg: "bg-slate-100",
    icon: React.createElement(Clock, { className: "w-3 h-3 text-slate-500" }),
    text: "待处理"
  },
  running: {
    bg: "bg-emerald-100",
    icon: React.createElement(Loader2, { className: "w-3 h-3 animate-spin text-emerald-600" }),
    text: "进行中"
  },
  completed: {
    bg: "bg-emerald-100",
    icon: React.createElement(CheckCircle2, { className: "w-3 h-3 text-emerald-600" }),
    text: "已完成"
  },
  failed: {
    bg: "bg-rose-100",
    icon: React.createElement(XCircle, { className: "w-3 h-3 text-rose-600" }),
    text: "失败"
  },
  cancelled: {
    bg: "bg-amber-100",
    icon: React.createElement(Square, { className: "w-3 h-3 text-amber-600" }),
    text: "已取消"
  },
};

// ============ Polling Intervals ============

export const POLLING_INTERVALS = {
  AGENT_TREE: 2000,
  TASK_STATS: 2000,
  AGENT_TREE_DEBOUNCE: 500,
  AGENT_TREE_MIN_DELAY: 100,
};

// ============ Timeouts ============

export const TIMEOUTS = {
  SPLASH_SCREEN: 2500,
  HEARTBEAT: 45000,
  RECONNECT_BASE: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
};

// ============ UI Configuration ============

export const UI_CONFIG = {
  LOG_MAX_HEIGHT: 256,
  TREE_INDENT: 20,
  ANIMATION_DURATION: 200,
  SCROLL_BEHAVIOR: 'smooth' as const,
};

// ============ Color Palette ============

export const COLORS = {
  primary: '#2563eb', // blue-600
  success: '#10b981', // emerald-500
  error: '#f43f5e',   // rose-500
  warning: '#f59e0b', // amber-500
  info: '#0ea5e9',    // sky-500
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc', // slate-50
    tertiary: '#f1f5f9', // slate-100
  },
  border: {
    primary: '#e2e8f0', // slate-200
    secondary: '#cbd5e1', // slate-300
  }
};
