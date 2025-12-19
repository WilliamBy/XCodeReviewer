/**
 * Instant Analysis Page
 * Corporate Blue Theme
 */

import { useState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Code,
  FileText,
  Info,
  Lightbulb,
  Shield,
  Target,
  TrendingUp,
  Upload,
  Zap,
  X,
  Download,
  History,
  ChevronRight,
  MessageSquare,
  Terminal,
  Activity
} from "lucide-react";
import { CodeAnalysisEngine } from "@/features/analysis/services";
import { api } from "@/shared/config/database";
import type { CodeAnalysisResult, InstantAnalysis as InstantAnalysisType } from "@/shared/types";
import { toast } from "sonner";
import InstantExportDialog from "@/components/reports/InstantExportDialog";
import { getPromptTemplates, type PromptTemplate } from "@/shared/api/prompts";

// AI explanation parser
function parseAIExplanation(aiExplanation: string) {
  try {
    const parsed = JSON.parse(aiExplanation);
    if (parsed.xai) return parsed.xai;
    if (parsed.what || parsed.why || parsed.how) return parsed;
    return null;
  } catch (error) {
    return null;
  }
}

export default function InstantAnalysis() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CodeAnalysisResult | null>(null);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingCardRef = useRef<HTMLDivElement>(null);

  // History related state
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<InstantAnalysisType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Prompt templates
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string>("");

  const supportedLanguages = CodeAnalysisEngine.getSupportedLanguages();

  // Load prompt templates
  useEffect(() => {
    const loadPromptTemplates = async () => {
      try {
        const res = await getPromptTemplates({ is_active: true });
        setPromptTemplates(res.items);
        const defaultTemplate = res.items.find(t => t.is_default);
        if (defaultTemplate) {
          setSelectedPromptTemplateId(defaultTemplate.id);
        } else if (res.items.length > 0) {
          setSelectedPromptTemplateId(res.items[0].id);
        }
      } catch (error) {
        console.error("加载提示词模板失败:", error);
      }
    };
    loadPromptTemplates();
  }, []);

  // Load history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const records = await api.getInstantAnalyses();
      setHistoryRecords(records);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('加载历史记录失败');
    } finally {
      setLoadingHistory(false);
    }
  };

  // View history record details
  const viewHistoryRecord = (record: InstantAnalysisType) => {
    try {
      const analysisResult = JSON.parse(record.analysis_result) as CodeAnalysisResult;
      setResult(analysisResult);
      setLanguage(record.language);
      setAnalysisTime(record.analysis_time);
      setSelectedHistoryId(record.id);
      setCurrentAnalysisId(record.id);
      setShowHistory(false);
      toast.success('已加载历史分析结果');
    } catch (error) {
      console.error('Failed to parse history record:', error);
      toast.error('解析历史记录失败');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Delete single history record
  const deleteHistoryRecord = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    try {
      await api.deleteInstantAnalysis(recordId);
      setHistoryRecords(prev => prev.filter(r => r.id !== recordId));
      if (selectedHistoryId === recordId) {
        setSelectedHistoryId(null);
        setResult(null);
      }
      toast.success('删除成功');
    } catch (error) {
      console.error('Failed to delete history:', error);
      toast.error('删除失败');
    }
  };

  // Clear all history
  const clearAllHistory = async () => {
    if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) return;
    try {
      await api.deleteAllInstantAnalyses();
      setHistoryRecords([]);
      setSelectedHistoryId(null);
      toast.success('已清空所有历史记录');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('清空失败');
    }
  };

  // Toggle history panel
  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  // Auto scroll to loading card when analyzing
  useEffect(() => {
    if (analyzing && loadingCardRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (loadingCardRef.current) {
            loadingCardRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 50);
      });
    }
  }, [analyzing]);

  // Example codes
  const exampleCodes = {
    javascript: `// 示例JavaScript代码 - 包含多种问题
var userName = "admin";
var password = "123456"; // 硬编码密码

function validateUser(input) {
    if (input == userName) { // 使用 == 比较
        console.log("User validated"); // 生产代码中的console.log
        return true;
    }
    return false;
}

// 性能问题：循环中重复计算长度
function processItems(items) {
    for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < items.length; j++) {
            console.log(items[i] + items[j]);
        }
    }
}

// 安全问题：使用eval
function executeCode(userInput) {
    eval(userInput); // 危险的eval使用
}`,
    python: `# 示例Python代码 - 包含多种问题
import *  # 通配符导入

password = "secret123"  # 硬编码密码

def process_data(data):
    try:
        result = []
        for item in data:
            print(item)  # 使用print而非logging
            result.append(item * 2)
        return result
    except:  # 裸露的except语句
        pass`,
    java: `// 示例Java代码 - 包含多种问题
public class Example {
    private String password = "admin123"; // 硬编码密码

    public void processData() {
        System.out.println("Processing..."); // 使用System.out.print

        try {
            String data = getData();
        } catch (Exception e) {
            // 空的异常处理
        }
    }
}`
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error("请输入要分析的代码");
      return;
    }
    if (!language) {
      toast.error("请选择编程语言");
      return;
    }

    try {
      setAnalyzing(true);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);

      const startTime = Date.now();
      const analysisResult = await CodeAnalysisEngine.analyzeCode(code, language, selectedPromptTemplateId || undefined);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      setResult(analysisResult);
      setAnalysisTime(analysisResult.analysis_time || duration);
      setCurrentAnalysisId(analysisResult.analysis_id || null);

      toast.success(`分析完成！发现 ${analysisResult.issues.length} 个问题`);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(error?.message || "分析失败，请稍后重试");
    } finally {
      setAnalyzing(false);
      setCode("");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);

      const extension = file.name.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'java': 'java', 'go': 'go', 'rs': 'rust',
        'cpp': 'cpp', 'c': 'cpp', 'cs': 'csharp', 'php': 'php',
        'rb': 'ruby', 'swift': 'swift', 'kt': 'kotlin'
      };

      if (extension && languageMap[extension]) {
        setLanguage(languageMap[extension]);
      }
    };
    reader.readAsText(file);
  };

  const loadExampleCode = (lang: string) => {
    const example = exampleCodes[lang as keyof typeof exampleCodes];
    if (example) {
      setCode(example);
      setLanguage(lang);
      toast.success(`已加载${lang}示例代码`);
    }
  };

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-600 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-600 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
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

  const clearAnalysis = () => {
    setCode("");
    setLanguage("");
    setResult(null);
    setAnalysisTime(0);
  };

  // Render issue with corporate style
  const renderIssue = (issue: any, index: number) => (
    <div key={index} className="bg-white border border-slate-200 rounded-lg p-5 mb-4 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${issue.severity === 'critical' ? 'bg-rose-50 text-rose-600' :
              issue.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                issue.severity === 'medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-blue-50 text-blue-600'
            }`}>
            {getTypeIcon(issue.type)}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base text-slate-800 mb-1 group-hover:text-primary transition-colors">{issue.title}</h4>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <span className="text-primary font-bold">L{issue.line}</span>
              {issue.column && <span>: C{issue.column}</span>}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={`${getSeverityClasses(issue.severity)} font-semibold uppercase px-2.5 py-0.5 shadow-none`}>
          {issue.severity === 'critical' ? '严重' :
            issue.severity === 'high' ? '高' :
              issue.severity === 'medium' ? '中等' : '低'}
        </Badge>
      </div>

      {issue.description && (
        <div className="bg-slate-50 border border-slate-200 p-4 mb-4 rounded-lg">
          <div className="flex items-center mb-2 border-b border-slate-200 pb-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mr-2" />
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wide">问题详情</span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">{issue.description}</p>
        </div>
      )}

      {issue.code_snippet && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-4">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Code className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400 text-xs font-mono font-medium">CODE SNIPPET</span>
            </div>
          </div>
          <div className="p-3 overflow-x-auto">
            <pre className="text-sm text-slate-300 font-mono">
              <code>{issue.code_snippet}</code>
            </pre>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {issue.suggestion && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
            <div className="flex items-center mb-2 border-b border-blue-200 pb-2">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 mr-2" />
              <span className="font-bold text-blue-700 text-xs uppercase tracking-wide">修复建议</span>
            </div>
            <p className="text-blue-900/80 text-sm leading-relaxed font-medium">{issue.suggestion}</p>
          </div>
        )}

        {issue.ai_explanation && (() => {
          const parsedExplanation = parseAIExplanation(issue.ai_explanation);

          if (parsedExplanation) {
            return (
              <div className="bg-violet-50 border border-violet-100 p-4 rounded-lg">
                <div className="flex items-center mb-2 border-b border-violet-200 pb-2">
                  <Zap className="w-3.5 h-3.5 text-violet-600 mr-2" />
                  <span className="font-bold text-violet-700 text-xs uppercase tracking-wide">AI 深度解析</span>
                </div>
                <div className="space-y-3 text-sm">
                  {parsedExplanation.what && (
                    <div className="border-l-2 border-rose-400 pl-3">
                      <span className="font-bold text-rose-600 block mb-0.5">问题是什么:</span>
                      <span className="text-slate-600 leading-relaxed">{parsedExplanation.what}</span>
                    </div>
                  )}
                  {parsedExplanation.why && (
                    <div className="border-l-2 border-amber-400 pl-3">
                      <span className="font-bold text-amber-600 block mb-0.5">为什么会发生:</span>
                      <span className="text-slate-600 leading-relaxed">{parsedExplanation.why}</span>
                    </div>
                  )}
                  {parsedExplanation.how && (
                    <div className="border-l-2 border-emerald-400 pl-3">
                      <span className="font-bold text-emerald-600 block mb-0.5">如何修复:</span>
                      <span className="text-slate-600 leading-relaxed">{parsedExplanation.how}</span>
                    </div>
                  )}
                  {parsedExplanation.learn_more && (
                    <div className="border-l-2 border-blue-400 pl-3">
                      <span className="font-bold text-blue-600 block mb-0.5">了解更多:</span>
                      <a
                        href={parsedExplanation.learn_more}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs break-all"
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
              <div className="bg-violet-50 border border-violet-100 p-4 rounded-lg">
                <div className="flex items-center mb-2 border-b border-violet-200 pb-2">
                  <Zap className="w-3.5 h-3.5 text-violet-600 mr-2" />
                  <span className="font-bold text-violet-700 text-xs uppercase tracking-wide">AI 解析</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{issue.ai_explanation}</p>
              </div>
            );
          }
        })()}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen font-sans relative">

      {/* History Panel */}
      {showHistory && (
        <div className="cloud-card p-0 relative z-10 animate-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-800">分析历史记录</h3>
            </div>
            <div className="flex items-center gap-2">
              {historyRecords.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAllHistory}
                  size="sm"
                  className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  清空全部
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setShowHistory(false)}
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </Button>
            </div>
          </div>
          <div className="p-4 bg-slate-50/10">
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="loading-spinner mx-auto mb-4 text-primary"></div>
                <p className="text-slate-500 text-sm">加载中...</p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-900 font-semibold mb-1">暂无历史记录</p>
                <p className="text-slate-500 text-sm">完成代码分析后，记录将显示在这里</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {historyRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedHistoryId === record.id
                          ? 'bg-blue-50 border-primary/30 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-sm'
                        }`}
                      onClick={() => viewHistoryRecord(record)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50">{record.language}</Badge>
                          <span className="text-xs text-slate-500">{formatDate(record.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${record.quality_score >= 80 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200' :
                              record.quality_score >= 60 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200' :
                                'bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200'
                            }`}>
                            评分: {(record.quality_score ?? 0).toFixed(1)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteHistoryRecord(e, record.id)}
                            className="h-6 w-6 p-0 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {record.issues_count} 个问题
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {(record.analysis_time ?? 0).toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {/* Code Input Area */}
      <div className="cloud-card p-0 relative z-10 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">代码智能分析</h3>
              <p className="text-xs text-slate-500">上传代码或直接粘贴，立即获得 AI 审计报告</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={toggleHistory}
              size="sm"
              className={`h-9 ${showHistory ? 'bg-slate-100' : 'bg-white'}`}
            >
              <History className="w-4 h-4 mr-2 text-slate-500" />
              历史记录
            </Button>
            {result && (
              <Button variant="outline" onClick={clearAnalysis} size="sm" className="h-9 bg-white">
                <X className="w-4 h-4 mr-2" />
                重新分析
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">编程语言</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 transition-all hover:border-primary/50 focus:ring-primary/20">
                  <SelectValue placeholder="选择编程语言..." />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">提示词模板</label>
              <Select value={selectedPromptTemplateId} onValueChange={setSelectedPromptTemplateId}>
                <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 transition-all hover:border-primary/50 focus:ring-primary/20">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-500" />
                    <SelectValue placeholder="选择提示词模板..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {promptTemplates.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name} {pt.is_default && '(默认)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="h-10 border-slate-200 bg-white hover:bg-slate-50 flex-1"
              >
                <Upload className="w-4 h-4 mr-2 text-primary" />
                上传文件
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.cpp,.c,.cc,.h,.hh,.cs,.php,.rb,.swift,.kt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap gap-2 items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-xs font-bold uppercase text-slate-400 mr-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              快速示例:
            </span>
            {['javascript', 'python', 'java'].map((lang) => (
              <Button
                key={lang}
                variant="ghost"
                size="sm"
                onClick={() => loadExampleCode(lang)}
                disabled={analyzing}
                className="h-7 px-3 text-xs bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-primary hover:border-primary/30"
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </Button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="relative group">
            <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 px-3 py-1 text-[10px] font-mono font-semibold uppercase z-10 rounded-bl-lg border-l border-b border-slate-200">
              Code Editor
            </div>
            <Textarea
              placeholder="// 在此粘贴代码或拖拽文件..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[300px] font-mono text-sm bg-slate-50/30 text-slate-800 border-slate-200 p-5 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner placeholder:text-slate-400"
              disabled={analyzing}
            />
            <div className="text-xs text-slate-400 mt-2 font-mono text-right flex justify-end gap-4">
              <span>{code.split('\n').length} lines</span>
              <span>{code.length} chars</span>
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!code.trim() || !language || analyzing}
            className="w-full bg-primary hover:bg-blue-700 h-14 text-lg font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99]"
          >
            {analyzing ? (
              <>
                <div className="loading-spinner w-5 h-5 mr-3 border-white"></div>
                正在进行深度分析...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2 fill-current" />
                开始全量审计
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Results */}
      {result && (
        <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {/* Results Overview */}
          <div className="cloud-card p-0 overflow-hidden border-t-4 border-t-primary">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">分析报告</h3>
                  <p className="text-xs text-slate-500">生成于 {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1.5 h-8 px-3">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {(analysisTime ?? 0).toFixed(2)}s
                </Badge>
                <Button
                  size="sm"
                  onClick={() => setExportDialogOpen(true)}
                  className="bg-slate-900 text-white hover:bg-slate-800 h-8 shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50">
              {/* Core Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-3">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {(result.quality_score ?? 0).toFixed(1)}
                  </div>
                  <p className="text-sm font-medium text-slate-500">质量评分</p>
                  <Progress value={result.quality_score ?? 0} className="h-2 w-24 mt-3 bg-slate-100" indicatorClassName="bg-primary" />
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {(result.summary?.critical_issues ?? 0) + (result.summary?.high_issues ?? 0)}
                  </div>
                  <p className="text-sm font-medium text-slate-500">严重/高危问题</p>
                  <div className="text-xs text-rose-500 font-medium mt-1 px-2 py-0.5 bg-rose-50 rounded-full">需立即修复</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {(result.summary?.medium_issues ?? 0) + (result.summary?.low_issues ?? 0)}
                  </div>
                  <p className="text-sm font-medium text-slate-500">为了优化</p>
                  <div className="text-xs text-amber-600 font-medium mt-1 px-2 py-0.5 bg-amber-50 rounded-full">建议改进</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {result.issues.length}
                  </div>
                  <p className="text-sm font-medium text-slate-500">总发现问题</p>
                  <div className="text-xs text-emerald-600 font-medium mt-1 px-2 py-0.5 bg-emerald-50 rounded-full">扫描完成</div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  多维指标分析
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: '代码复杂度', value: result.metrics?.complexity ?? 0, color: 'bg-violet-500' },
                    { label: '可维护性', value: result.metrics?.maintainability ?? 0, color: 'bg-indigo-500' },
                    { label: '安全性', value: result.metrics?.security ?? 0, color: 'bg-blue-500' },
                    { label: '运行性能', value: result.metrics?.performance ?? 0, color: 'bg-cyan-500' },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-slate-600">{metric.label}</span>
                        <span className="text-lg font-bold text-slate-900">{(metric.value).toFixed(0)}</span>
                      </div>
                      <Progress value={metric.value} className="h-2 bg-slate-100" indicatorClassName={metric.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="py-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">问题详情列表</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>
            <div>
              {result.issues.map((issue, index) => renderIssue(issue, index))}
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {currentAnalysisId && (
        <InstantExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          analysisId={currentAnalysisId}
          qualityScore={result?.quality_score}
          issueCount={result?.issues.length}
        />
      )}

      <div ref={loadingCardRef} />
    </div>
  );
}
