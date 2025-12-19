/**
 * Export Report Dialog
 * Corporate Blue Theme
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileJson, FileText, Download, Loader2, Terminal } from "lucide-react";
import type { AuditTask, AuditIssue } from "@/shared/types";
import { exportToJSON, exportToPDF } from "@/features/reports/services/reportExport";
import { toast } from "sonner";

interface ExportReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: AuditTask;
    issues: AuditIssue[];
}

type ExportFormat = "json" | "pdf";

export default function ExportReportDialog({
    open,
    onOpenChange,
    task,
    issues
}: ExportReportDialogProps) {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            switch (selectedFormat) {
                case "json":
                    await exportToJSON(task, issues);
                    toast.success("JSON 报告已导出");
                    break;
                case "pdf":
                    await exportToPDF(task, issues);
                    toast.success("PDF 报告已导出");
                    break;
            }
            onOpenChange(false);
        } catch (error) {
            console.error("导出报告失败:", error);
            toast.error("导出报告失败，请重试");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white border-slate-200 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                        <Download className="w-5 h-5 text-primary" />
                        导出审计报告
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm">
                        选择报告格式并导出完整的代码审计结果
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <RadioGroup
                        value={selectedFormat}
                        onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                        className="space-y-4"
                    >
                        <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${selectedFormat === 'json' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}>
                            <RadioGroupItem value="json" id="json" />
                            <Label htmlFor="json" className="flex items-center gap-3 cursor-pointer flex-1">
                                <FileJson className="w-5 h-5 text-amber-500" />
                                <div>
                                    <div className="font-semibold text-slate-900">JSON 格式</div>
                                    <div className="text-xs text-slate-500">结构化数据，适合程序处理和集成</div>
                                </div>
                            </Label>
                        </div>
                        <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${selectedFormat === 'pdf' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}>
                            <RadioGroupItem value="pdf" id="pdf" />
                            <Label htmlFor="pdf" className="flex items-center gap-3 cursor-pointer flex-1">
                                <FileText className="w-5 h-5 text-rose-500" />
                                <div>
                                    <div className="font-semibold text-slate-900">PDF 格式</div>
                                    <div className="text-xs text-slate-500">专业报告，适合打印和分享</div>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>

                    {/* 报告预览信息 */}
                    <div className="mt-6 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
                            <Terminal className="w-3 h-3 text-slate-500" />
                            <h4 className="font-semibold text-slate-700 text-xs uppercase">报告内容预览</h4>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3 text-xs font-mono">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">项目名称:</span>
                                <span className="font-semibold text-slate-900">{task.project?.name || "未知"}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">质量评分:</span>
                                <span className="font-semibold text-emerald-600">{task.quality_score.toFixed(1)}/100</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">扫描文件:</span>
                                <span className="font-semibold text-slate-900">{task.scanned_files}/{task.total_files}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">发现问题:</span>
                                <span className="font-semibold text-amber-600">{issues.length}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">代码行数:</span>
                                <span className="font-semibold text-slate-900">{task.total_lines.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">严重问题:</span>
                                <span className="font-semibold text-rose-600">
                                    {issues.filter(i => i.severity === "critical").length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-100 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                导出中...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                导出报告
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
