/**
 * Project Detail Page
 * Corporate Blue Theme
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Code,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  FileText,
  Upload,
  GitBranch,
  Terminal,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "@/shared/config/database";
import { runRepositoryAudit, scanStoredZipFile } from "@/features/projects/services";
import type { Project, AuditTask, CreateProjectForm } from "@/shared/types";
import { hasZipFile } from "@/shared/utils/zipStorage";
import { isRepositoryProject, getSourceTypeLabel } from "@/shared/utils/projectUtils";
import { toast } from "sonner";
import CreateTaskDialog from "@/components/audit/CreateTaskDialog";
import FileSelectionDialog from "@/components/audit/FileSelectionDialog";
import TerminalProgressDialog from "@/components/audit/TerminalProgressDialog";
import { SUPPORTED_LANGUAGES } from "@/shared/constants";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [showTerminalDialog, setShowTerminalDialog] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateProjectForm>({
    name: "",
    description: "",
    source_type: "repository",
    repository_url: "",
    repository_type: "github",
    default_branch: "main",
    programming_languages: [],
    design_doc_path: ""
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [latestIssues, setLatestIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  const [showFileSelectionDialog, setShowFileSelectionDialog] = useState(false);
  const [showAuditOptionsDialog, setShowAuditOptionsDialog] = useState(false);
  const [hasZipFile, setHasZipFile] = useState(false);
  const [zipFileList, setZipFileList] = useState<Array<{ path: string; size: number }>>([]);
  const [loadingZipFiles, setLoadingZipFiles] = useState(false);

  useEffect(() => {
    if (activeTab === 'issues' && tasks.length > 0) {
      loadLatestIssues();
    }
  }, [activeTab, tasks]);

  const loadLatestIssues = async () => {
    const completedTasks = tasks.filter(t => t.status === 'completed').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (completedTasks.length > 0) {
      setLoadingIssues(true);
      try {
        const issues = await api.getAuditIssues(completedTasks[0].id);
        setLatestIssues(issues);
      } catch (error) {
        console.error('Failed to load issues:', error);
        toast.error("加载问题列表失败");
      } finally {
        setLoadingIssues(false);
      }
    }
  };

  const handleOpenSettings = () => {
    if (!project) return;

    setEditForm({
      name: project.name,
      description: project.description || "",
      source_type: project.source_type || "repository",
      repository_url: project.repository_url || "",
      repository_type: project.repository_type || "github",
      default_branch: project.default_branch || "main",
      programming_languages: project.programming_languages ? JSON.parse(project.programming_languages) : [],
      design_doc_path: project.design_doc_path || ""
    });

    setActiveTab("settings");
  };

  const formatLanguageName = (lang: string): string => {
    const nameMap: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'java': 'Java',
      'go': 'Go',
      'rust': 'Rust',
      'cpp': 'C++',
      'csharp': 'C#',
      'php': 'PHP',
      'ruby': 'Ruby',
      'swift': 'Swift',
      'kotlin': 'Kotlin'
    };
    return nameMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  const supportedLanguages = SUPPORTED_LANGUAGES.map(formatLanguageName);

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  // Check ZIP file and load file list for ZIP projects
  useEffect(() => {
    const checkZipFileAndLoadFiles = async () => {
      if (!project || project.source_type !== 'zip' || !id) {
        setHasZipFile(false);
        setZipFileList([]);
        return;
      }

      try {
        setLoadingZipFiles(true);
        const hasFile = await hasZipFile(id);
        setHasZipFile(hasFile);

        if (hasFile) {
          // Load file list from ZIP
          const files = await api.getProjectFiles(id, undefined, ['node_modules/**', '.git/**', 'dist/**', 'build/**']);
          setZipFileList(files);
        } else {
          setZipFileList([]);
        }
      } catch (error) {
        console.error('Failed to check ZIP file or load files:', error);
        setHasZipFile(false);
        setZipFileList([]);
      } finally {
        setLoadingZipFiles(false);
      }
    };

    checkZipFileAndLoadFiles();
  }, [project?.id, project?.source_type, id]);

  const loadProjectData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [projectData, tasksData] = await Promise.all([
        api.getProjectById(id),
        api.getAuditTasks(id)
      ]);

      setProject(projectData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load project data:', error);
      toast.error("加载项目数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = () => {
    setShowAuditOptionsDialog(true);
  };

  const handleStartFullAudit = () => {
    setShowAuditOptionsDialog(false);
    startAudit(undefined);
  };

  const handleOpenCustomAudit = () => {
    setShowAuditOptionsDialog(false);
    setShowFileSelectionDialog(true);
  };

  const handleStartCustomAudit = (files: string[]) => {
    startAudit(files);
  };

  const startAudit = async (filePaths?: string[]) => {
    if (!project || !id) return;

    if (project.repository_url) {
      try {
        setScanning(true);
        console.log('开始启动仓库审计任务...', filePaths ? `指定 ${filePaths.length} 个文件` : '全量扫描');
        const taskId = await runRepositoryAudit({
          projectId: id,
          repoUrl: project.repository_url,
          branch: project.default_branch || 'main',
          createdBy: undefined,
          filePaths: filePaths
        });

        console.log('审计任务创建成功，taskId:', taskId);

        setCurrentTaskId(taskId);
        setShowTerminalDialog(true);

        loadProjectData();
      } catch (e: any) {
        console.error('启动审计失败:', e);
        toast.error(e?.message || '启动审计失败');
      } finally {
        setScanning(false);
      }
    } else {
      try {
        setScanning(true);
        const hasFile = await hasZipFile(id);

        if (hasFile) {
          console.log('找到后端存储的ZIP文件，开始启动审计...', filePaths ? `指定 ${filePaths.length} 个文件` : '全量扫描');
          try {
            const taskId = await scanStoredZipFile({
              projectId: id,
              excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
              createdBy: 'local-user',
              filePaths: filePaths
            });

            console.log('审计任务创建成功，taskId:', taskId);

            setCurrentTaskId(taskId);
            setShowTerminalDialog(true);

            loadProjectData();
          } catch (e: any) {
            console.error('启动审计失败:', e);
            toast.error(e?.message || '启动审计失败');
          } finally {
            setScanning(false);
          }
        } else {
          setScanning(false);
          toast.warning('此项目未配置仓库地址，也未上传ZIP文件。请先在项目设置中配置仓库地址，或通过"新建任务"上传ZIP文件。');
        }
      } catch (error) {
        console.error('启动审计失败:', error);
        setScanning(false);
        toast.error('读取ZIP文件失败，请检查项目配置');
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!id) return;

    if (!editForm.name.trim()) {
      toast.error("项目名称不能为空");
      return;
    }

    try {
      // Prepare update data, convert empty string to undefined for optional fields
      const updateData = {
        ...editForm,
        design_doc_path: editForm.design_doc_path?.trim() || undefined
      };
      await api.updateProject(id, updateData);
      toast.success("项目信息已保存");
      loadProjectData();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error("保存失败");
    }
  };

  const handleToggleLanguage = (lang: string) => {
    const currentLanguages = editForm.programming_languages || [];
    const newLanguages = currentLanguages.includes(lang)
      ? currentLanguages.filter(l => l !== lang)
      : [...currentLanguages, lang];

    setEditForm({ ...editForm, programming_languages: newLanguages });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100">完成</Badge>;
      case 'running':
        return <Badge className="bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100">运行中</Badge>;
      case 'failed':
        return <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100">失败</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-500 border-slate-200">等待中</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Activity className="w-4 h-4 text-sky-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
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

  const handleCreateTask = () => {
    setShowCreateTaskDialog(true);
  };

  const handleTaskCreated = () => {
    toast.success("审计任务已创建", {
      description: '因为网络和代码文件大小等因素，审计时长通常至少需要1分钟，请耐心等待...',
      duration: 5000
    });
    loadProjectData();
  };

  const handleFastScanStarted = (taskId: string) => {
    setCurrentTaskId(taskId);
    setShowTerminalDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner text-primary mx-auto" />
          <p className="text-slate-500 font-sans text-sm uppercase tracking-wider">加载项目数据...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="cloud-card p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2 uppercase">项目未找到</h2>
          <p className="text-slate-500 mb-4">请检查项目ID是否正确</p>
          <Link to="/projects">
            <Button variant="outline" className="border-slate-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回项目列表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 to-slate-50" />
      </div>

      {/* 顶部操作栏 */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/projects">
            <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-500 h-10 w-10 p-0 flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
            <Badge variant="outline" className={`${project.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {project.is_active ? '活跃' : '暂停'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button onClick={handleRunAudit} disabled={scanning} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
            <Shield className="w-4 h-4 mr-2" />
            {scanning ? '正在启动...' : '启动审计'}
          </Button>
          <Button variant="outline" onClick={handleOpenSettings} className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm">
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <div className="cloud-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">审计任务</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">已完成</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{tasks.filter(t => t.status === 'completed').length}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">发现问题</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{tasks.reduce((sum, task) => sum + task.issues_count, 0)}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">平均质量分</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {tasks.length > 0
                  ? (tasks.reduce((sum, task) => sum + task.quality_score, 0) / tasks.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Code className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-slate-200 p-1 h-auto gap-1 rounded-lg">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-semibold py-2.5 text-slate-500 transition-all rounded-md">项目概览</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-semibold py-2.5 text-slate-500 transition-all rounded-md">审计任务</TabsTrigger>
          <TabsTrigger value="issues" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-semibold py-2.5 text-slate-500 transition-all rounded-md">问题管理</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-semibold py-2.5 text-slate-500 transition-all rounded-md">项目设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 项目信息 */}
            <div className="cloud-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">项目信息</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-3">
                  {project.repository_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 font-medium">仓库地址</span>
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center font-bold"
                      >
                        查看仓库
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">项目类型</span>
                    <Badge variant="outline" className={`${isRepositoryProject(project) ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {getSourceTypeLabel(project.source_type)}
                    </Badge>
                  </div>

                  {isRepositoryProject(project) && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">仓库平台</span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                          {project.repository_type === 'github' ? 'GitHub' :
                            project.repository_type === 'gitlab' ? 'GitLab' : '其他'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">默认分支</span>
                        <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{project.default_branch}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">创建时间</span>
                    <span className="text-sm text-slate-900">{formatDate(project.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">所有者</span>
                    <span className="text-sm text-slate-900">{project.owner?.full_name || project.owner?.phone || '未知'}</span>
                  </div>
                </div>

                {project.programming_languages && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold mb-2 text-slate-500">支持的编程语言</h4>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(project.programming_languages).map((lang: string) => (
                        <Badge key={lang} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 最近活动 */}
            <div className="cloud-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-800">最近活动</h3>
              </div>
              <div>
                {tasks.length > 0 ? (
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 hover:border-slate-200 transition-all group shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-50' :
                            task.status === 'running' ? 'bg-sky-50' :
                              task.status === 'failed' ? 'bg-rose-50' :
                                'bg-slate-50'
                            }`}>
                            {getStatusIcon(task.status)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                              {task.task_type === 'repository' ? '仓库审计' : '即时分析'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(task.created_at)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(task.status)}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">暂无活动记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="flex flex-col gap-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-800">审计任务列表</h3>
            </div>
            <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Play className="w-4 h-4 mr-2" />
              新建任务
            </Button>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="cloud-card p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-50' :
                        task.status === 'running' ? 'bg-sky-50' :
                          task.status === 'failed' ? 'bg-rose-50' :
                            'bg-slate-50'
                        }`}>
                        {getStatusIcon(task.status)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">
                          {task.task_type === 'repository' ? '仓库审计任务' : '即时分析任务'}
                        </h4>
                        <p className="text-sm text-slate-500">
                          创建于 {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-2xl font-bold text-slate-900">{task.total_files}</p>
                      <p className="text-xs text-slate-500 font-medium uppercase">总文件数</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-2xl font-bold text-slate-900">{task.total_lines}</p>
                      <p className="text-xs text-slate-500 font-medium uppercase">代码行数</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-2xl font-bold text-amber-600">{task.issues_count}</p>
                      <p className="text-xs text-amber-600/80 font-medium uppercase">发现问题</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-2xl font-bold text-indigo-600">{task.quality_score.toFixed(1)}</p>
                      <p className="text-xs text-indigo-600/80 font-medium uppercase">质量评分</p>
                    </div>
                  </div>

                  {task.status === 'completed' && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">质量评分</span>
                        <span className="text-slate-900 font-bold">{task.quality_score.toFixed(1)}/100</span>
                      </div>
                      <Progress value={task.quality_score} className="h-2 bg-slate-100 [&>div]:bg-primary" />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                    <Link to={`/tasks/${task.id}`}>
                      <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200">
                        <FileText className="w-4 h-4 mr-2" />
                        查看详情
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cloud-card p-12 text-center">
              <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">暂无审计任务</h3>
              <p className="text-sm text-slate-500 mb-6">创建第一个审计任务开始代码质量分析</p>
              <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                <Play className="w-4 h-4 mr-2" />
                创建任务
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="issues" className="flex flex-col gap-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">最新发现的问题</h3>
            </div>
            {tasks.length > 0 && (
              <p className="text-sm text-slate-500">
                来自最近一次审计 ({formatDate(tasks[0].created_at)})
              </p>
            )}
          </div>

          {loadingIssues ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-slate-500">正在加载问题列表...</p>
            </div>
          ) : latestIssues.length > 0 ? (
            <div className="space-y-4">
              {latestIssues.map((issue, index) => (
                <div key={index} className="cloud-card p-4 hover:border-blue-200 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${issue.severity === 'critical' ? 'bg-rose-50 text-rose-500' :
                        issue.severity === 'high' ? 'bg-orange-50 text-orange-500' :
                          issue.severity === 'medium' ? 'bg-amber-50 text-amber-500' :
                            'bg-sky-50 text-sky-500'
                        }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 mb-1">{issue.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{issue.file_path}:{issue.line_number}</span>
                          <span>{issue.category}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`
                      ${issue.severity === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                        issue.severity === 'high' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          issue.severity === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-sky-50 text-sky-600 border-sky-200'}
                      font-medium px-2 py-1 rounded text-[11px]
                    `}>
                      {issue.severity === 'critical' ? '严重' :
                        issue.severity === 'high' ? '高' :
                          issue.severity === 'medium' ? '中等' : '低'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 border-t border-slate-100 pt-3">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="cloud-card p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">未发现问题</h3>
              <p className="text-sm text-slate-500">最近一次审计未发现明显问题，或尚未进行审计。</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="flex flex-col gap-6 mt-6">
          <div className="cloud-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Edit className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-800">编辑项目配置</h3>
            </div>

            <div className="flex flex-col gap-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name" className="font-medium text-slate-700">项目名称 *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="输入项目名称"
                    className="mt-1 border-slate-200 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description" className="font-medium text-slate-700">项目描述</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="输入项目描述"
                    rows={3}
                    className="mt-1 min-h-[80px] border-slate-200 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* 仓库信息 - 仅远程仓库类型显示 */}
              {editForm.source_type === 'repository' && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <h3 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    仓库信息
                  </h3>

                  <div>
                    <Label htmlFor="edit-repo-url" className="font-medium text-slate-700">仓库地址</Label>
                    <Input
                      id="edit-repo-url"
                      value={editForm.repository_url}
                      onChange={(e) => setEditForm({ ...editForm, repository_url: e.target.value })}
                      placeholder="https://github.com/username/repo"
                      className="mt-1 border-slate-200 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-repo-type" className="font-medium text-slate-700">仓库平台</Label>
                      <Select
                        value={editForm.repository_type}
                        onValueChange={(value: any) => setEditForm({ ...editForm, repository_type: value })}
                      >
                        <SelectTrigger id="edit-repo-type" className="mt-1 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="github">GitHub</SelectItem>
                          <SelectItem value="gitlab">GitLab</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-branch" className="font-medium text-slate-700">默认分支</Label>
                      <Input
                        id="edit-branch"
                        value={editForm.default_branch}
                        onChange={(e) => setEditForm({ ...editForm, default_branch: e.target.value })}
                        placeholder="main"
                        className="mt-1 border-slate-200 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 语言选择 */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  编程语言
                </h3>

                <div className="flex flex-wrap gap-2">
                  {supportedLanguages.map((lang) => (
                    <Badge
                      key={lang}
                      variant="outline"
                      className={`cursor-pointer transition-all ${editForm.programming_languages?.includes(lang)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                        }`}
                      onClick={() => handleToggleLanguage(lang)}
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 设计文档路径 */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  设计文档配置
                </h3>

                <div>
                  <Label htmlFor="edit-design-doc-path" className="font-medium text-slate-700">
                    设计文档路径 (可选)
                  </Label>
                  {hasZipFile && zipFileList.length > 0 ? (
                    // ZIP项目：显示下拉选择框
                    <Select
                      value={editForm.design_doc_path || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, design_doc_path: value })}
                    >
                      <SelectTrigger id="edit-design-doc-path" className="mt-1 border-slate-200">
                        <SelectValue placeholder="选择设计文档文件" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="">无（不选择设计文档）</SelectItem>
                        {(() => {
                          // 分离设计文档文件和其他文件
                          const docFiles: Array<{ path: string; size: number }> = [];
                          const otherFiles: Array<{ path: string; size: number }> = [];
                          
                          zipFileList.forEach(file => {
                            const ext = file.path.split('.').pop()?.toLowerCase() || '';
                            const docExts = ['md', 'txt', 'doc', 'docx', 'pdf', 'rst', 'adoc'];
                            const pathLower = file.path.toLowerCase();
                            const isDocFile = docExts.includes(ext) || 
                                            pathLower.includes('design') || 
                                            pathLower.includes('doc') ||
                                            pathLower.includes('readme');
                            
                            if (isDocFile) {
                              docFiles.push(file);
                            } else {
                              otherFiles.push(file);
                            }
                          });
                          
                          return (
                            <>
                              {/* 优先显示设计文档文件 */}
                              {docFiles.length > 0 && (
                                <>
                                  {docFiles.map((file) => (
                                    <SelectItem key={file.path} value={file.path}>
                                      {file.path}
                                    </SelectItem>
                                  ))}
                                  {otherFiles.length > 0 && (
                                    <div className="px-2 py-1 text-xs text-slate-500 border-t border-slate-200 mt-1">
                                      其他文件
                                    </div>
                                  )}
                                </>
                              )}
                              {/* 显示其他文件 */}
                              {otherFiles.map((file) => (
                                <SelectItem key={file.path} value={file.path}>
                                  {file.path}
                                </SelectItem>
                              ))}
                            </>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                  ) : (
                    // 非ZIP项目或没有ZIP文件：显示输入框
                    <Input
                      id="edit-design-doc-path"
                      value={editForm.design_doc_path || ""}
                      onChange={(e) => setEditForm({ ...editForm, design_doc_path: e.target.value })}
                      placeholder="e.g., docs/design.md or design.txt"
                      className="mt-1 border-slate-200 focus:ring-primary/20"
                    />
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {hasZipFile && zipFileList.length > 0
                      ? "从项目文件中选择设计文档，或留空表示不使用设计文档"
                      : "相对于项目根目录的设计文档路径，用于代码审计时进行设计一致性检查"}
                  </p>
                  {loadingZipFiles && (
                    <p className="text-xs text-slate-400 mt-1">正在加载文件列表...</p>
                  )}
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="flex justify-end pt-6 border-t border-slate-100">
                <Button onClick={handleSaveSettings} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                  保存更改
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        onTaskCreated={handleTaskCreated}
        onFastScanStarted={handleFastScanStarted}
        preselectedProjectId={id}
      />

      <TerminalProgressDialog
        open={showTerminalDialog}
        onOpenChange={setShowTerminalDialog}
        taskId={currentTaskId}
        taskType={project.repository_url ? 'repository' : 'zip'}
      />

      <FileSelectionDialog
        open={showFileSelectionDialog}
        onOpenChange={setShowFileSelectionDialog}
        projectId={id!}
        onConfirm={handleStartCustomAudit}
        excludePatterns={['node_modules/**', '.git/**', 'dist/**', 'build/**']}
      />

      {/* Audit Options Dialog */}
      <Dialog open={showAuditOptionsDialog} onOpenChange={setShowAuditOptionsDialog}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900">选择审计模式</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div
              className="cloud-card p-4 hover:border-primary/50 cursor-pointer transition-all hover:bg-slate-50 flex flex-col items-center text-center space-y-3"
              onClick={handleStartFullAudit}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">全量审计</h3>
                <p className="text-xs text-slate-500 mt-1">扫描项目中的所有文件</p>
              </div>
            </div>

            <div
              className="cloud-card p-4 hover:border-primary/50 cursor-pointer transition-all hover:bg-slate-50 flex flex-col items-center text-center space-y-3"
              onClick={handleOpenCustomAudit}
            >
              <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-sky-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">自定义审计</h3>
                <p className="text-xs text-slate-500 mt-1">选择特定文件进行扫描</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditOptionsDialog(false)} className="border-slate-200">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
