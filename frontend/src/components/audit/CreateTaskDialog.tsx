/**
 * Create Task Dialog
 * Corporate Blue Theme
 */

import { useState, useEffect, useMemo, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ChevronRight,
  GitBranch,
  Upload,
  FolderOpen,
  Settings2,
  Package,
  Globe,
  Shield,
  Loader2,
  Zap,
  Bot,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/config/database";
import { getRuleSets, type AuditRuleSet } from "@/shared/api/rules";
import { getPromptTemplates, type PromptTemplate } from "@/shared/api/prompts";
import { createAgentTask } from "@/shared/api/agentTasks";

import { useProjects } from "./hooks/useTaskForm";
import { useZipFile, formatFileSize } from "./hooks/useZipFile";
import FileSelectionDialog from "./FileSelectionDialog";
import AgentModeSelector, { type AuditMode } from "@/components/agent/AgentModeSelector";

import { runRepositoryAudit } from "@/features/projects/services/repoScan";
import {
  scanZipFile,
  scanStoredZipFile,
  validateZipFile,
} from "@/features/projects/services/repoZipScan";
import { isRepositoryProject, isZipProject } from "@/shared/utils/projectUtils";
import type { Project } from "@/shared/types";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  onFastScanStarted?: (taskId: string) => void;
  preselectedProjectId?: string;
}

const DEFAULT_EXCLUDES = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "*.log",
];

export default function CreateTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  onFastScanStarted,
  preselectedProjectId,
}: CreateTaskDialogProps) {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [branch, setBranch] = useState("main");
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [excludePatterns, setExcludePatterns] = useState(DEFAULT_EXCLUDES);
  const [selectedFiles, setSelectedFiles] = useState<string[] | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFileSelection, setShowFileSelection] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDesignDocPath, setSelectedDesignDocPath] = useState<string | undefined>();
  const [showDesignDocSelection, setShowDesignDocSelection] = useState(false);

  const [auditMode, setAuditMode] = useState<AuditMode>("agent");

  const [ruleSets, setRuleSets] = useState<AuditRuleSet[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string>("");
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string>("");

  const { projects, loading, loadProjects } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const zipState = useZipFile(selectedProject, projects);

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
      } catch (error) {
        const msg = error instanceof Error ? error.message : "未知错误";
        toast.error(`加载分支失败: ${msg}`);
        setBranches([project.default_branch || "main"]);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [selectedProjectId, projects]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  useEffect(() => {
    const loadRulesAndPrompts = async () => {
      try {
        const [rulesRes, promptsRes] = await Promise.all([
          getRuleSets({ is_active: true }),
          getPromptTemplates({ is_active: true }),
        ]);
        setRuleSets(rulesRes.items);
        setPromptTemplates(promptsRes.items);
        const defaultRuleSet = rulesRes.items.find((r: AuditRuleSet) => r.is_default);
        if (defaultRuleSet) {
          setSelectedRuleSetId(defaultRuleSet.id);
        } else if (rulesRes.items.length > 0) {
          setSelectedRuleSetId(rulesRes.items[0].id);
        }
        const defaultPrompt = promptsRes.items.find((p: PromptTemplate) => p.is_default);
        if (defaultPrompt) {
          setSelectedPromptTemplateId(defaultPrompt.id);
        } else if (promptsRes.items.length > 0) {
          setSelectedPromptTemplateId(promptsRes.items[0].id);
        }
      } catch (error) {
        console.error("加载规则集和提示词失败:", error);
      }
    };
    loadRulesAndPrompts();
  }, []);

  useEffect(() => {
    if (open) {
      loadProjects();
      if (preselectedProjectId) {
        setSelectedProjectId(preselectedProjectId);
      }
      setSearchTerm("");
      setShowAdvanced(false);
      const defaultRuleSet = ruleSets.find(r => r.is_default);
      setSelectedRuleSetId(defaultRuleSet?.id || ruleSets[0]?.id || "");
      const defaultPrompt = promptTemplates.find(p => p.is_default);
      setSelectedPromptTemplateId(defaultPrompt?.id || promptTemplates[0]?.id || "");
      zipState.reset();
      setSelectedDesignDocPath(undefined);
    }
  }, [open, preselectedProjectId, ruleSets, promptTemplates]);

  // Reset design doc path when project changes
  useEffect(() => {
    if (selectedProject) {
      setSelectedDesignDocPath(selectedProject.design_doc_path || undefined);
    } else {
      setSelectedDesignDocPath(undefined);
    }
  }, [selectedProject?.id]);

  const excludePatternsRef = useRef(excludePatterns);
  useEffect(() => {
    if (excludePatternsRef.current !== excludePatterns && selectedFiles) {
      setSelectedFiles(undefined);
      toast.info("排除模式已更改，请重新选择文件");
    }
    excludePatternsRef.current = excludePatterns;
  }, [excludePatterns]);

  const handleStartScan = async () => {
    if (!selectedProject) {
      toast.error("请选择项目");
      return;
    }

    try {
      setCreating(true);
      
      // Update project's design_doc_path if a new one was selected
      if (selectedDesignDocPath !== undefined && selectedDesignDocPath !== selectedProject.design_doc_path) {
        try {
          await api.updateProject(selectedProject.id, { 
            design_doc_path: selectedDesignDocPath || undefined 
          });
          // Refresh project data to get updated design_doc_path
          await loadProjects();
        } catch (error) {
          console.error('Failed to update design doc path:', error);
          // Continue anyway, backend will use project's existing design_doc_path
        }
      }
      
      let taskId: string;

      if (auditMode === "agent") {
        // Use selected design doc path if specified, otherwise use project's default
        // Note: project's design_doc_path should already be updated above
        const designDocPath = selectedDesignDocPath !== undefined 
          ? selectedDesignDocPath 
          : selectedProject.design_doc_path || undefined;
        
        const agentTask = await createAgentTask({
          project_id: selectedProject.id,
          name: `Agent审计-${selectedProject.name}`,
          branch_name: isRepositoryProject(selectedProject) ? branch : undefined,
          exclude_patterns: excludePatterns,
          target_files: selectedFiles,
          design_doc_path: designDocPath,  // 🔥 使用选择的设计文档路径
          verification_level: "sandbox",
        });

        onOpenChange(false);
        onTaskCreated();
        toast.success("Agent 审计任务已创建");
        navigate(`/agent-audit/${agentTask.id}`);

        setSelectedProjectId("");
        setSelectedFiles(undefined);
        setExcludePatterns(DEFAULT_EXCLUDES);
        return;
      }

      if (isZipProject(selectedProject)) {
        if (zipState.useStoredZip && zipState.storedZipInfo?.has_file) {
          taskId = await scanStoredZipFile({
            projectId: selectedProject.id,
            excludePatterns,
            createdBy: "local-user",
            filePaths: selectedFiles,
            ruleSetId: selectedRuleSetId || undefined,
            promptTemplateId: selectedPromptTemplateId || undefined,
          });
        } else if (zipState.zipFile) {
          taskId = await scanZipFile({
            projectId: selectedProject.id,
            zipFile: zipState.zipFile,
            excludePatterns,
            createdBy: "local-user",
            ruleSetId: selectedRuleSetId || undefined,
            promptTemplateId: selectedPromptTemplateId || undefined,
          });
        } else {
          toast.error("请上传 ZIP 文件");
          return;
        }
      } else {
        if (!selectedProject.repository_url) {
          toast.error("仓库地址为空");
          return;
        }
        taskId = await runRepositoryAudit({
          projectId: selectedProject.id,
          repoUrl: selectedProject.repository_url,
          branch,
          exclude: excludePatterns,
          createdBy: "local-user",
          filePaths: selectedFiles,
          ruleSetId: selectedRuleSetId || undefined,
          promptTemplateId: selectedPromptTemplateId || undefined,
        });
      }

      onOpenChange(false);
      onTaskCreated();
      if (onFastScanStarted) {
        onFastScanStarted(taskId);
      }
      toast.success("扫描任务已启动");

      setSelectedProjectId("");
      setSelectedFiles(undefined);
      setExcludePatterns(DEFAULT_EXCLUDES);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "未知错误";
      toast.error(`启动失败: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  const canStart = useMemo(() => {
    if (!selectedProject) return false;
    if (isZipProject(selectedProject)) {
      return (
        (zipState.useStoredZip && zipState.storedZipInfo?.has_file) ||
        !!zipState.zipFile
      );
    }
    return !!selectedProject.repository_url && !!branch.trim();
  }, [selectedProject, zipState, branch]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!w-[min(90vw,520px)] !max-w-none max-h-[85vh] flex flex-col p-0 gap-0 bg-white border border-slate-200 rounded-lg shadow-xl sm:rounded-xl">
          {/* Header */}
          <DialogHeader className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-3 font-sans text-slate-900">
              <div className="p-2 bg-blue-50 rounded border border-blue-100">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-base font-bold">开始代码审计</span>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Code Security Analysis
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 项目选择 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  选择项目
                </span>
                <Badge variant="outline" className="font-mono text-[10px] text-slate-500 bg-slate-50">
                  {filteredProjects.length} 个
                </Badge>
              </div>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索项目..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-9 h-10 border-slate-200 focus:border-primary focus:ring-primary/20"
                />
              </div>

              {/* 项目列表 */}
              <ScrollArea className="h-[180px] border border-slate-200 rounded-md bg-slate-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Package className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">
                      {searchTerm ? "未找到" : "暂无项目"}
                    </span>
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredProjects.map((project) => (
                      <ProjectCard
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

            {/* 审计模式选择 */}
            {selectedProject && (
              <AgentModeSelector
                value={auditMode}
                onChange={setAuditMode}
                disabled={creating}
              />
            )}

            {/* 配置区域 */}
            {selectedProject && (
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  配置
                </span>

                {isRepositoryProject(selectedProject) ? (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-white">
                    <GitBranch className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-sm text-slate-600 w-12">
                      分支
                    </span>
                    {loadingBranches ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-slate-500">加载中...</span>
                      </div>
                    ) : (
                      <Select value={branch} onValueChange={setBranch}>
                        <SelectTrigger className="h-9 flex-1 border-slate-200">
                          <SelectValue placeholder="选择分支" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b} value={b} className="font-mono">
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <ZipUploadCard
                    zipState={zipState}
                    onUpload={async () => {
                      if (!zipState.zipFile || !selectedProject) return;
                      setUploading(true);
                      try {
                        await api.uploadProjectZip(selectedProject.id, zipState.zipFile);
                        toast.success("文件上传成功");
                        zipState.switchToStored();
                        loadProjects();
                      } catch (error) {
                        const msg = error instanceof Error ? error.message : "上传失败";
                        toast.error(msg);
                      } finally {
                        setUploading(false);
                      }
                    }}
                    uploading={uploading}
                  />
                )}

                {/* 规则集和提示词选择 - 仅快速扫描模式显示 */}
                {auditMode !== "agent" && (
                  <div className="p-3 border border-violet-200 rounded-lg bg-violet-50/50 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-bold text-violet-700">审计配置</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">规则集</label>
                        <Select value={selectedRuleSetId} onValueChange={setSelectedRuleSetId}>
                          <SelectTrigger className="h-9 text-xs bg-white border-violet-200">
                            <SelectValue placeholder="选择规则集" />
                          </SelectTrigger>
                          <SelectContent>
                            {ruleSets.map((rs) => (
                              <SelectItem key={rs.id} value={rs.id} className="text-xs">
                                {rs.name} {rs.is_default && '(默认)'} ({rs.enabled_rules_count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">提示词模板</label>
                        <Select value={selectedPromptTemplateId} onValueChange={setSelectedPromptTemplateId}>
                          <SelectTrigger className="h-9 text-xs bg-white border-violet-200">
                            <SelectValue placeholder="选择提示词模板" />
                          </SelectTrigger>
                          <SelectContent>
                            {promptTemplates.map((pt) => (
                              <SelectItem key={pt.id} value={pt.id} className="text-xs">
                                {pt.name} {pt.is_default && '(默认)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 高级选项 */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                    />
                    <Settings2 className="w-4 h-4" />
                    <span className="uppercase">高级选项</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {/* 排除模式 */}
                    <div className="p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500">
                          排除模式
                        </span>
                        <button
                          type="button"
                          onClick={() => setExcludePatterns(DEFAULT_EXCLUDES)}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          重置为默认
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {excludePatterns.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="bg-white border border-slate-200 text-slate-600 font-mono text-xs cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                            onClick={() =>
                              setExcludePatterns((prev) =>
                                prev.filter((x) => x !== p)
                              )
                            }
                          >
                            {p} ×
                          </Badge>
                        ))}
                        {excludePatterns.length === 0 && (
                          <span className="text-xs text-slate-400 font-mono">无排除模式</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-slate-500 font-medium mr-1">快捷添加:</span>
                        {[".test.", ".spec.", ".min.", "coverage/", "docs/", ".md"].map((pattern) => (
                          <button
                            key={pattern}
                            type="button"
                            disabled={excludePatterns.includes(pattern)}
                            onClick={() => {
                              if (!excludePatterns.includes(pattern)) {
                                setExcludePatterns((prev) => [...prev, pattern]);
                              }
                            }}
                            className="text-xs font-mono px-1.5 py-0.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-sm"
                          >
                            +{pattern}
                          </button>
                        ))}
                      </div>

                      <Input
                        placeholder="添加自定义排除模式，回车确认"
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value) {
                            const val = e.currentTarget.value.trim();
                            if (val && !excludePatterns.includes(val)) {
                              setExcludePatterns((prev) => [...prev, val]);
                            }
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>

                    {/* 文件选择 */}
                    {(() => {
                      const isRepo = isRepositoryProject(selectedProject);
                      const isZip = isZipProject(selectedProject);
                      const hasStoredZip = zipState.storedZipInfo?.has_file;
                      const useStored = zipState.useStoredZip;
                      const canSelectFiles = isRepo || (isZip && useStored && hasStoredZip);

                      return (
                        <div className="flex items-center justify-between p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                          <div>
                            <p className="text-xs uppercase font-bold text-slate-500">
                              扫描范围
                            </p>
                            <p className="text-sm font-semibold text-slate-800 mt-1">
                              {selectedFiles
                                ? `已选 ${selectedFiles.length} 个文件`
                                : "全部文件"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {selectedFiles && canSelectFiles && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedFiles(undefined)}
                                className="h-8 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              >
                                重置
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowFileSelection(true)}
                              disabled={!canSelectFiles}
                              className="h-8 text-xs font-semibold disabled:opacity-50"
                            >
                              <FolderOpen className="w-3 h-3 mr-1" />
                              选择文件
                            </Button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 设计文档选择 */}
                    {(() => {
                      const isRepo = isRepositoryProject(selectedProject);
                      const isZip = isZipProject(selectedProject);
                      const hasStoredZip = zipState.storedZipInfo?.has_file;
                      const useStored = zipState.useStoredZip;
                      const canSelectDesignDoc = isRepo || (isZip && useStored && hasStoredZip);

                      return (
                        <div className="flex items-center justify-between p-3 border border-dashed border-blue-300 rounded-lg bg-blue-50/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <p className="text-xs uppercase font-bold text-blue-700">
                                指定参考设计文档
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
                              {selectedDesignDocPath
                                ? selectedDesignDocPath
                                : selectedProject.design_doc_path
                                ? `项目默认: ${selectedProject.design_doc_path}`
                                : "未指定（将不使用设计文档）"}
                            </p>
                            {selectedDesignDocPath && (
                              <p className="text-xs text-blue-600 mt-1">
                                本次审计将使用此设计文档进行一致性检查
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {selectedDesignDocPath && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedDesignDocPath(undefined);
                                  // Update project's design_doc_path to empty
                                  if (selectedProject) {
                                    api.updateProject(selectedProject.id, { design_doc_path: undefined }).catch(() => {
                                      // Silent fail, just reset local state
                                    });
                                  }
                                }}
                                className="h-8 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              >
                                清除
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDesignDocSelection(true)}
                              disabled={!canSelectDesignDoc}
                              className="h-8 text-xs font-semibold disabled:opacity-50 border-blue-200 bg-white hover:bg-blue-50"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              选择文档
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex justify-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={creating}
              className="px-4 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            >
              取消
            </Button>
            <Button
              onClick={handleStartScan}
              disabled={!canStart || creating}
              className="px-5 h-10 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  启动中...
                </>
              ) : auditMode === "agent" ? (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  启动 Agent 审计
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  开始快速扫描
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FileSelectionDialog
        open={showFileSelection}
        onOpenChange={setShowFileSelection}
        projectId={selectedProjectId}
        branch={branch}
        excludePatterns={excludePatterns}
        onConfirm={setSelectedFiles}
      />

      {/* 设计文档选择对话框 - 只允许选择单个文件 */}
      <FileSelectionDialog
        open={showDesignDocSelection}
        onOpenChange={setShowDesignDocSelection}
        projectId={selectedProjectId}
        branch={branch}
        excludePatterns={excludePatterns}
        onConfirm={(files) => {
          if (files.length > 0) {
            const designDocPath = files[0]; // 只取第一个文件
            setSelectedDesignDocPath(designDocPath);
            toast.success("设计文档已选择，将在启动审计时更新项目配置");
          } else {
            setSelectedDesignDocPath(undefined);
          }
          setShowDesignDocSelection(false);
        }}
      />
    </>
  );
}

function ProjectCard({
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
      className={`flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-all ${selected
        ? "bg-blue-50 border border-blue-200"
        : "hover:bg-slate-100 border border-transparent"
        }`}
      onClick={onSelect}
    >
      <Checkbox
        checked={selected}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />

      <div className={`p-1.5 rounded-md ${isRepo ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
        {isRepo ? (
          <Globe className="w-4 h-4" />
        ) : (
          <Package className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm truncate ${selected ? 'text-primary font-semibold' : 'text-slate-700'}`}>
            {project.name}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1 py-0 font-mono border ${isRepo
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "bg-amber-50 text-amber-600 border-amber-200"
              }`}
          >
            {isRepo ? "REPO" : "ZIP"}
          </Badge>
        </div>
        {project.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2" title={project.description}>
            {project.description}
          </p>
        )}
      </div>
    </div>
  );
}

function ZipUploadCard({
  zipState,
  onUpload,
  uploading,
}: {
  zipState: ReturnType<typeof useZipFile>;
  onUpload: () => void;
  uploading: boolean;
}) {
  if (zipState.loading) {
    return (
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-slate-500">
          检查文件中...
        </span>
      </div>
    );
  }

  if (zipState.storedZipInfo?.has_file) {
    return (
      <div className="p-3 border border-emerald-200 rounded-lg bg-emerald-50/50 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-100 rounded-md">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">
              {zipState.storedZipInfo.original_filename}
            </p>
            <p className="text-xs text-emerald-600 font-mono">
              {zipState.storedZipInfo.file_size &&
                formatFileSize(zipState.storedZipInfo.file_size)}
              {zipState.storedZipInfo.uploaded_at &&
                ` · ${new Date(zipState.storedZipInfo.uploaded_at).toLocaleDateString("zh-CN")}`}
            </p>
          </div>
        </div>

        <div className="flex gap-4 pt-2 border-t border-emerald-200">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={zipState.useStoredZip}
              onChange={() => zipState.switchToStored()}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-emerald-700 font-medium">使用此文件</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={!zipState.useStoredZip}
              onChange={() => zipState.switchToUpload()}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-emerald-700 font-medium">上传新文件</span>
          </label>
        </div>

        {!zipState.useStoredZip && (
          <div className="flex gap-2 items-center">
            <Input
              type="file"
              accept=".zip"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const v = validateZipFile(file);
                  if (!v.valid) {
                    toast.error(v.error || "文件无效");
                    e.target.value = "";
                    return;
                  }
                  zipState.handleFileSelect(file, e.target);
                }
              }}
              className="h-9 flex-1 bg-white"
            />
            {zipState.zipFile && (
              <Button
                size="sm"
                onClick={onUpload}
                disabled={uploading}
                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex flex-col items-center justify-center p-4">
        <div className="p-3 bg-white rounded-full shadow-sm mb-3">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-slate-900 mb-1">
          上传项目源码
        </p>
        <p className="text-xs text-slate-500 mb-4 text-center">
          支持 .zip 格式压缩包<br />
          最大支持 50MB
        </p>

        <div className="flex w-full gap-2">
          <Input
            type="file"
            accept=".zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const v = validateZipFile(file);
                if (!v.valid) {
                  toast.error(v.error || "文件无效");
                  e.target.value = "";
                  return;
                }
                zipState.handleFileSelect(file, e.target);
              }
            }}
            className="h-9 flex-1 bg-white cursor-pointer"
          />
          {zipState.zipFile && (
            <Button
              size="sm"
              onClick={onUpload}
              disabled={uploading}
              className="h-9 px-3 bg-primary"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
