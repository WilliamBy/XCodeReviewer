/**
 * Projects Page
 * Corporate Blue Theme
 */

import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  GitBranch,
  Calendar,
  Users,
  Code,
  Shield,
  Activity,
  Upload,
  FileText,
  AlertCircle,
  Trash2,
  Edit,
  CheckCircle,
  Terminal,
  Github,
  Folder,
  ArrowUpRight
} from "lucide-react";
import { api } from "@/shared/config/database";
import { validateZipFile } from "@/features/projects/services";
import type { Project, CreateProjectForm } from "@/shared/types";
import { uploadZipFile, getZipFileInfo, type ZipFileMeta } from "@/shared/utils/zipStorage";
import { isRepositoryProject, isZipProject, getSourceTypeBadge } from "@/shared/utils/projectUtils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import CreateTaskDialog from "@/components/audit/CreateTaskDialog";
import TerminalProgressDialog from "@/components/audit/TerminalProgressDialog";
import { SUPPORTED_LANGUAGES } from "@/shared/constants";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<string>("");
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<CreateProjectForm>({
    name: "",
    description: "",
    source_type: "repository",
    repository_url: "",
    repository_type: "github",
    default_branch: "main",
    programming_languages: []
  });
  const [createForm, setCreateForm] = useState<CreateProjectForm>({
    name: "",
    description: "",
    source_type: "repository",
    repository_url: "",
    repository_type: "github",
    default_branch: "main",
    programming_languages: []
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 编辑对话框中的ZIP文件状态
  const [editZipInfo, setEditZipInfo] = useState<ZipFileMeta | null>(null);
  const [editZipFile, setEditZipFile] = useState<File | null>(null);
  const [loadingEditZipInfo, setLoadingEditZipInfo] = useState(false);
  const editZipInputRef = useRef<HTMLInputElement>(null);

  // 将小写语言名转换为显示格式
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
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error("加载项目失败");
    } finally {
      setLoading(false);
    }
  };

  const handleFastScanStarted = (taskId: string) => {
    setCurrentTaskId(taskId);
    setShowTerminal(true);
  };

  const handleCreateProject = async () => {
    if (!createForm.name.trim()) {
      toast.error("请输入项目名称");
      return;
    }

    try {
      await api.createProject({
        ...createForm,
      } as any);

      import('@/shared/utils/logger').then(({ logger }) => {
        logger.logUserAction('创建项目', {
          projectName: createForm.name,
          repositoryType: createForm.repository_type,
          languages: createForm.programming_languages,
        });
      });

      toast.success("项目创建成功");
      setShowCreateDialog(false);
      resetCreateForm();
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      import('@/shared/utils/errorHandler').then(({ handleError }) => {
        handleError(error, '创建项目失败');
      });
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`创建项目失败: ${errorMessage}`);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      description: "",
      source_type: "repository",
      repository_url: "",
      repository_type: "github",
      default_branch: "main",
      programming_languages: []
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateZipFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelectedFile(file);
    event.target.value = '';
  };

  const handleUploadAndCreate = async () => {
    if (!selectedFile) {
      toast.error("请先选择ZIP文件");
      return;
    }

    if (!createForm.name.trim()) {
      toast.error("请先输入项目名称");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 20;
        });
      }, 100);

      const project = await api.createProject({
        ...createForm,
        source_type: "zip",
        repository_type: "other",
        repository_url: undefined
      } as any);

      try {
        await uploadZipFile(project.id, selectedFile);
      } catch (error) {
        console.error('保存ZIP文件失败:', error);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      import('@/shared/utils/logger').then(({ logger }) => {
        logger.logUserAction('上传ZIP文件创建项目', {
          projectName: project.name,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        });
      });

      setShowCreateDialog(false);
      resetCreateForm();
      loadProjects();

      toast.success(`项目 "${project.name}" 已创建`, {
        description: 'ZIP文件已保存，您可以启动代码审计',
        duration: 4000
      });

    } catch (error: any) {
      console.error('Upload failed:', error);
      import('@/shared/utils/errorHandler').then(({ handleError }) => {
        handleError(error, '上传ZIP文件失败');
      });
      const errorMessage = error?.message || '未知错误';
      toast.error(`上传失败: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRepositoryIcon = (type?: string) => {
    switch (type) {
      case 'github': return <Github className="w-5 h-5" />;
      case 'gitlab': return <GitBranch className="w-5 h-5 text-orange-500" />;
      default: return <Folder className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const handleCreateTask = (projectId: string) => {
    setSelectedProjectForTask(projectId);
    setShowCreateTaskDialog(true);
  };

  const handleEditClick = async (project: Project) => {
    setProjectToEdit(project);
    setEditForm({
      name: project.name,
      description: project.description || "",
      source_type: project.source_type || "repository",
      repository_url: project.repository_url || "",
      repository_type: project.repository_type || "github",
      default_branch: project.default_branch || "main",
      programming_languages: project.programming_languages ? JSON.parse(project.programming_languages) : []
    });
    setEditZipFile(null);
    setEditZipInfo(null);
    setShowEditDialog(true);

    if (project.source_type === 'zip') {
      setLoadingEditZipInfo(true);
      try {
        const zipInfo = await getZipFileInfo(project.id);
        setEditZipInfo(zipInfo);
      } catch (error) {
        console.error('加载ZIP文件信息失败:', error);
      } finally {
        setLoadingEditZipInfo(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!projectToEdit) return;

    if (!editForm.name.trim()) {
      toast.error("项目名称不能为空");
      return;
    }

    try {
      await api.updateProject(projectToEdit.id, editForm);

      if (editZipFile && editForm.source_type === 'zip') {
        const result = await uploadZipFile(projectToEdit.id, editZipFile);
        if (result.success) {
          toast.success(`ZIP文件已更新: ${result.original_filename}`);
        } else {
          toast.error(`ZIP文件上传失败: ${result.message}`);
        }
      }

      toast.success(`项目 "${editForm.name}" 已更新`);
      setShowEditDialog(false);
      setProjectToEdit(null);
      setEditZipFile(null);
      setEditZipInfo(null);
      loadProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error("更新项目失败");
    }
  };

  const handleToggleLanguage = (lang: string) => {
    const currentLanguages = editForm.programming_languages || [];
    const newLanguages = currentLanguages.includes(lang)
      ? currentLanguages.filter(l => l !== lang)
      : [...currentLanguages, lang];

    setEditForm({ ...editForm, programming_languages: newLanguages });
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await api.deleteProject(projectToDelete.id);

      import('@/shared/utils/logger').then(({ logger }) => {
        logger.logUserAction('删除项目', {
          projectId: projectToDelete.id,
          projectName: projectToDelete.name,
        });
      });

      toast.success(`项目 "${projectToDelete.name}" 已移到回收站`, {
        description: '您可以在回收站中恢复此项目',
        duration: 4000
      });
      setShowDeleteDialog(false);
      setProjectToDelete(null);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      import('@/shared/utils/errorHandler').then(({ handleError }) => {
        handleError(error, '删除项目失败');
      });
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`删除项目失败: ${errorMessage}`);
    }
  };

  const handleTaskCreated = () => {
    toast.success("审计任务已创建", {
      description: '因为网络和代码文件大小等因素，审计时长通常至少需要1分钟，请耐心等待...',
      duration: 5000
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto text-primary" />
          <p className="text-slate-500 font-sans text-sm">加载项目数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen font-sans relative">
      {/* 创建项目对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild className="hidden">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5 mr-2" />
            初始化项目
          </Button>
        </DialogTrigger>
        <DialogContent className="!w-[min(90vw,700px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 bg-white border border-slate-200 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <span className="ml-2 font-mono text-[11px] text-slate-500 tracking-wider">
              new_project@deepaudit
            </span>
          </div>

          <DialogHeader className="px-6 pt-4 flex-shrink-0">
            <DialogTitle className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <Terminal className="w-5 h-5 text-primary" />
              初始化新项目
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="repository" className="w-full">
              <TabsList className="flex w-full bg-slate-100 p-1 h-auto gap-1 rounded-lg">
                <TabsTrigger
                  value="repository"
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold py-2 text-slate-500 transition-all rounded-md"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Git 仓库
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold py-2 text-slate-500 transition-all rounded-md"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传源码
                </TabsTrigger>
              </TabsList>

              <TabsContent value="repository" className="flex flex-col gap-5 mt-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="font-semibold text-xs text-slate-500 uppercase">项目名称 *</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="输入项目名称"
                      className="border-slate-200 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="repository_type" className="font-semibold text-xs text-slate-500 uppercase">仓库类型</Label>
                    <Select
                      value={createForm.repository_type}
                      onValueChange={(value: any) => setCreateForm({ ...createForm, repository_type: value })}
                    >
                      <SelectTrigger className="border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">Github</SelectItem>
                        <SelectItem value="gitlab">Gitlab</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="font-semibold text-xs text-slate-500 uppercase">描述</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="// 项目描述..."
                    rows={3}
                    className="min-h-[80px] border-slate-200 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="repository_url" className="font-semibold text-xs text-slate-500 uppercase">仓库地址</Label>
                    <Input
                      id="repository_url"
                      value={createForm.repository_url}
                      onChange={(e) => setCreateForm({ ...createForm, repository_url: e.target.value })}
                      placeholder="https://github.com/user/repo"
                      className="border-slate-200 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="default_branch" className="font-semibold text-xs text-slate-500 uppercase">默认分支</Label>
                    <Input
                      id="default_branch"
                      value={createForm.default_branch}
                      onChange={(e) => setCreateForm({ ...createForm, default_branch: e.target.value })}
                      placeholder="main"
                      className="border-slate-200 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs text-slate-500 uppercase">技术栈</Label>
                  <div className="flex flex-wrap gap-2">
                    {supportedLanguages.map((lang) => (
                      <label key={lang} className={`flex items-center space-x-2 px-3 py-1.5 border cursor-pointer transition-all rounded-md ${createForm.programming_languages.includes(lang)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}>
                        <input
                          type="checkbox"
                          checked={createForm.programming_languages.includes(lang)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({
                                ...createForm,
                                programming_languages: [...createForm.programming_languages, lang]
                              });
                            } else {
                              setCreateForm({
                                ...createForm,
                                programming_languages: createForm.programming_languages.filter(l => l !== lang)
                              });
                            }
                          }}
                          className="rounded border-slate-300 w-3.5 h-3.5 text-primary focus:ring-primary/20"
                        />
                        <span className="text-xs font-semibold">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-slate-500 hover:text-slate-700">
                    取消
                  </Button>
                  <Button onClick={handleCreateProject} className="bg-primary hover:bg-primary/90">
                    执行创建
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="flex flex-col gap-5 mt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-name" className="font-semibold text-xs text-slate-500 uppercase">项目名称 *</Label>
                  <Input
                    id="upload-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="输入项目名称"
                    className="border-slate-200 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="upload-description" className="font-semibold text-xs text-slate-500 uppercase">描述</Label>
                  <Textarea
                    id="upload-description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="// 项目描述..."
                    rows={3}
                    className="min-h-[80px] border-slate-200 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs text-slate-500 uppercase">技术栈</Label>
                  <div className="flex flex-wrap gap-2">
                    {supportedLanguages.map((lang) => (
                      <label key={lang} className={`flex items-center space-x-2 px-3 py-1.5 border cursor-pointer transition-all rounded-md ${createForm.programming_languages.includes(lang)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}>
                        <input
                          type="checkbox"
                          checked={createForm.programming_languages.includes(lang)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({
                                ...createForm,
                                programming_languages: [...createForm.programming_languages, lang]
                              });
                            } else {
                              setCreateForm({
                                ...createForm,
                                programming_languages: createForm.programming_languages.filter(l => l !== lang)
                              });
                            }
                          }}
                          className="rounded border-slate-300 w-3.5 h-3.5 text-primary focus:ring-primary/20"
                        />
                        <span className="text-xs font-semibold">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-semibold text-xs text-slate-500 uppercase">源代码</Label>

                  {!selectedFile ? (
                    <div
                      className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg p-6 text-center hover:bg-slate-100 hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-primary transition-colors" />
                      <h3 className="text-base font-bold text-slate-700 uppercase mb-1">上传 ZIP 归档</h3>
                      <p className="text-[10px] font-mono text-slate-500 mb-3">
                        最大: 500MB // 格式: .ZIP
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 text-xs font-semibold"
                        disabled={uploading || !createForm.name.trim()}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <FileText className="w-3 h-3 mr-2" />
                        选择文件
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 bg-slate-50 p-4 flex items-center justify-between rounded-lg">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-700 truncate">{selectedFile.name}</p>
                          <p className="font-mono text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                        disabled={uploading}
                        className="hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {uploading && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>上传并分析中...</span>
                        <span className="text-primary">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 bg-slate-100" />
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div className="text-[10px] text-amber-700">
                        <p className="font-bold mb-1 uppercase">上传协议:</p>
                        <ul className="space-y-0.5 list-disc list-inside text-amber-600">
                          <li>确保完整的项目代码</li>
                          <li>移除 node_modules 等依赖目录</li>
                          <li>包含必要的配置文件</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100 mt-auto">
                  <Button variant="ghost" onClick={() => setShowCreateDialog(false)} disabled={uploading} className="text-slate-500 hover:text-slate-700">
                    取消
                  </Button>
                  <Button
                    onClick={handleUploadAndCreate}
                    className="bg-primary hover:bg-primary/90"
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? '上传中...' : '执行创建'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Section */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <div className="cloud-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">项目总数</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Code className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="cloud-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">活跃项目</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{projects.filter(p => p.is_active).length}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Activity className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="cloud-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">远程仓库</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{projects.filter(p => isRepositoryProject(p)).length}</p>
              </div>
              <div className="p-2 bg-sky-50 rounded-lg">
                <GitBranch className="w-6 h-6 text-sky-500" />
              </div>
            </div>
          </div>

          <div className="cloud-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">ZIP上传</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{projects.filter(p => isZipProject(p)).length}</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Upload className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="cloud-card p-4 flex items-center gap-4 relative z-10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
          <Input
            placeholder="搜索项目..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 focus:ring-primary/20"
          />
        </div>
        <Button className="bg-primary hover:bg-primary/90 h-10 shadow-sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* Project List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {filteredProjects.map((project) => (
          <div key={project.id} className="cloud-card flex flex-col h-full group hover:shadow-lg transition-shadow">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isRepositoryProject(project) ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    {getRepositoryIcon(project.repository_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1" title={project.name}>
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 font-medium">
                        {project.repository_type?.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(project.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => handleEditClick(project)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(project)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[40px]">
                {project.description || "暂无描述"}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {JSON.parse(project.programming_languages || "[]").slice(0, 3).map((lang: string) => (
                  <Badge key={lang} variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-600 bg-slate-50">
                    {lang}
                  </Badge>
                ))}
                {JSON.parse(project.programming_languages || "[]").length > 3 && (
                  <Badge variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-500">
                    +{JSON.parse(project.programming_languages || "[]").length - 3}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={project.is_active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                  {project.is_active ? '活跃' : '归档'}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Link to={`/projects/${project.id}`} className="block">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white">
                    详情
                  </Button>
                </Link>
                <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={() => handleCreateTask(project.id)}>
                  <Plus className="w-3 h-3 mr-1" />
                  审计
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">未找到项目</p>
            <p className="text-sm text-slate-500 mt-1">尝试调整搜索词或创建一个新项目</p>
            <Button
              variant="link"
              onClick={() => { setSearchTerm(""); setShowCreateDialog(true); }}
              className="mt-4 text-primary"
            >
              新建项目
            </Button>
          </div>
        )}
      </div>

      <CreateTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        onTaskCreated={handleTaskCreated}
        onFastScanStarted={handleFastScanStarted}
        preselectedProjectId={selectedProjectForTask}
      />

      <TerminalProgressDialog
        taskId={currentTaskId || ""}
        open={showTerminal}
        onOpenChange={setShowTerminal}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              项目 "{projectToDelete?.name}" 将被移入回收站。您可以随时在回收站中恢复它。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 hover:bg-slate-100 text-slate-600">取消</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600" onClick={handleConfirmDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="!w-[min(90vw,700px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 bg-white border border-slate-200 rounded-lg shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              编辑项目配置
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="font-semibold text-xs text-slate-500 uppercase">项目名称</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="项目名称"
                  className="border-slate-200 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs text-slate-500 uppercase">项目类型</Label>
                <div className="h-10 px-3 flex items-center bg-slate-100 rounded-md border border-slate-200">
                  {getSourceTypeBadge(editForm.source_type)}
                  <span className="ml-2 text-sm text-slate-600 capitalize">
                    {editForm.source_type === 'repository' ? 'Git 仓库' : 'ZIP 文件'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="font-semibold text-xs text-slate-500 uppercase">描述</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="项目描述..."
                className="min-h-[80px] border-slate-200 focus:ring-primary/20"
              />
            </div>

            {/* 仓库信息 - 仅远程仓库类型显示 */}
            {editForm.source_type === 'repository' && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h3 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  仓库信息
                </h3>

                <div>
                  <Label htmlFor="edit-repo-url" className="font-medium text-slate-700 text-xs uppercase mb-1.5 block">仓库地址</Label>
                  <Input
                    id="edit-repo-url"
                    value={editForm.repository_url}
                    onChange={(e) => setEditForm({ ...editForm, repository_url: e.target.value })}
                    placeholder="https://github.com/username/repo"
                    className="border-slate-200 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-repo-type" className="font-medium text-slate-700 text-xs uppercase mb-1.5 block">仓库平台</Label>
                    <Select
                      value={editForm.repository_type}
                      onValueChange={(value: any) => setEditForm({ ...editForm, repository_type: value })}
                    >
                      <SelectTrigger id="edit-repo-type" className="border-slate-200">
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
                    <Label htmlFor="edit-branch" className="font-medium text-slate-700 text-xs uppercase mb-1.5 block">默认分支</Label>
                    <Input
                      id="edit-branch"
                      value={editForm.default_branch}
                      onChange={(e) => setEditForm({ ...editForm, default_branch: e.target.value })}
                      placeholder="main"
                      className="border-slate-200 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ZIP项目提示 */}
            {editForm.source_type === 'zip' && (
              <div className="border-t border-slate-100 pt-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Upload className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-amber-900 mb-1">ZIP上传项目</p>
                      <p className="text-amber-700/80 text-xs mb-3">
                        此项目通过ZIP文件上传创建。每次进行代码审计时，需要在创建任务时重新上传ZIP文件。
                      </p>

                      <div className="mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-800 font-semibold">当前文件:</span>
                          {loadingEditZipInfo ? (
                            <span className="text-amber-600">加载中...</span>
                          ) : editZipInfo?.has_file ? (
                            <span className="text-amber-900 font-mono">
                              {editZipInfo.original_filename} ({editZipInfo.file_size ? (editZipInfo.file_size / 1024).toFixed(1) : 0} KB)
                            </span>
                          ) : (
                            <span className="text-amber-600 italic">未找到文件信息</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="font-bold text-xs text-amber-800 uppercase mb-1.5 block">更新ZIP文件</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept=".zip"
                            className="bg-white border-amber-200 text-amber-900 file:text-amber-700 file:bg-amber-100 h-9"
                            ref={editZipInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const validation = validateZipFile(file);
                                if (!validation.valid) {
                                  toast.error(validation.error);
                                  if (editZipInputRef.current) editZipInputRef.current.value = '';
                                  return;
                                }
                                setEditZipFile(file);
                              }
                            }}
                          />
                          {editZipFile && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditZipFile(null);
                                if (editZipInputRef.current) editZipInputRef.current.value = '';
                              }}
                              variant="ghost"
                              className="h-9 px-2 text-amber-700 hover:bg-amber-100"
                            >
                              清除
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 编程语言 */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="font-bold text-sm text-slate-500 uppercase">编程语言</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {supportedLanguages.map((lang) => (
                  <div
                    key={lang}
                    className={`flex items-center space-x-2 p-3 border cursor-pointer transition-all rounded-md ${editForm.programming_languages?.includes(lang)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    onClick={() => handleToggleLanguage(lang)}
                  >
                    <div
                      className={`w-4 h-4 border rounded-sm flex items-center justify-center ${editForm.programming_languages?.includes(lang)
                        ? 'bg-primary border-primary'
                        : 'border-slate-300 bg-white'
                        }`}
                    >
                      {editForm.programming_languages?.includes(lang) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{lang}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-slate-500 hover:text-slate-700">
              取消
            </Button>
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90">
              保存修改
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
