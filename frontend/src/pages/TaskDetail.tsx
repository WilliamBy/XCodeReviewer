/**
 * Task Detail Page
 * Cyberpunk Terminal Aesthetic
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  GitBranch,
  Shield,
  Bug,
  TrendingUp,
  Download,
  Code,
  Lightbulb,
  Info,
  Zap,
  XCircle,
  Terminal
} from "lucide-react";
import { api } from "@/shared/config/database";
import type { AuditTask, AuditIssue } from "@/shared/types";
import { toast } from "sonner";
import ExportReportDialog from "@/components/reports/ExportReportDialog";
import { calculateTaskProgress } from "@/shared/utils/utils";
import { isRepositoryProject, getSourceTypeLabel } from "@/shared/utils/projectUtils";

// AI explanation parser
function parseAIExplanation(aiExplanation: string) {
  try {
    const parsed = JSON.parse(aiExplanation);
    if (parsed.xai) {
      return parsed.xai;
    }
    if (parsed.what || parsed.why || parsed.how) {
      return parsed;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Issues List Component
// Issues List Component
function IssuesList({ issues }: { issues: AuditIssue[] }) {
  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'high': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'low': return 'bg-sky-50 text-sky-600 border-sky-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'bug': return <AlertTriangle className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'style': return <Code className="w-4 h-4" />;
      case 'maintainability': return <FileText className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const criticalIssues = issues.filter(issue => issue.severity === 'critical');
  const highIssues = issues.filter(issue => issue.severity === 'high');
  const mediumIssues = issues.filter(issue => issue.severity === 'medium');
  const lowIssues = issues.filter(issue => issue.severity === 'low');

  const renderIssue = (issue: AuditIssue, index: number) => (
    <div key={issue.id || index} className="cloud-card p-4 hover:border-blue-200 transition-all group border border-slate-200 shadow-sm rounded-lg bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${issue.severity === 'critical' ? 'bg-rose-50 text-rose-500' :
            issue.severity === 'high' ? 'bg-orange-50 text-orange-500' :
              issue.severity === 'medium' ? 'bg-amber-50 text-amber-500' :
                'bg-sky-50 text-sky-500'
            }`}>
            {getTypeIcon(issue.issue_type)}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base text-slate-900 mb-1 group-hover:text-primary transition-colors">{issue.title}</h4>
            <div className="flex items-center space-x-1 text-xs text-slate-500 font-mono">
              <FileText className="w-3 h-3" />
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{issue.file_path}</span>
            </div>
            {issue.line_number && (
              <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1 font-mono">
                <span className="text-primary">&gt;</span>
                <span>LINE: {issue.line_number}</span>
                {issue.column_number && <span>, COL: {issue.column_number}</span>}
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`${getSeverityClasses(issue.severity)} font-bold px-2 py-1 rounded text-[11px] border`}>
          {issue.severity === 'critical' ? '严重' :
            issue.severity === 'high' ? '高' :
              issue.severity === 'medium' ? '中等' : '低'}
        </Badge>
      </div>

      {issue.description && (
        <div className="bg-slate-50 border border-slate-100 p-3 mb-3 rounded-lg">
          <div className="flex items-center mb-1 border-b border-slate-200 pb-1">
            <Info className="w-3 h-3 text-slate-400 mr-1" />
            <span className="font-bold text-slate-500 text-xs">问题详情</span>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed mt-1">
            {issue.description}
          </p>
        </div>
      )}

      {issue.code_snippet && (
        <div className="bg-slate-900 p-3 mb-3 border border-slate-800 rounded-lg shadow-inner">
          <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-1">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                <Code className="w-2 h-2 text-primary" />
              </div>
              <span className="text-slate-400 text-xs font-bold font-mono uppercase">Code Snippet</span>
            </div>
            {issue.line_number && (
              <span className="text-slate-500 text-xs font-mono">LINE: {issue.line_number}</span>
            )}
          </div>
          <div className="bg-black/30 p-2 border border-slate-800 rounded">
            <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
              <code>{issue.code_snippet}</code>
            </pre>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {issue.suggestion && (
          <div className="bg-sky-50 border border-sky-100 p-3 rounded-lg">
            <div className="flex items-center mb-2 border-b border-sky-100 pb-1">
              <div className="w-5 h-5 bg-sky-100 rounded flex items-center justify-center mr-2">
                <Lightbulb className="w-3 h-3 text-sky-600" />
              </div>
              <span className="font-bold text-sky-700 text-sm">修复建议</span>
            </div>
            <p className="text-sky-800 text-xs leading-relaxed font-mono">{issue.suggestion}</p>
          </div>
        )}

        {issue.ai_explanation && (() => {
          const parsedExplanation = parseAIExplanation(issue.ai_explanation);

          if (parsedExplanation) {
            return (
              <div className="bg-violet-50 border border-violet-100 p-3 rounded-lg">
                <div className="flex items-center mb-2 border-b border-violet-100 pb-1">
                  <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center mr-2">
                    <Zap className="w-3 h-3 text-violet-600" />
                  </div>
                  <span className="font-bold text-violet-700 text-sm">AI 解释</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {parsedExplanation.what && (
                    <div className="border-l-2 border-rose-400 pl-2">
                      <span className="font-bold text-rose-600">问题：</span>
                      <span className="text-slate-700 ml-1">{parsedExplanation.what}</span>
                    </div>
                  )}

                  {parsedExplanation.why && (
                    <div className="border-l-2 border-amber-400 pl-2">
                      <span className="font-bold text-amber-600">原因：</span>
                      <span className="text-slate-700 ml-1">{parsedExplanation.why}</span>
                    </div>
                  )}

                  {parsedExplanation.how && (
                    <div className="border-l-2 border-emerald-400 pl-2">
                      <span className="font-bold text-emerald-600">方案：</span>
                      <span className="text-slate-700 ml-1">{parsedExplanation.how}</span>
                    </div>
                  )}

                  {parsedExplanation.learn_more && (
                    <div className="border-l-2 border-sky-400 pl-2">
                      <span className="font-bold text-sky-600">链接：</span>
                      <a
                        href={parsedExplanation.learn_more}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-500 hover:underline ml-1 font-bold"
                      >
                        {parsedExplanation.learn_more}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            return (
              <div className="bg-violet-50 border border-violet-100 p-3 rounded-lg">
                <div className="flex items-center mb-2 border-b border-violet-100 pb-1">
                  <Zap className="w-4 h-4 text-violet-600 mr-2" />
                  <span className="font-bold text-violet-700 text-sm">AI 解释</span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed font-mono">{issue.ai_explanation}</p>
              </div>
            );
          }
        })()}
      </div>
    </div>
  );

  if (issues.length === 0) {
    return (
      <div className="cloud-card p-16 text-center border-dashed border-slate-300 bg-slate-50/50">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-emerald-600 mb-2">代码质量优秀！</h3>
        <p className="text-emerald-600/80 mb-4">恭喜！没有发现任何问题</p>
        <div className="bg-emerald-50 border border-emerald-100 p-4 max-w-md mx-auto rounded-lg">
          <p className="text-emerald-700 text-sm">
            您的代码通过了所有质量检查，包括安全性、性能、可维护性等各个方面的评估。
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full grid-cols-5 bg-slate-100 border border-slate-200 p-1 h-auto gap-1 rounded-lg">
        <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-bold py-2 text-slate-500 transition-all rounded text-xs">
          全部 ({issues.length})
        </TabsTrigger>
        <TabsTrigger value="critical" className="data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600 data-[state=active]:border-rose-200 font-bold py-2 text-slate-500 transition-all rounded text-xs">
          严重 ({criticalIssues.length})
        </TabsTrigger>
        <TabsTrigger value="high" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600 data-[state=active]:border-orange-200 font-bold py-2 text-slate-500 transition-all rounded text-xs">
          高 ({highIssues.length})
        </TabsTrigger>
        <TabsTrigger value="medium" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 data-[state=active]:border-amber-200 font-bold py-2 text-slate-500 transition-all rounded text-xs">
          中等 ({mediumIssues.length})
        </TabsTrigger>
        <TabsTrigger value="low" className="data-[state=active]:bg-sky-50 data-[state=active]:text-sky-600 data-[state=active]:border-sky-200 font-bold py-2 text-slate-500 transition-all rounded text-xs">
          低 ({lowIssues.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4 mt-6">
        {issues.map((issue, index) => renderIssue(issue, index))}
      </TabsContent>

      <TabsContent value="critical" className="space-y-4 mt-6">
        {criticalIssues.length > 0 ? (
          criticalIssues.map((issue, index) => renderIssue(issue, index))
        ) : (
          <div className="cloud-card p-12 text-center border-dashed border-slate-200 bg-slate-50/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">没有发现严重问题</h3>
            <p className="text-slate-500">代码在严重级别的检查中表现良好</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="high" className="space-y-4 mt-6">
        {highIssues.length > 0 ? (
          highIssues.map((issue, index) => renderIssue(issue, index))
        ) : (
          <div className="cloud-card p-12 text-center border-dashed border-slate-200 bg-slate-50/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">没有发现高优先级问题</h3>
            <p className="text-slate-500">代码在高优先级检查中表现良好</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="medium" className="space-y-4 mt-6">
        {mediumIssues.length > 0 ? (
          mediumIssues.map((issue, index) => renderIssue(issue, index))
        ) : (
          <div className="cloud-card p-12 text-center border-dashed border-slate-200 bg-slate-50/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">没有发现中等优先级问题</h3>
            <p className="text-slate-500">代码在中等优先级检查中表现良好</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="low" className="space-y-4 mt-6">
        {lowIssues.length > 0 ? (
          lowIssues.map((issue, index) => renderIssue(issue, index))
        ) : (
          <div className="cloud-card p-12 text-center border-dashed border-slate-200 bg-slate-50/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">没有发现低优先级问题</h3>
            <p className="text-slate-500">代码在低优先级检查中表现良好</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<AuditTask | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Zombie task detection
  const [lastProgressTime, setLastProgressTime] = useState<number>(Date.now());
  const [lastProgress, setLastProgress] = useState<number>(0);
  const ZOMBIE_TIMEOUT = 180000;

  useEffect(() => {
    if (id) {
      loadTaskDetail();
    }
  }, [id]);

  // Silent progress update for running tasks
  useEffect(() => {
    if (!task || !id) {
      return;
    }

    if (task.status === 'running' || task.status === 'pending') {
      const intervalId = setInterval(async () => {
        try {
          const [taskData, issuesData] = await Promise.all([
            api.getAuditTaskById(id),
            api.getAuditIssues(id)
          ]);

          if (!taskData) {
            console.error('任务数据获取失败');
            return;
          }

          const currentProgress = taskData.scanned_files || 0;
          if (currentProgress !== lastProgress) {
            setLastProgress(currentProgress);
            setLastProgressTime(Date.now());
          } else if (taskData.status === 'running' && Date.now() - lastProgressTime > ZOMBIE_TIMEOUT) {
            toast.warning("任务可能已停止响应，建议取消后重试", {
              id: 'zombie-warning',
              duration: 10000,
            });
          }

          if (
            taskData.status !== task.status ||
            taskData.scanned_files !== task.scanned_files ||
            taskData.issues_count !== task.issues_count
          ) {
            setTask(taskData);
            setIssues(issuesData);

            if (['completed', 'failed', 'cancelled'].includes(taskData.status)) {
              clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error('静默更新任务失败:', error);
          toast.error("获取任务状态失败，请检查网络连接", {
            id: 'network-error',
            duration: 5000,
          });
        }
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [task?.status, task?.scanned_files, id, lastProgress, lastProgressTime]);

  const handleCancelTask = async () => {
    if (!id || cancelling) return;

    try {
      setCancelling(true);
      await api.cancelAuditTask(id);
      toast.success("任务已取消");
      const taskData = await api.getAuditTaskById(id);
      if (taskData) {
        setTask(taskData);
      }
    } catch (error: any) {
      console.error('取消任务失败:', error);
      toast.error(error?.response?.data?.detail || "取消任务失败");
    } finally {
      setCancelling(false);
    }
  };

  const loadTaskDetail = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [taskData, issuesData] = await Promise.all([
        api.getAuditTaskById(id),
        api.getAuditIssues(id)
      ]);

      setTask(taskData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Failed to load task detail:', error);
      toast.error("加载任务详情失败");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">完成</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">运行中</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">失败</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-slate-500">已取消</Badge>;
      default:
        return <Badge variant="secondary" className="text-slate-500">等待中</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Activity className="w-4 h-4 text-blue-500" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium text-sm">加载任务详情...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans">
        <div className="flex items-center space-x-4">
          <Link to="/audit-tasks">
            <Button variant="outline" size="sm" className="h-10 w-10 p-0 bg-white hover:bg-slate-50 border-slate-200">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
        </div>
        <div className="cloud-card p-16 text-center shadow-lg border-slate-200">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">任务不存在</h3>
          <p className="text-slate-500">请检查任务ID是否正确</p>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateTaskProgress(task.scanned_files, task.total_files);

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/audit-tasks">
            <Button variant="outline" size="sm" className="h-10 w-10 p-0 bg-white hover:bg-slate-100 border-slate-200 shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">任务详情</h1>
            <p className="text-sm text-slate-500 mt-1">查看审计任务的详细分析结果</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getStatusBadge(task.status)}

          {(task.status === 'running' || task.status === 'pending') && (
            <Button
              size="sm"
              variant="destructive"
              className="h-9 shadow-sm"
              onClick={handleCancelTask}
              disabled={cancelling}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {cancelling ? '取消中...' : '取消任务'}
            </Button>
          )}

          {task.status === 'completed' && (
            <Button
              size="sm"
              className="h-9 bg-primary hover:bg-primary/90 shadow-sm"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cloud-card p-5 bg-white border-slate-200 shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <p className="text-sm font-medium text-slate-500 mb-1">扫描进度</p>
              <p className="text-2xl font-bold text-slate-900 mb-2">{progressPercentage}%</p>
              <Progress value={progressPercentage} className="h-1.5 bg-slate-100 [&>div]:bg-primary" />
            </div>
            <div className="p-2 bg-blue-50 rounded-lg ml-4">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-5 bg-white border-slate-200 shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">发现问题</p>
              <p className="text-2xl font-bold text-slate-900">{task.issues_count}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Bug className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-5 bg-white border-slate-200 shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">质量评分</p>
              <p className="text-2xl font-bold text-slate-900">{task.quality_score.toFixed(1)}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-5 bg-white border-slate-200 shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">代码行数</p>
              <p className="text-2xl font-bold text-slate-900">{task.total_lines.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-violet-50 rounded-lg">
              <FileText className="w-6 h-6 text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Task Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="cloud-card p-0 bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-slate-900">任务信息</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">任务类型</p>
                  <p className="text-base font-medium text-slate-700">
                    {task.task_type === 'repository' ? '仓库审计任务' : '即时分析任务'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">目标分支</p>
                  <p className="text-base font-medium text-slate-700 flex items-center">
                    <GitBranch className="w-4 h-4 mr-1 text-slate-400" />
                    {task.branch_name || '默认分支'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">创建时间</p>
                  <p className="text-base font-medium text-slate-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                    {formatDate(task.created_at)}
                  </p>
                </div>
                {task.completed_at && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">完成时间</p>
                    <p className="text-base font-medium text-slate-700 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-emerald-500" />
                      {formatDate(task.completed_at)}
                    </p>
                  </div>
                )}
              </div>

              {task.exclude_patterns && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">排除模式</p>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(task.exclude_patterns).map((pattern: string) => (
                      <Badge key={pattern} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {task.scan_config && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">扫描配置</p>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg shadow-sm">
                    <pre className="text-xs text-slate-600 font-mono overflow-x-auto">
                      {JSON.stringify(JSON.parse(task.scan_config), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="cloud-card p-0 bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-slate-900">项目信息</h3>
            </div>
            <div className="p-6 space-y-6">
              {task.project ? (
                <>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">项目名称</p>
                    <Link to={`/projects/${task.project.id}`} className="text-base font-bold text-primary hover:underline hover:text-primary/80 transition-colors">
                      {task.project.name}
                    </Link>
                  </div>
                  {task.project.description && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">项目描述</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{task.project.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">项目类型</p>
                    <p className="text-base font-medium text-slate-700">{getSourceTypeLabel(task.project.source_type)}</p>
                  </div>
                  {isRepositoryProject(task.project) && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">仓库平台</p>
                      <p className="text-base font-medium text-slate-700">{task.project.repository_type?.toUpperCase() || 'OTHER'}</p>
                    </div>
                  )}
                  {task.project.programming_languages && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">编程语言</p>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(task.project.programming_languages).map((lang: string) => (
                          <Badge key={lang} variant="outline" className="bg-white text-primary border-blue-200">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400">项目信息不可用</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length > 0 && (
        <div className="cloud-card p-0 bg-white border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Bug className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">发现的问题 ({issues.length})</h3>
          </div>
          <div className="p-6">
            <IssuesList issues={issues} />
          </div>
        </div>
      )}

      {/* Export Report Dialog */}
      {task && (
        <ExportReportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          task={task}
          issues={issues}
        />
      )}
    </div>
  );
}
