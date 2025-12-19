/**
 * Database Manager Component
 * Corporate Blue Theme
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Activity,
  RefreshCw,
  Database,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '@/shared/api/database';
import { toast } from 'sonner';

interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'error';
  database_connected: boolean;
  total_records: number;
  issues: string[];
  warnings: string[];
}

interface DatabaseStats {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  running_tasks: number;
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  total_analyses: number;
}

export function DatabaseManager() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [dbMode, setDbMode] = useState<'api' | 'local'>('api');

  useEffect(() => {
    checkMode();
    loadHealth();
    loadStats();
  }, []);

  const checkMode = async () => {
    try {
      // Simple check to see if we are in API mode (this endpoint should exist in API)
      await api.getHealth();
      setDbMode('api');
    } catch {
      setDbMode('local');
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (error) {
      console.error('Failed to load health:', error);
      toast.error('无法加载数据库健康状态');
    } finally {
      setHealthLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Don't show toast for stats failure on load, as it might be expected in some states
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const blob = await api.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deepaudit-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: '数据导出成功' });
      toast.success('数据导出成功');
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: '导出失败: ' + (error instanceof Error ? error.message : String(error)) });
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    try {
      const result = await api.importData(file);
      setMessage({
        type: 'success',
        text: `数据导入成功: 已导入 ${result.summary.projects} 个项目, ${result.summary.tasks} 个任务, ${result.summary.issues} 个问题, ${result.summary.analysis_records} 条分析记录`
      });
      toast.success('数据导入成功');
      loadHealth(); // Refresh health
      loadStats(); // Refresh stats
    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: '导入失败: ' + (error instanceof Error ? error.message : String(error)) });
      toast.error('导入失败');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClear = async () => {
    if (!window.confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await api.clearData();
      setMessage({
        type: 'success',
        text: `数据已清空: 已删除 ${result.deleted.projects} 个项目, ${result.deleted.tasks} 个任务, ${result.deleted.issues} 个问题, ${result.deleted.analysis_records} 条分析记录`
      });
      toast.success('数据已清空');
      loadHealth();
      loadStats();
    } catch (error) {
      console.error('Clear failed:', error);
      setMessage({ type: 'error', text: '清空失败: ' + (error instanceof Error ? error.message : String(error)) });
      toast.error('清空失败');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100">健康</Badge>;
      case 'warning':
        return <Badge className="bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100">警告</Badge>;
      case 'error':
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100">错误</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Check */}
      <div className="cloud-card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">数据库健康检查</h3>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHealth}
              disabled={healthLoading}
              className="h-8 bg-white"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
        <div className="p-6">
          {healthLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner text-primary" />
            </div>
          ) : health ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                {health.status === 'healthy' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : health.status === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                )}
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-sm text-slate-500">状态：</span>
                  {getHealthStatusBadge(health.status)}
                </div>
                <span className="text-sm text-slate-500">
                  数据库连接：
                  <span className={health.database_connected ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                    {health.database_connected ? '正常' : '异常'}
                  </span>
                  <span className="mx-2 text-slate-300">|</span>
                  总记录数：<span className="text-slate-900 font-medium">{health.total_records.toLocaleString()}</span>
                </span>
              </div>

              {health.issues.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg">
                  <p className="font-bold text-rose-600 uppercase text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    发现的问题
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-rose-600/80">
                    {health.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {health.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                  <p className="font-bold text-amber-600 uppercase text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    警告信息
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-600/80">
                    {health.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-sky-50 border border-sky-100 p-4 flex items-start gap-3 rounded-lg">
              <Info className="h-5 w-5 text-sky-500 mt-0.5" />
              <p className="text-sm text-sky-600">无法加载健康检查信息</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="cloud-card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">详细数据统计</h3>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={statsLoading}
              className="h-8 bg-white"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
        <div className="p-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loading-spinner text-primary" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">项目</p>
                <p className="text-2xl font-bold text-primary mt-1">{stats.total_projects}</p>
                <p className="text-xs text-emerald-600 mt-1">活跃: {stats.active_projects}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">任务</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.total_tasks}</p>
                <p className="text-xs text-slate-500 mt-1">完成: {stats.completed_tasks} | 进行中: {stats.running_tasks}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">问题</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{stats.total_issues}</p>
                <p className="text-xs text-slate-500 mt-1">未解决: {stats.open_issues} | 已解决: {stats.resolved_issues}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">分析记录</p>
                <p className="text-2xl font-bold text-violet-500 mt-1">{stats.total_analyses}</p>
                <p className="text-xs text-slate-500 mt-1">即时分析</p>
              </div>
            </div>
          ) : (
            <div className="bg-sky-50 border border-sky-100 p-4 flex items-start gap-3 rounded-lg">
              <Info className="h-5 w-5 text-sky-500 mt-0.5" />
              <p className="text-sm text-sky-600">无法加载统计信息</p>
            </div>
          )}
        </div>
      </div>

      {/* Data Operations */}
      <div className="cloud-card p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">数据操作</h3>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {message && (
            <div className={`p-4 flex items-start gap-3 rounded-lg ${message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-100'
                : 'bg-rose-50 border border-rose-100'
              }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5" />
              )}
              <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {message.text}
              </p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                <Download className="h-4 w-4 text-sky-500" />
                导出数据
              </h4>
              <p className="text-xs text-slate-500">将数据导出为 JSON 文件，用于备份或迁移</p>
              <Button
                onClick={handleExport}
                disabled={loading}
                variant="outline"
                className="w-full h-10 border-slate-200"
              >
                <Download className="mr-2 h-4 w-4" />
                导出数据
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-500" />
                导入数据
              </h4>
              <p className="text-xs text-slate-500">从 JSON 文件恢复数据（最大 50MB）</p>
              <Button
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={loading}
                variant="outline"
                className="w-full h-10 border-slate-200"
              >
                <Upload className="mr-2 h-4 w-4" />
                导入数据
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase text-rose-500 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                清空数据
              </h4>
              <p className="text-xs text-slate-500">删除所有数据（不可恢复）</p>
              <Button
                onClick={handleClear}
                disabled={loading}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 h-10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空数据
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 border-dashed">
            <div className="bg-sky-50 border border-sky-100 p-4 flex items-start gap-3 rounded-lg">
              <Info className="h-5 w-5 text-sky-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-sky-700">
                <strong className="uppercase text-sky-600">提示：</strong>
                {dbMode === 'api'
                  ? '数据存储在后端 PostgreSQL 数据库中，支持多用户、多设备同步。建议定期导出备份。'
                  : '建议定期导出数据备份，以防意外数据丢失。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
