/**
 * Status Badge Component
 * Corporate Blue Theme
 */

import { memo } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, Square, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

const STATUS_CONFIG: Record<string, {
  icon: React.ReactNode;
  iconSm: React.ReactNode;
  bg: string;
  text: string;
  label: string;
  animate?: boolean;
}> = {
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    iconSm: <Clock className="w-3 h-3" />,
    bg: "bg-slate-200 border-slate-300",
    text: "text-slate-600",
    label: "PENDING",
  },
  running: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    iconSm: <Loader2 className="w-3 h-3 animate-spin" />,
    bg: "bg-emerald-100 border-emerald-200",
    text: "text-emerald-700",
    label: "RUNNING",
    animate: true,
  },
  completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    iconSm: <CheckCircle2 className="w-3 h-3" />,
    bg: "bg-emerald-100 border-emerald-200",
    text: "text-emerald-700",
    label: "COMPLETED",
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    iconSm: <XCircle className="w-3 h-3" />,
    bg: "bg-rose-100 border-rose-200",
    text: "text-rose-700",
    label: "FAILED",
  },
  cancelled: {
    icon: <Square className="w-3.5 h-3.5 fill-current" />,
    iconSm: <Square className="w-3 h-3 fill-current" />,
    bg: "bg-amber-100 border-amber-200",
    text: "text-amber-700",
    label: "CANCELLED",
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    iconSm: <AlertCircle className="w-3 h-3" />,
    bg: "bg-rose-100 border-rose-200",
    text: "text-rose-700",
    label: "ERROR",
  },
};

export const StatusBadge = memo(function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isSmall = size === "sm";

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider
        transition-all duration-300 shadow-sm
        ${config.bg}
        ${config.text}
        ${isSmall ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}
      `}
    >
      {isSmall ? config.iconSm : config.icon}
      <span>{config.label}</span>
    </div>
  );
});

export default StatusBadge;
