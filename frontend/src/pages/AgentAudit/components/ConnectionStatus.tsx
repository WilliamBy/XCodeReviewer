/**
 * Connection Status Indicator
 * Corporate Blue Theme
 */

import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/utils/utils';
import type { ConnectionState } from '../hooks';

interface ConnectionStatusProps {
  state: ConnectionState;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  className?: string;
}

const STATUS_CONFIG: Record<ConnectionState, {
  icon: typeof Wifi;
  label: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}> = {
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 border-slate-200',
  },
  connecting: {
    icon: RefreshCw,
    label: 'Connecting',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    animate: true,
  },
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 border-emerald-200',
  },
  reconnecting: {
    icon: RefreshCw,
    label: 'Reconnecting',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    animate: true,
  },
  failed: {
    icon: AlertCircle,
    label: 'Connection Failed',
    color: 'text-rose-700',
    bgColor: 'bg-rose-100 border-rose-200',
  },
};

export function ConnectionStatus({
  state,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  className,
}: ConnectionStatusProps) {
  const config = STATUS_CONFIG[state];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm transition-all',
        config.bgColor,
        config.color
      )}>
        <Icon className={cn(
          'w-3.5 h-3.5',
          config.animate && 'animate-spin'
        )} />
        <span>{config.label}</span>
        {state === 'reconnecting' && reconnectAttempts > 0 && (
          <span className="opacity-80">
            ({reconnectAttempts}/{maxReconnectAttempts})
          </span>
        )}
      </div>

      {state === 'connected' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
    </div>
  );
}

export default ConnectionStatus;
