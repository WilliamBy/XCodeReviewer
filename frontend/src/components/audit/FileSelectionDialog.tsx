/**
 * File Selection Dialog
 * Corporate Blue Theme
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    FileText,
    CheckSquare,
    Square,
    FolderOpen,
    Folder,
    ChevronRight,
    ChevronDown,
    FileCode,
    FileJson,
    File,
    Filter,
    RotateCcw,
    RefreshCw,
    Terminal,
} from "lucide-react";
import { api } from "@/shared/config/database";
import { toast } from "sonner";

interface FileSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    branch?: string;
    excludePatterns?: string[];
    onConfirm: (selectedFiles: string[]) => void;
}

interface FileNode {
    path: string;
    size: number;
}

interface FolderNode {
    name: string;
    path: string;
    files: FileNode[];
    subfolders: Map<string, FolderNode>;
    expanded: boolean;
}

// File type icon mapping
const getFileIcon = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    const codeExts = [
        "js", "ts", "tsx", "jsx", "py", "java", "go", "rs", "cpp", "c", "h",
        "cs", "php", "rb", "swift", "kt", "sh",
    ];
    const configExts = ["json", "yml", "yaml", "toml", "xml", "ini"];

    if (codeExts.includes(ext)) {
        return <FileCode className="w-4 h-4 text-blue-500" />;
    }
    if (configExts.includes(ext)) {
        return <FileJson className="w-4 h-4 text-amber-500" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
};

// Get file extension
const getExtension = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return ext;
};

// Build folder tree structure
const buildFolderTree = (files: FileNode[]): FolderNode => {
    const root: FolderNode = {
        name: "",
        path: "",
        files: [],
        subfolders: new Map(),
        expanded: true,
    };

    files.forEach((file) => {
        const parts = file.path.split("/");
        let current = root;

        // Traverse path parts (except filename)
        for (let i = 0; i < parts.length - 1; i++) {
            const folderName = parts[i];
            const folderPath = parts.slice(0, i + 1).join("/");

            if (!current.subfolders.has(folderName)) {
                current.subfolders.set(folderName, {
                    name: folderName,
                    path: folderPath,
                    files: [],
                    subfolders: new Map(),
                    expanded: true,
                });
            }
            current = current.subfolders.get(folderName)!;
        }

        // Add file to current folder
        current.files.push(file);
    });

    return root;
};

export default function FileSelectionDialog({
    open,
    onOpenChange,
    projectId,
    branch,
    excludePatterns,
    onConfirm,
}: FileSelectionDialogProps) {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
    const [filterType, setFilterType] = useState<string>("");

    useEffect(() => {
        if (open && projectId) {
            loadFiles();
        } else {
            setFiles([]);
            setSelectedFiles(new Set());
            setSearchTerm("");
            setExpandedFolders(new Set());
            setFilterType("");
        }
    }, [open, projectId, branch, excludePatterns]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const data = await api.getProjectFiles(projectId, branch, excludePatterns);
            setFiles(data);
            setSelectedFiles(new Set(data.map((f) => f.path)));
            // Default expand all folders
            const folders = new Set<string>();
            data.forEach((f) => {
                const parts = f.path.split("/");
                for (let i = 1; i < parts.length; i++) {
                    folders.add(parts.slice(0, i).join("/"));
                }
            });
            setExpandedFolders(folders);
        } catch (error) {
            console.error("Failed to load files:", error);
            toast.error("加载文件列表失败");
        } finally {
            setLoading(false);
        }
    };

    // Get all file types
    const fileTypes = useMemo(() => {
        const types = new Map<string, number>();
        files.forEach((f) => {
            const ext = getExtension(f.path);
            if (ext) {
                types.set(ext, (types.get(ext) || 0) + 1);
            }
        });
        return Array.from(types.entries()).sort((a, b) => b[1] - a[1]);
    }, [files]);

    // Filtered files
    const filteredFiles = useMemo(() => {
        let result = files;

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter((f) => f.path.toLowerCase().includes(term));
        }

        // Filter by file type
        if (filterType) {
            result = result.filter((f) => getExtension(f.path) === filterType);
        }

        return result;
    }, [files, searchTerm, filterType]);

    // Build folder tree
    const folderTree = useMemo(() => buildFolderTree(filteredFiles), [filteredFiles]);

    const handleToggleFile = useCallback((path: string) => {
        setSelectedFiles((prev) => {
            const newSelected = new Set(prev);
            if (newSelected.has(path)) {
                newSelected.delete(path);
            } else {
                newSelected.add(path);
            }
            return newSelected;
        });
    }, []);

    const handleToggleFolder = useCallback(
        (folderPath: string) => {
            // Get all files under this folder
            const folderFiles = filteredFiles.filter(
                (f) => f.path.startsWith(folderPath + "/") || f.path === folderPath
            );

            setSelectedFiles((prev) => {
                const newSelected = new Set(prev);
                const allSelected = folderFiles.every((f) => newSelected.has(f.path));

                if (allSelected) {
                    // Deselect all files in folder
                    folderFiles.forEach((f) => newSelected.delete(f.path));
                } else {
                    // Select all files in folder
                    folderFiles.forEach((f) => newSelected.add(f.path));
                }
                return newSelected;
            });
        },
        [filteredFiles]
    );

    const handleExpandFolder = useCallback((folderPath: string) => {
        setExpandedFolders((prev) => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(folderPath)) {
                newExpanded.delete(folderPath);
            } else {
                newExpanded.add(folderPath);
            }
            return newExpanded;
        });
    }, []);

    const handleSelectAll = () => {
        setSelectedFiles(new Set(filteredFiles.map((f) => f.path)));
    };

    const handleDeselectAll = () => {
        const filteredPaths = new Set(filteredFiles.map((f) => f.path));
        setSelectedFiles((prev) => {
            const newSelected = new Set(prev);
            filteredPaths.forEach((p) => newSelected.delete(p));
            return newSelected;
        });
    };

    const handleInvertSelection = () => {
        const filteredPaths = new Set(filteredFiles.map((f) => f.path));
        setSelectedFiles((prev) => {
            const newSelected = new Set(prev);
            filteredPaths.forEach((p) => {
                if (newSelected.has(p)) {
                    newSelected.delete(p);
                } else {
                    newSelected.add(p);
                }
            });
            return newSelected;
        });
    };

    const handleConfirm = () => {
        if (selectedFiles.size === 0) {
            toast.error("请至少选择一个文件");
            return;
        }
        onConfirm(Array.from(selectedFiles));
        onOpenChange(false);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    // Check folder selection state
    const getFolderSelectionState = (
        folderPath: string
    ): "all" | "some" | "none" => {
        const folderFiles = filteredFiles.filter((f) =>
            f.path.startsWith(folderPath + "/")
        );
        if (folderFiles.length === 0) return "none";

        const selectedCount = folderFiles.filter((f) =>
            selectedFiles.has(f.path)
        ).length;
        if (selectedCount === 0) return "none";
        if (selectedCount === folderFiles.length) return "all";
        return "some";
    };

    // Render folder tree
    const renderFolderTree = (node: FolderNode, depth: number = 0) => {
        const items: React.ReactNode[] = [];

        // Render subfolders
        Array.from(node.subfolders.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((folder) => {
                const isExpanded = expandedFolders.has(folder.path);
                const selectionState = getFolderSelectionState(folder.path);

                items.push(
                    <div key={`folder-${folder.path}`}>
                        <div
                            className="flex items-center space-x-2 p-2 hover:bg-slate-100 border border-transparent hover:border-slate-200 cursor-pointer transition-colors rounded-lg"
                            style={{ paddingLeft: `${depth * 16 + 8}px` }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandFolder(folder.path);
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                            </button>
                            <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectionState === "all"}
                                    ref={(el) => {
                                        if (el) {
                                            (el as HTMLButtonElement).dataset.state =
                                                selectionState === "some" ? "indeterminate" : selectionState === "all" ? "checked" : "unchecked";
                                        }
                                    }}
                                    onCheckedChange={() => handleToggleFolder(folder.path)}
                                    className="border-slate-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </div>
                            {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-amber-500" />
                            ) : (
                                <Folder className="w-4 h-4 text-amber-500" />
                            )}
                            <span
                                className="text-sm font-sans font-medium flex-1 text-slate-700"
                                onClick={() => handleExpandFolder(folder.path)}
                            >
                                {folder.name}
                            </span>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200 font-mono text-[10px]">
                                {
                                    filteredFiles.filter((f) =>
                                        f.path.startsWith(folder.path + "/")
                                    ).length
                                }
                            </Badge>
                        </div>
                        {isExpanded && renderFolderTree(folder, depth + 1)}
                    </div>
                );
            });

        // Render files
        node.files
            .sort((a, b) => a.path.localeCompare(b.path))
            .forEach((file) => {
                const fileName = file.path.split("/").pop() || file.path;
                items.push(
                    <div
                        key={`file-${file.path}`}
                        className="flex items-center space-x-3 p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors rounded-lg"
                        style={{ paddingLeft: `${depth * 16 + 32}px` }}
                        onClick={() => handleToggleFile(file.path)}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                                checked={selectedFiles.has(file.path)}
                                onCheckedChange={() => handleToggleFile(file.path)}
                                className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </div>
                        {getFileIcon(file.path)}
                        <span
                            className="text-sm font-mono flex-1 min-w-0 truncate text-slate-600"
                            title={file.path}
                        >
                            {fileName}
                        </span>
                        {file.size > 0 && (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 font-mono text-[10px] flex-shrink-0">
                                {formatSize(file.size)}
                            </Badge>
                        )}
                    </div>
                );
            });

        return items;
    };

    // Render flat list
    const renderFlatList = () => {
        return filteredFiles.map((file) => (
            <div
                key={file.path}
                className="flex items-center space-x-3 p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors rounded-lg"
                onClick={() => handleToggleFile(file.path)}
            >
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={selectedFiles.has(file.path)}
                        onCheckedChange={() => handleToggleFile(file.path)}
                        className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                </div>
                {getFileIcon(file.path)}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate text-slate-600" title={file.path}>
                        {file.path}
                    </p>
                </div>
                {file.size > 0 && (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 font-mono text-[10px] flex-shrink-0">
                        {formatSize(file.size)}
                    </Badge>
                )}
            </div>
        ));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[1000px] !w-[95vw] max-h-[85vh] flex flex-col bg-white border-slate-200 shadow-xl !fixed p-0 gap-0 rounded-lg overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <FolderOpen className="w-5 h-5 text-primary" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-800">
                            选择要审计的文件
                        </DialogTitle>
                    </div>
                    {excludePatterns && excludePatterns.length > 0 && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 font-mono text-xs ml-auto border-slate-200">
                            已排除 {excludePatterns.length} 种模式
                        </Badge>
                    )}
                </DialogHeader>

                <div className="p-5 flex-1 flex flex-col min-h-0 space-y-4 overflow-y-auto bg-slate-50/30">
                    {/* Toolbar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="搜索文件..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 border-slate-200 focus:ring-primary/20 bg-white"
                            />
                        </div>

                        {/* File Type Filter */}
                        {fileTypes.length > 0 && (
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 h-10">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="h-full bg-transparent border-none text-sm text-slate-600 focus:ring-0 outline-none min-w-[120px]"
                                >
                                    <option value="">全部类型</option>
                                    {fileTypes.slice(0, 10).map(([ext, count]) => (
                                        <option key={ext} value={ext}>
                                            .{ext} ({count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* View Toggle */}
                        <div className="flex border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm h-10">
                            <button
                                onClick={() => setViewMode("tree")}
                                className={`px-4 py-1.5 text-xs font-semibold uppercase transition-colors ${viewMode === "tree" ? "bg-slate-100 text-primary" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                树形
                            </button>
                            <div className="w-px bg-slate-200"></div>
                            <button
                                onClick={() => setViewMode("flat")}
                                className={`px-4 py-1.5 text-xs font-semibold uppercase transition-colors ${viewMode === "flat" ? "bg-slate-100 text-primary" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                列表
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                className="h-8 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                            >
                                <CheckSquare className="w-3 h-3 mr-1.5" />
                                全选
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeselectAll}
                                className="h-8 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                            >
                                <Square className="w-3 h-3 mr-1.5" />
                                清空
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleInvertSelection}
                                className="h-8 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                            >
                                <RefreshCw className="w-3 h-3 mr-1.5" />
                                反选
                            </Button>
                            {(searchTerm || filterType) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterType("");
                                    }}
                                    className="h-8 px-3 text-slate-500 hover:text-slate-700"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    重置筛选
                                </Button>
                            )}
                        </div>
                        <div className="text-sm text-slate-500">
                            {searchTerm || filterType ? (
                                <span>
                                    筛选: {filteredFiles.length}/{files.length} 个文件，
                                    已选 <span className="text-primary font-bold">{selectedFiles.size}</span> 个
                                </span>
                            ) : (
                                <span>
                                    共 {files.length} 个文件，已选 <span className="text-primary font-bold">{selectedFiles.size}</span> 个
                                </span>
                            )}
                        </div>
                    </div>

                    {/* File List */}
                    <div className="border border-slate-200 bg-white relative h-[450px] overflow-hidden rounded-lg shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <div className="loading-spinner text-primary" />
                            </div>
                        ) : filteredFiles.length > 0 ? (
                            <div className="h-full overflow-auto custom-scrollbar">
                                <div className="p-2 space-y-0.5">
                                    {viewMode === "tree"
                                        ? renderFolderTree(folderTree)
                                        : renderFlatList()}
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm font-medium">
                                    {searchTerm || filterType
                                        ? "没有匹配的文件"
                                        : "没有找到文件"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-5 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex justify-between items-center">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        提示：点击文件夹可展开/折叠，点击文件夹复选框可批量选择
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="px-4 h-10 border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedFiles.size === 0}
                            className="px-5 h-10 bg-primary hover:bg-primary/90 shadow-sm"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            确认选择 ({selectedFiles.size})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
