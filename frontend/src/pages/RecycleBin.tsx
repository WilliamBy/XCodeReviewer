/**
 * Recycle Bin Page
 * Corporate Blue Theme
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Search,
  GitBranch,
  Calendar,
  Users,
  ExternalLink,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { api } from "@/shared/config/database";
import type { Project } from "@/shared/types";
import { toast } from "sonner";
import { isRepositoryProject, getSourceTypeBadge } from "@/shared/utils/projectUtils";

export default function RecycleBin() {
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadDeletedProjects();
  }, []);

  const loadDeletedProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getDeletedProjects();
      setDeletedProjects(data);
    } catch (error) {
      console.error('Failed to load deleted projects:', error);
      toast.error("加载已删除项目失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (project: Project) => {
    setSelectedProject(project);
    setShowRestoreDialog(true);
  };

  const handlePermanentDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setShowPermanentDeleteDialog(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedProject) return;

    try {
      await api.restoreProject(selectedProject.id);
      toast.success(`项目 "${selectedProject.name}" 已恢复`);
      setShowRestoreDialog(false);
      setSelectedProject(null);
      loadDeletedProjects();
    } catch (error) {
      console.error('Failed to restore project:', error);
      toast.error("恢复项目失败");
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!selectedProject) return;

    try {
      await api.permanentlyDeleteProject(selectedProject.id);

      toast.success(`项目 "${selectedProject.name}" 已永久删除`);
      setShowPermanentDeleteDialog(false);
      setSelectedProject(null);
      loadDeletedProjects();
    } catch (error) {
      console.error('Failed to permanently delete project:', error);
      toast.error("永久删除项目失败");
    }
  };

  const filteredProjects = deletedProjects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRepositoryIcon = (type?: string) => {
    switch (type) {
      case 'github': return '🐙';
      case 'gitlab': return '🦊';
      default: return '📁';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto text-primary" />
          <p className="text-slate-500 font-sans text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans relative">

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-0 relative z-10 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 rounded-lg">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">回收站</h3>
              <p className="text-xs text-slate-500">管理已删除的项目</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">{deletedProjects.length} 个项目</Badge>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="搜索已删除的项目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-slate-200 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <div key={project.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
              {/* Project Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-lg rounded-lg shadow-sm">
                      {getRepositoryIcon(project.repository_type)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 truncate max-w-[150px] group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="destructive" className="bg-rose-100 text-rose-600 hover:bg-rose-100 border-rose-200 shadow-none">已删除</Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px]">
                      {project.source_type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Project Info */}
                <div className="space-y-3">
                  {isRepositoryProject(project) && project.repository_url && (
                    <div className="flex items-center text-xs text-slate-500">
                      <GitBranch className="w-4 h-4 mr-2 flex-shrink-0 text-slate-400" />
                      <a
                        href={project.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors flex items-center truncate font-medium"
                      >
                        <span className="truncate">{project.repository_url.replace('https://', '')}</span>
                        <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      删除于 {formatDate(project.updated_at)}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-slate-400" />
                      {project.owner?.full_name || '未知'}
                    </div>
                  </div>
                </div>

                {/* Programming Languages */}
                {project.programming_languages && (
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(project.programming_languages).slice(0, 4).map((lang: string) => (
                      <Badge key={lang} variant="outline" className="text-xs font-normal bg-slate-50 text-slate-600 border-slate-200">
                        {lang}
                      </Badge>
                    ))}
                    {JSON.parse(project.programming_languages).length > 4 && (
                      <Badge variant="outline" className="text-xs font-normal bg-slate-50 text-slate-500 border-slate-200">
                        +{JSON.parse(project.programming_languages).length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 bg-white text-emerald-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-medium"
                    onClick={() => handleRestoreClick(project)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    恢复
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 bg-white text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 font-medium"
                    onClick={() => handlePermanentDeleteClick(project)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    永久删除
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600">
                {searchTerm ? '未找到匹配的项目' : '回收站为空'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm ? '尝试调整搜索条件' : '回收站中没有已删除的项目'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="bg-white border-slate-200 shadow-xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <RotateCcw className="w-5 h-5 text-emerald-500" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-900">
                确认恢复项目
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-500">
              您确定要恢复项目 <span className="font-bold text-slate-900">"{selectedProject?.name}"</span> 吗？
              <br /><br />
              恢复后，该项目将重新出现在项目列表中，您可以继续使用该项目的所有功能。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-emerald-600"
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
        <AlertDialogContent className="bg-white border-slate-200 shadow-xl max-w-md p-0 overflow-hidden">
          <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-700">警告：永久删除</h3>
              <p className="text-xs text-rose-600/80 font-medium">此操作不可撤销</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-slate-600">
              您确定要<span className="font-bold text-rose-600">永久删除</span>项目 <span className="font-bold text-slate-900">"{selectedProject?.name}"</span> 吗？
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 mb-1">后果说明:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>项目数据将被彻底清除</li>
                <li>所有相关的审计历史和报告都将丢失</li>
                <li>无法联系管理员恢复数据</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPermanentDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm border-rose-600"
            >
              确认永久删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
