/**
 * Audit Tasks Page
 * Corporate Blue Theme
 * 支持普通审计任务和Agent审计任务
 */

import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  FileText,
  Calendar,
  Plus,
  XCircle,
  Terminal,
  Bot,
  Zap,
  CheckCircle2
} from "lucide-react";
import { api } from "@/shared/config/database";
import type { AuditTask } from "@/shared/types";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAgentTasks, cancelAgentTask, type AgentTask } from "@/shared/api/agentTasks";
import CreateTaskDialog from "@/components/audit/CreateTaskDialog";

// Zombie task detection config
const ZOMBIE_TIMEOUT = 180000; // 3 minutes without progress is potentially stuck

// 任务类型标签
type TaskTab = "regular" | "agent";

export default function AuditTasks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TaskTab>("agent");

  // 普通任务状态
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);

  // Agent任务状态
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [agentLoading, setAgentLoading] = useState(true);
  const [cancellingAgentTaskId, setCancellingAgentTaskId] = useState<string | null>(null);

  // Zombie task detection: track progress and time for each task
  const taskProgressRef = useRef<Map<string, { progress: number; time: number }>>(new Map());

  useEffect(() => {
    loadTasks();
    loadAgentTasks();
  }, []);

  // 加载Agent任务（支持静默更新，不触发 loading 状态）
  const loadAgentTasks = async (silent = false) => {
    try {
      if (!silent) {
        setAgentLoading(true);
      }
      const data = await getAgentTasks();
      setAgentTasks(data);
    } catch (error) {
      console.error('Failed to load agent tasks:', error);
      if (!silent) {
        toast.error("加载Agent任务失败");
      }
    } finally {
      if (!silent) {
        setAgentLoading(false);
      }
    }
  };

  // Silently update active tasks progress (no loading state trigger)
  useEffect(() => {
    const activeTasks = tasks.filter(
      task => task.status === 'running' || task.status === 'pending'
    );

    if (activeTasks.length === 0) {
      taskProgressRef.current.clear();
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const updatedData = await api.getAuditTasks();

        setTasks(prevTasks => {
          return prevTasks.map(prevTask => {
            const updated = updatedData.find(t => t.id === prevTask.id);
            if (!updated) return prevTask;

            // Zombie task detection
            if (updated.status === 'running') {
              const currentProgress = updated.scanned_files || 0;
              const lastRecord = taskProgressRef.current.get(updated.id);

              if (lastRecord) {
                if (currentProgress !== lastRecord.progress) {
                  taskProgressRef.current.set(updated.id, { progress: currentProgress, time: Date.now() });
                } else if (Date.now() - lastRecord.time > ZOMBIE_TIMEOUT) {
                  toast.warning(`任务 "${updated.project?.name || '未知'}" 可能已停止响应`, {
                    id: `zombie-${updated.id}`,
                    duration: 10000,
                    action: {
                      label: '取消任务',
                      onClick: () => handleCancelTask(updated.id),
                    },
                  });
                  taskProgressRef.current.set(updated.id, { progress: currentProgress, time: Date.now() });
                }
              } else {
                taskProgressRef.current.set(updated.id, { progress: currentProgress, time: Date.now() });
              }
            } else {
              taskProgressRef.current.delete(updated.id);
            }

            if (
              updated.status !== prevTask.status ||
              updated.scanned_files !== prevTask.scanned_files ||
              updated.issues_count !== prevTask.issues_count
            ) {
              return updated;
            }
            return prevTask;
          });
        });
      } catch (error) {
        console.error('静默更新任务列表失败:', error);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [tasks.map(t => t.id + t.status).join(',')]);

  // 自动刷新Agent任务（静默更新，不显示 loading）
  useEffect(() => {
    const activeAgentTasks = agentTasks.filter(
      task => task.status === 'running' || task.status === 'pending'
    );

    if (activeAgentTasks.length === 0) return;

    const intervalId = setInterval(() => loadAgentTasks(true), 5000);
    return () => clearInterval(intervalId);
  }, [agentTasks.map(t => t.id + t.status).join(',')]);

  const handleCancelTask = async (taskId: string) => {
    if (cancellingTaskId) return;

    try {
      setCancellingTaskId(taskId);
      await api.cancelAuditTask(taskId);
      toast.success("任务已取消");
      await loadTasks();
    } catch (error: any) {
      console.error('取消任务失败:', error);
      toast.error(error?.response?.data?.detail || "取消任务失败");
    } finally {
      setCancellingTaskId(null);
    }
  };

  const handleCancelAgentTask = async (taskId: string) => {
    if (cancellingAgentTaskId) return;

    try {
      setCancellingAgentTaskId(taskId);
      await cancelAgentTask(taskId);
      toast.success("Agent任务已取消");
      // 取消后刷新列表，不使用静默模式以显示最新状态
      await loadAgentTasks(false);
    } catch (error: any) {
      console.error('取消Agent任务失败:', error);
      toast.error(error?.response?.data?.detail || "取消Agent任务失败");
    } finally {
      setCancellingAgentTaskId(null);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error("加载任务失败");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100">完成</Badge>;
      case 'running':
        return <Badge className="bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100">运行中</Badge>;
      case 'failed':
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100">失败</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-slate-500 border-slate-200">已取消</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500 border-slate-200">等待中</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Activity className="w-4 h-4 text-sky-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-slate-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAgentTasks = agentTasks.filter(task => {
    const matchesSearch = (task.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTaskProgress = (task: AuditTask) => {
    if (!task.total_files || task.total_files === 0) return 0;
    return Math.min(Math.round((task.scanned_files / task.total_files) * 100), 100);
  };

  // 统计数据
  const regularStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    running: tasks.filter(t => t.status === 'running').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  const agentStats = {
    total: agentTasks.length,
    completed: agentTasks.filter(t => t.status === 'completed').length,
    running: agentTasks.filter(t => t.status === 'running').length,
    failed: agentTasks.filter(t => t.status === 'failed').length,
  };

  const currentStats = activeTab === "agent" ? agentStats : regularStats;

  if ((activeTab === "regular" && loading) || (activeTab === "agent" && agentLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="loading-spinner text-primary mx-auto" />
          <p className="text-slate-500 font-sans text-sm uppercase tracking-wider">加载任务数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">审计任务管理</h1>

      {/* Tab 切换 - 卡片式设计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent任务卡片 */}
        <button
          onClick={() => setActiveTab("agent")}
          className={`
            relative group text-left p-5 rounded-xl transition-all duration-200 border-2 overflow-hidden
            ${activeTab === "agent"
              ? "bg-white border-primary shadow-md"
              : "bg-slate-50 border-slate-200 hover:border-primary/30 hover:bg-white"
            }
          `}
        >
          <div className="relative flex items-start gap-4">
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors
              ${activeTab === "agent" ? "bg-primary/10" : "bg-slate-100 group-hover:bg-primary/5"}
            `}>
              <Bot className={`w-6 h-6 ${activeTab === "agent" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-base font-bold uppercase tracking-wide ${activeTab === "agent" ? "text-primary" : "text-slate-600 group-hover:text-primary"}`}>
                  Agent 智能审计
                </h3>
                {agentStats.running > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary animate-pulse">
                    {agentStats.running} 运行中
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-1">
                LLM 驱动的多 Agent 协同深度审计，支持智能漏洞挖掘与验证
              </p>

              {/* 统计数据 */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span>共 <span className="font-bold text-slate-900">{agentStats.total}</span> 个任务</span>
                <span className="flex items-center text-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {agentStats.completed}
                </span>
                {agentStats.failed > 0 && (
                  <span className="flex items-center text-rose-500">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {agentStats.failed}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* 快速扫描任务卡片 */}
        <button
          onClick={() => setActiveTab("regular")}
          className={`
            relative group text-left p-5 rounded-xl transition-all duration-200 border-2 overflow-hidden
            ${activeTab === "regular"
              ? "bg-white border-sky-500 shadow-md"
              : "bg-slate-50 border-slate-200 hover:border-sky-500/30 hover:bg-white"
            }
          `}
        >
          <div className="relative flex items-start gap-4">
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors
              ${activeTab === "regular" ? "bg-sky-50" : "bg-slate-100 group-hover:bg-sky-50"}
            `}>
              <Zap className={`w-6 h-6 ${activeTab === "regular" ? "text-sky-500" : "text-slate-400 group-hover:text-sky-500"}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-base font-bold uppercase tracking-wide ${activeTab === "regular" ? "text-sky-600" : "text-slate-600 group-hover:text-sky-600"}`}>
                  快速扫描任务
                </h3>
                {regularStats.running > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-sky-100 text-sky-600 animate-pulse">
                    {regularStats.running} 运行中
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-1">
                传统规则引擎驱动的快速代码扫描，适合大规模批量检测
              </p>

              {/* 统计数据 */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span>共 <span className="font-bold text-slate-900">{regularStats.total}</span> 个任务</span>
                <span className="flex items-center text-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {regularStats.completed}
                </span>
                {regularStats.failed > 0 && (
                  <span className="flex items-center text-rose-500">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {regularStats.failed}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cloud-card p-4 border-l-4 border-l-primary/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">总任务数</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{currentStats.total}</p>
            </div>
            <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">已完成</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{currentStats.completed}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">运行中</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{currentStats.running}</p>
            </div>
            <div className="h-10 w-10 bg-sky-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">失败</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{currentStats.failed}</p>
            </div>
            <div className="h-10 w-10 bg-rose-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="cloud-card p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
            <Input
              placeholder={activeTab === "agent" ? "搜索Agent任务名称..." : "搜索项目名称或任务类型..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200 focus:ring-primary/20"
            />
          </div>
          {activeTab === "regular" && (
            <Button className="bg-primary hover:bg-primary/90 h-10 shadow-sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建任务
            </Button>
          )}
          {activeTab === "agent" && (
            <Button className="bg-primary hover:bg-primary/90 h-10 shadow-sm" onClick={() => navigate("/")}>
              <Bot className="w-4 h-4 mr-2" />
              新建Agent审计
            </Button>
          )}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Button
              size="sm"
              onClick={() => setStatusFilter("all")}
              variant={statusFilter === "all" ? "default" : "outline"}
              className={statusFilter === "all" ? "bg-slate-800 text-white hover:bg-slate-700" : "border-slate-200 text-slate-600"}
            >
              全部
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter("running")}
              variant={statusFilter === "running" ? "default" : "outline"}
              className={statusFilter === "running" ? "bg-sky-500 text-white hover:bg-sky-600" : "border-slate-200 text-slate-600"}
            >
              运行中
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter("completed")}
              variant={statusFilter === "completed" ? "default" : "outline"}
              className={statusFilter === "completed" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "border-slate-200 text-slate-600"}
            >
              已完成
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter("failed")}
              variant={statusFilter === "failed" ? "default" : "outline"}
              className={statusFilter === "failed" ? "bg-rose-500 text-white hover:bg-rose-600" : "border-slate-200 text-slate-600"}
            >
              失败
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Task List */}
      {activeTab === "agent" && (
        <div className="space-y-4">
          {filteredAgentTasks.length > 0 ? (
            filteredAgentTasks.map((task) => (
              <div key={task.id} className="cloud-card p-6 hover:shadow-md transition-shadow">
                {/* Task Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-50' :
                      task.status === 'running' ? 'bg-sky-50' :
                        task.status === 'failed' ? 'bg-rose-50' :
                          'bg-slate-100'
                      }`}>
                      <Bot className={`w-6 h-6 ${task.status === 'completed' ? 'text-emerald-500' :
                        task.status === 'running' ? 'text-sky-500' :
                          task.status === 'failed' ? 'text-rose-500' :
                            'text-slate-400'
                        }`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">
                        {task.name || 'Agent审计任务'}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {task.current_phase || task.task_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(task.status)}
                    {task.status === 'running' && (
                      <div className="flex items-center gap-1.5 text-sky-500">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500/80"></span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-slate-700">{task.total_files}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">文件数</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-slate-700">{task.analyzed_files}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">已分析</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-amber-500">{task.findings_count}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">发现问题</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-sky-500">{task.tool_calls_count || 0}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">工具调用</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-primary">{task.security_score?.toFixed(1) || '-'}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">安全评分</p>
                  </div>
                </div>

                {/* Severity Distribution */}
                {task.findings_count > 0 && (
                  <div className="flex gap-4 mb-4 text-xs font-medium">
                    {task.critical_count > 0 && (
                      <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded">Critical: {task.critical_count}</span>
                    )}
                    {task.high_count > 0 && (
                      <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">High: {task.high_count}</span>
                    )}
                    {task.medium_count > 0 && (
                      <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">Medium: {task.medium_count}</span>
                    )}
                    {task.low_count > 0 && (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Low: {task.low_count}</span>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">审计进度</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {task.analyzed_files || 0} / {task.total_files || 0} 文件
                    </span>
                  </div>
                  <Progress
                    value={task.progress_percentage || 0}
                    className="h-2 bg-slate-100"
                  />
                  <div className="text-right mt-1">
                    <span className="text-xs text-slate-400 font-medium">
                      {(task.progress_percentage || 0).toFixed(0)}% 完成
                    </span>
                  </div>
                </div>

                {/* Task Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-6 text-xs text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {formatDate(task.created_at)}
                    </div>
                    {task.completed_at && (
                      <div className="flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        {formatDate(task.completed_at)}
                      </div>
                    )}
                    {task.tokens_used > 0 && (
                      <div className="flex items-center text-slate-400">
                        <span>{task.tokens_used.toLocaleString()} tokens</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {(task.status === 'running' || task.status === 'pending') && (
                      <>
                        <Link to={`/agent-audit/${task.id}`}>
                          <Button size="sm" className="h-8 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:text-sky-700 border border-sky-200">
                            <Terminal className="w-3.5 h-3.5 mr-1.5" />
                            查看实时流
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleCancelAgentTask(task.id)}
                          disabled={cancellingAgentTaskId === task.id}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          {cancellingAgentTaskId === task.id ? '取消中...' : '取消'}
                        </Button>
                      </>
                    )}
                    <Link to={`/agent-audit/${task.id}`}>
                      <Button size="sm" variant="outline" className="h-8 border-slate-200">
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="cloud-card p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter !== "all" ? '未找到匹配的Agent任务' : '暂无Agent审计任务'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || statusFilter !== "all" ? '尝试调整搜索条件或筛选器' : '创建第一个Agent审计任务开始智能安全审计'}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
                  <Bot className="w-4 h-4 mr-2" />
                  创建Agent审计
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Regular Task List */}
      {activeTab === "regular" && (
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div key={task.id} className="cloud-card p-6 hover:shadow-md transition-shadow">
                {/* Task Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-50' :
                      task.status === 'running' ? 'bg-sky-50' :
                        task.status === 'failed' ? 'bg-rose-50' :
                          'bg-slate-100'
                      }`}>
                      {getStatusIcon(task.status)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">
                        {task.project?.name || '未知项目'}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {task.task_type === 'repository' ? '仓库审计任务' : '即时分析任务'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(task.status)}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-slate-700">{task.total_files}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">文件数</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-slate-700">{task.total_lines.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">代码行数</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-amber-500">{task.issues_count}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">发现问题</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xl font-bold text-primary">{task.quality_score.toFixed(1)}</p>
                    <p className="text-xs text-slate-500 uppercase font-medium">质量评分</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">扫描进度</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {task.scanned_files || 0} / {task.total_files || 0} 文件
                    </span>
                  </div>
                  <Progress
                    value={calculateTaskProgress(task)}
                    className="h-2 bg-slate-100"
                  />
                </div>

                {/* Task Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-6 text-xs text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {formatDate(task.created_at)}
                    </div>
                    {task.completed_at && (
                      <div className="flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        {formatDate(task.completed_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {(task.status === 'running' || task.status === 'pending') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleCancelTask(task.id)}
                        disabled={cancellingTaskId === task.id}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        {cancellingTaskId === task.id ? '取消中...' : '取消'}
                      </Button>
                    )}
                    <Link to={`/tasks/${task.id}`}>
                      <Button size="sm" variant="outline" className="h-8 border-slate-200">
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="cloud-card p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter !== "all" ? '未找到匹配的普通任务' : '暂无普通审计任务'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || statusFilter !== "all" ? '尝试调整搜索条件或筛选器' : '创建第一个普通任务开始代码扫描'}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建任务
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreated={loadTasks}
      />
    </div>
  );
}
