/**
 * Agent 审计任务创建对话框
 * Corporate Blue Theme
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronRight,
  GitBranch,
  Package,
  Globe,
  Loader2,
  Bot,
  Settings2,
  Play,
  Upload,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/config/database";
import { createAgentTask } from "@/shared/api/agentTasks";
import { isRepositoryProject, isZipProject } from "@/shared/utils/projectUtils";
import { getZipFileInfo, type ZipFileMeta } from "@/shared/utils/zipStorage";
import { validateZipFile } from "@/features/projects/services/repoZipScan";
import type { Project } from "@/shared/types";
import FileSelectionDialog from "@/components/audit/FileSelectionDialog";

interface CreateAgentTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_EXCLUDES = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "*.log",
];

export default function CreateAgentTaskDialog({
  open,
  onOpenChange,
}: CreateAgentTaskDialogProps) {
  const navigate = useNavigate();

  // 状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [excludePatterns, setExcludePatterns] = useState(DEFAULT_EXCLUDES);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);

  // ZIP 文件状态
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [storedZipInfo, setStoredZipInfo] = useState<ZipFileMeta | null>(null);
  const [useStoredZip, setUseStoredZip] = useState(true);

  // 文件选择状态
  const [selectedFiles, setSelectedFiles] = useState<string[] | undefined>();
  const [showFileSelection, setShowFileSelection] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // 加载项目列表
  useEffect(() => {
    if (open) {
      setLoadingProjects(true);
      api.getProjects()
        .then((data) => {
          setProjects(data.filter((p: Project) => p.is_active));
        })
        .catch(() => {
          toast.error("加载项目列表失败");
        })
        .finally(() => setLoadingProjects(false));

      // 重置状态
      setSelectedProjectId("");
      setSearchTerm("");
      setBranch("main");
      setExcludePatterns(DEFAULT_EXCLUDES);
      setShowAdvanced(false);
      setZipFile(null);
      setStoredZipInfo(null);
      setSelectedFiles(undefined);
    }
  }, [open]);

  // 加载分支列表
  useEffect(() => {
    const loadBranches = async () => {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project || !isRepositoryProject(project)) {
        setBranches([]);
        return;
      }

      setLoadingBranches(true);
      try {
        const result = await api.getProjectBranches(project.id);

        if (result.error) {
          toast.error(`加载分支失败: ${result.error}`);
        }

        setBranches(result.branches);
        if (result.default_branch) {
          setBranch(result.default_branch);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        toast.error(`加载分支失败: ${msg}`);
        setBranches([project.default_branch || "main"]);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [selectedProjectId, projects]);

  // 加载 ZIP 文件信息
  useEffect(() => {
    const loadZipInfo = async () => {
      if (!selectedProject || !isZipProject(selectedProject)) {
        setStoredZipInfo(null);
        return;
      }

      try {
        const info = await getZipFileInfo(selectedProject.id);
        setStoredZipInfo(info);
        setUseStoredZip(info.has_file);
      } catch {
        setStoredZipInfo(null);
      }
    };

    loadZipInfo();
  }, [selectedProject?.id]);

  // 过滤项目
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  // 是否可以开始
  const canStart = useMemo(() => {
    if (!selectedProject) return false;
    if (isZipProject(selectedProject)) {
      return (useStoredZip && storedZipInfo?.has_file) || !!zipFile;
    }
    return !!selectedProject.repository_url && !!branch.trim();
  }, [selectedProject, useStoredZip, storedZipInfo, zipFile, branch]);

  // 创建任务
  const handleCreate = async () => {
    if (!selectedProject) return;

    setCreating(true);
    try {
      const agentTask = await createAgentTask({
        project_id: selectedProject.id,
        name: `Agent审计-${selectedProject.name}`,
        branch_name: isRepositoryProject(selectedProject) ? branch : undefined,
        exclude_patterns: excludePatterns,
        target_files: selectedFiles,
        verification_level: "sandbox",
      });

      onOpenChange(false);
      toast.success("Agent 审计任务已创建");
      navigate(`/agent-audit/${agentTask.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateZipFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "文件无效");
        e.target.value = "";
        return;
      }
      setZipFile(file);
      setUseStoredZip(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[min(90vw,520px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <DialogTitle className="flex items-center gap-4 text-slate-900">
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">新建 Agent 审计任务</span>
              <p className="text-sm text-slate-500 font-normal mt-0.5">
                AI 驱动的智能安全审计分析
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* 项目选择 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                选择项目
              </span>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md">
                {filteredProjects.length} 个可用项目
              </Badge>
            </div>

            {/* 搜索框 */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="搜索项目名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
              />
            </div>

            {/* 项目列表 */}
            <ScrollArea className="h-[220px] border border-slate-100 rounded-xl bg-slate-50/30">
              {loadingProjects ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-slate-400 font-medium">正在加载项目...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                  <Package className="w-10 h-10 mb-3 opacity-20" />
                  <span className="text-sm font-medium">{searchTerm ? "未找到匹配项目" : "暂无可审计项目"}</span>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      selected={selectedProjectId === project.id}
                      onSelect={() => setSelectedProjectId(project.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 配置区域 */}
          {selectedProject && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* 仓库项目：分支选择 */}
              {isRepositoryProject(selectedProject) && (
                <div className="flex items-center gap-4 p-4 border border-blue-100 rounded-xl bg-blue-50/50 group transition-all hover:bg-blue-50">
                  <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <GitBranch className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                      选择分支
                    </label>
                    {loadingBranches ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span className="text-xs text-slate-400 font-medium tracking-tight">正在加载分支列表...</span>
                      </div>
                    ) : (
                      <Select value={branch} onValueChange={setBranch}>
                        <SelectTrigger className="h-9 border-slate-200 bg-white shadow-sm rounded-lg hover:border-primary/30 transition-colors">
                          <SelectValue placeholder="选择源码分支" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {branches.map((b) => (
                            <SelectItem key={b} value={b} className="text-slate-700 focus:bg-blue-50 focus:text-primary">
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}

              {/* ZIP 项目：文件选择 */}
              {isZipProject(selectedProject) && (
                <div className="p-4 border border-amber-100 rounded-xl bg-amber-50/50 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-amber-100 shadow-sm">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ZIP 源码包</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {storedZipInfo?.has_file && (
                      <div
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${useStoredZip
                          ? 'border-emerald-200 bg-white shadow-sm'
                          : 'border-slate-100 bg-white/50 hover:bg-white text-slate-400 opacity-60'
                          }`}
                        onClick={() => setUseStoredZip(true)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${useStoredZip ? 'border-primary' : 'border-slate-300'
                            }`}>
                            {useStoredZip && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className={`text-sm font-medium flex-1 truncate ${useStoredZip ? 'text-slate-900' : 'text-slate-400'}`}>
                            {storedZipInfo.original_filename}
                          </span>
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-medium text-[10px] px-1.5 h-5">
                            已存储
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${!useStoredZip && zipFile
                        ? 'border-amber-200 bg-white shadow-sm'
                        : 'border-slate-100 bg-white/50 hover:bg-white text-slate-400 shadow-sm'
                        }`}
                      onClick={() => !useStoredZip && setUseStoredZip(false)}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!useStoredZip && zipFile ? 'border-primary' : 'border-slate-300'
                          }`} onClick={() => setUseStoredZip(false)}>
                          {!useStoredZip && zipFile && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <Upload className={`w-4 h-4 ${!useStoredZip ? 'text-primary' : 'text-slate-400'}`} />
                        <span className={`text-sm font-medium flex-1 truncate ${!useStoredZip && zipFile ? 'text-slate-900' : 'text-slate-500'}`}>
                          {zipFile ? zipFile.name : "上传新代码包..."}
                        </span>
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 高级选项 */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20 shadow-sm">
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <span className="uppercase tracking-wider">高级配置选项</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showAdvanced ? "rotate-90 text-primary" : "text-slate-300"}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-4 space-y-5 bg-white border-t border-slate-100">
                  {/* 文件选择 */}
                  {(() => {
                    const isRepo = isRepositoryProject(selectedProject);
                    const isZip = isZipProject(selectedProject);
                    const hasStoredZip = storedZipInfo?.has_file;
                    const canSelectFiles = isRepo || (isZip && useStoredZip && hasStoredZip);

                    return (
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">
                            扫描范围控制
                          </p>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${selectedFiles ? 'bg-blue-500' : 'bg-slate-300'}`} />
                            <p className="text-sm text-slate-900 font-bold">
                              {selectedFiles
                                ? `已手动选择 ${selectedFiles.length} 个文件`
                                : "全量源码审计"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {selectedFiles && canSelectFiles && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedFiles(undefined)}
                              className="h-9 px-3 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg font-bold"
                            >
                              重置
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowFileSelection(true)}
                            disabled={!canSelectFiles}
                            className={`h-9 px-3 text-xs font-bold rounded-lg border-slate-200 hover:border-primary/50 hover:bg-blue-50 hover:text-primary transition-all shadow-sm ${!canSelectFiles ? 'opacity-40 grayscale' : ''}`}
                          >
                            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                            选择文件
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 排除模式 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                        文件排除规则 (Match Patterns)
                      </span>
                      <button
                        type="button"
                        onClick={() => setExcludePatterns(DEFAULT_EXCLUDES)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        还原默认
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl border border-slate-100 bg-slate-50/50">
                      {excludePatterns.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="bg-white text-slate-600 border border-slate-100 font-medium text-xs py-1 px-2.5 rounded-lg group hover:border-rose-200 hover:bg-rose-50 cursor-pointer transition-all"
                          onClick={() => setExcludePatterns((prev) => prev.filter((x) => x !== p))}
                        >
                          {p}
                          <span className="ml-1.5 opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity">×</span>
                        </Badge>
                      ))}
                      {excludePatterns.length === 0 && (
                        <span className="text-xs text-slate-300 italic py-1 px-2">无排除规则</span>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        placeholder="添加排除规则 (如 **/tests/*)，点击回车确认"
                        className="h-10 text-sm border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-primary/20"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value) {
                            const val = e.currentTarget.value.trim();
                            if (val && !excludePatterns.includes(val)) {
                              setExcludePatterns((prev) => [...prev, val]);
                            }
                            e.currentTarget.value = "";
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 px-6 py-5 bg-slate-50/80 border-t border-slate-100 backdrop-blur-sm">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="px-5 h-11 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canStart || creating}
            className="px-7 h-11 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2.5" />
                正在初始化任务...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2.5 fill-current" />
                开始审计任务
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* 文件选择对话框 */}
      <FileSelectionDialog
        open={showFileSelection}
        onOpenChange={setShowFileSelection}
        projectId={selectedProjectId}
        branch={branch}
        excludePatterns={excludePatterns}
        onConfirm={setSelectedFiles}
      />
    </Dialog>
  );
}

// 项目列表项
function ProjectItem({
  project,
  selected,
  onSelect,
}: {
  project: Project;
  selected: boolean;
  onSelect: () => void;
}) {
  const isRepo = isRepositoryProject(project);

  return (
    <div
      className={`group flex items-center gap-4 p-3.5 cursor-pointer rounded-xl transition-all duration-200 border-2 ${selected
        ? "bg-blue-50/50 border-primary/40 shadow-sm"
        : "hover:bg-slate-50 border-transparent"
        }`}
      onClick={onSelect}
    >
      <div className={`p-2.5 rounded-xl shadow-sm transition-all ${selected
        ? (isRepo ? "bg-blue-100" : "bg-amber-100")
        : (isRepo ? "bg-slate-100 group-hover:bg-blue-50" : "bg-slate-100 group-hover:bg-amber-50")
        }`}>
        {isRepo ? (
          <Globe className={`w-5 h-5 ${selected ? 'text-primary' : 'text-slate-400 group-hover:text-primary transition-colors'}`} />
        ) : (
          <Package className={`w-5 h-5 ${selected ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-600 transition-colors'}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm tracking-tight truncate ${selected ? 'text-slate-900 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
            {project.name}
          </span>
          <Badge
            className={`text-[9px] px-1.5 py-0 font-bold border-none transition-colors ${isRepo
              ? (selected ? "bg-primary text-white" : "bg-blue-50 text-primary")
              : (selected ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600")
              }`}
          >
            {isRepo ? "SOURCE" : "ARCHIVE"}
          </Badge>
        </div>
        {project.description && (
          <p className="text-xs text-slate-400 font-medium truncate group-hover:text-slate-500">
            {project.description}
          </p>
        )}
      </div>

      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 shadow-inner'}`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </div>
  );
}
