/**
 * Prompt Template Manager Page
 * Corporate Blue Theme
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Copy,
  Play,
  FileText,
  Sparkles,
  Check,
  Loader2,
  Terminal,
  MessageSquare,
  Shield,
  Code,
  AlertTriangle,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  getPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  testPromptTemplate,
  type PromptTemplate,
  type PromptTemplateCreate,
} from '@/shared/api/prompts';
import { TEST_CODE_SAMPLES, TEMPLATE_TEST_CODES } from './prompt-manager/testCodeSamples';

const TEMPLATE_TYPES = [
  { value: 'system', label: '系统提示词' },
  { value: 'user', label: '用户提示词' },
  { value: 'analysis', label: '分析提示词' },
];

const getTemplateIcon = (type: string) => {
  switch (type) {
    case 'system': return Shield;
    case 'user': return MessageSquare;
    case 'analysis': return Code;
    default: return FileText;
  }
};

export default function PromptManager() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState<PromptTemplateCreate>({
    name: '', description: '', template_type: 'system', content_zh: '', content_en: '', is_active: true,
  });
  const [testForm, setTestForm] = useState({ language: 'python', code: TEST_CODE_SAMPLES.python, promptLang: 'zh' as 'zh' | 'en' });
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<PromptTemplate | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await getPromptTemplates();
      setTemplates(response.items);
    } catch (error) {
      toast.error('加载提示词模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await createPromptTemplate(form);
      toast.success('创建成功');
      setShowCreateDialog(false);
      resetForm();
      loadTemplates();
    } catch (error) { toast.error('创建失败'); }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    try {
      await updatePromptTemplate(selectedTemplate.id, form);
      toast.success('更新成功');
      setShowEditDialog(false);
      loadTemplates();
    } catch (error) { toast.error('更新失败'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return;
    try {
      await deletePromptTemplate(id);
      toast.success('删除成功');
      loadTemplates();
    } catch (error: any) { toast.error(error.message || '删除失败'); }
  };

  const handleTest = async () => {
    if (!selectedTemplate) return;
    const content = testForm.promptLang === 'zh'
      ? (selectedTemplate.content_zh || selectedTemplate.content_en || '')
      : (selectedTemplate.content_en || selectedTemplate.content_zh || '');
    if (!content) { toast.error('提示词内容为空'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testPromptTemplate({ content, language: testForm.language, code: testForm.code, output_language: testForm.promptLang });
      setTestResult(result);
      if (result.success) toast.success(`测试完成，耗时 ${result.execution_time}s`);
      else toast.error(result.error || '测试失败');
    } catch (error: any) { toast.error(error.message || '测试失败'); }
    finally { setTesting(false); }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', template_type: 'system', content_zh: '', content_en: '', is_active: true });
  };

  const openEditDialog = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setForm({ name: template.name, description: template.description || '', template_type: template.template_type, content_zh: template.content_zh || '', content_en: template.content_en || '', is_active: template.is_active });
    setShowEditDialog(true);
  };

  const openTestDialog = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setTestResult(null);

    const templateCodes = TEMPLATE_TEST_CODES[template.name];
    const defaultLang = 'python';
    if (templateCodes && templateCodes[defaultLang]) {
      setTestForm(prev => ({
        ...prev,
        language: defaultLang,
        code: templateCodes[defaultLang]
      }));
    } else {
      setTestForm(prev => ({
        ...prev,
        language: defaultLang,
        code: TEST_CODE_SAMPLES[defaultLang]
      }));
    }

    setShowTestDialog(true);
  };

  const openViewDialog = (template: PromptTemplate) => {
    setViewTemplate(template);
    setShowViewDialog(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="loading-spinner text-primary mx-auto" />
          <p className="text-slate-500 font-sans text-sm uppercase tracking-wider">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">提示词模板管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理用于代码审计的系统提示词、用户提示词和分析模板
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          新建模板
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cloud-card p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">模板总数</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{templates.length}</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">系统模板</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{templates.filter(t => t.is_system).length}</p>
            </div>
            <div className="h-10 w-10 bg-sky-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">自定义模板</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{templates.filter(t => !t.is_system).length}</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="cloud-card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">已启用</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{templates.filter(t => t.is_active).length}</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <div className="col-span-full cloud-card p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">暂无提示词模板</h3>
            <p className="text-slate-500 mt-2 mb-6">点击"新建模板"创建自定义提示词</p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              创建模板
            </Button>
          </div>
        ) : (
          templates.map(template => {
            const TemplateIcon = getTemplateIcon(template.template_type);
            return (
              <div key={template.id} className={`cloud-card p-0 flex flex-col group transition-all duration-200 hover:shadow-md ${!template.is_active ? 'opacity-75 grayscale' : ''}`}>
                {/* Template Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center rounded-lg shadow-sm">
                        <TemplateIcon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-800 line-clamp-1" title={template.name}>{template.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{template.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.is_system && <Badge variant="secondary" className="bg-sky-50 text-sky-600 border-sky-100">系统</Badge>}
                    {template.is_default && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100">默认</Badge>}
                    <Badge variant="outline" className="border-slate-200 text-slate-600 font-normal">
                      {TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label}
                    </Badge>
                  </div>
                </div>

                {/* Template Content Preview */}
                <div className="p-4 flex-1 flex flex-col">
                  <div
                    className="flex-1 text-xs text-slate-600 line-clamp-4 bg-slate-50 p-3 border border-slate-200 font-mono mb-4 cursor-pointer hover:border-slate-300 transition-colors rounded-md group-hover:bg-white"
                    onClick={() => openViewDialog(template)}
                    title="点击查看完整内容"
                  >
                    {template.content_zh || template.content_en || '(无内容)'}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openViewDialog(template)} className="h-8 px-2 text-slate-500 hover:text-primary">
                        <FileText className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openTestDialog(template)} className="h-8 px-2 text-slate-500 hover:text-primary">
                        <Play className="w-4 h-4 mr-1" />
                        测试
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(template.content_zh || template.content_en || '')} className="h-8 px-2 text-slate-500 hover:text-primary">
                        <Copy className="w-4 h-4 mr-1" />
                        复制
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      {!template.is_system && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)} className="h-8 w-8 text-slate-400 hover:text-primary">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setShowEditDialog(false); } }}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 gap-0 bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-base font-bold">
                  {showEditDialog ? '编辑模板' : '新建模板'}
                </span>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  {showEditDialog ? 'Edit Template' : 'Create Template'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">模板名称 *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：安全专项审计" className="border-slate-200 focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">模板类型</Label>
                  <Select value={form.template_type} onValueChange={v => setForm({ ...form, template_type: v })}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">描述</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="模板用途描述" className="border-slate-200 focus:ring-primary/20" />
              </div>
              <Tabs defaultValue="zh" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 border border-slate-200 p-1 h-auto gap-1 rounded-lg mb-4">
                  <TabsTrigger value="zh" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium py-2 text-slate-500 transition-all rounded text-xs">
                    中文提示词
                  </TabsTrigger>
                  <TabsTrigger value="en" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium py-2 text-slate-500 transition-all rounded text-xs">
                    英文提示词
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="zh" className="mt-0">
                  <Textarea value={form.content_zh} onChange={e => setForm({ ...form, content_zh: e.target.value })} placeholder="输入中文提示词内容..." rows={12} className="font-mono text-sm text-slate-700 bg-slate-50 border-slate-200 focus:ring-primary/20" />
                </TabsContent>
                <TabsContent value="en" className="mt-0">
                  <Textarea value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} placeholder="Enter English prompt content..." rows={12} className="font-mono text-sm text-slate-700 bg-slate-50 border-slate-200 focus:ring-primary/20" />
                </TabsContent>
              </Tabs>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="text-sm font-medium text-slate-700">启用此模板</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setShowEditDialog(false); }} className="border-slate-200">取消</Button>
            <Button onClick={showEditDialog ? handleUpdate : handleCreate} className="bg-primary hover:bg-primary/90">{showEditDialog ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-[1000px] w-[95vw] h-[85vh] flex flex-col p-0 gap-0 bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-violet-500/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <span className="text-base font-bold">
                  测试提示词: {selectedTemplate?.name}
                </span>
                <p className="text-xs text-slate-500 font-normal mt-0.5">使用示例代码测试提示词效果</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6 grid grid-cols-2 gap-6 h-full">
            {/* Left: Input */}
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">编程语言</Label>
                  <Select value={testForm.language} onValueChange={v => {
                    const templateCodes = selectedTemplate ? TEMPLATE_TEST_CODES[selectedTemplate.name] : null;
                    const code = templateCodes?.[v] || TEST_CODE_SAMPLES[v] || TEST_CODE_SAMPLES.python;
                    setTestForm({ ...testForm, language: v, code });
                  }}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">提示词语言</Label>
                  <Select value={testForm.promptLang} onValueChange={(v: 'zh' | 'en') => setTestForm({ ...testForm, promptLang: v })}>
                    <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">中文提示词</SelectItem>
                      <SelectItem value="en">英文提示词</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <Label className="text-xs font-bold text-slate-500 uppercase">测试代码</Label>
                <Textarea value={testForm.code} onChange={e => setTestForm({ ...testForm, code: e.target.value })} className="font-mono text-sm resize-none flex-1 bg-slate-50 border-slate-200" />
              </div>
              <Button onClick={handleTest} disabled={testing} className="w-full bg-primary hover:bg-primary/90 h-10 flex-shrink-0">
                {testing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />分析中...</>) : (<><Play className="w-4 h-4 mr-2" />运行测试</>)}
              </Button>
            </div>
            {/* Right: Results */}
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <Label className="text-xs font-bold text-slate-500 uppercase flex-shrink-0">分析结果</Label>
              <div className="border border-slate-200 flex-1 overflow-hidden bg-slate-50 rounded-lg flex flex-col">
                {testResult ? (
                  testResult.success ? (
                    <div className="flex flex-col h-full">
                      {/* Success Header */}
                      <div className="flex items-center justify-between p-3 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">分析成功</span>
                        </div>
                        <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700">
                          {testResult.execution_time}s
                        </Badge>
                      </div>

                      {/* Quality Score */}
                      {testResult.result?.quality_score !== undefined && (
                        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                          <span className="text-xs font-bold uppercase text-slate-500">质量评分</span>
                          <div className="flex items-center gap-2">
                            <div className={`text-2xl font-bold ${testResult.result.quality_score >= 80 ? 'text-emerald-600' :
                              testResult.result.quality_score >= 60 ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                              {testResult.result.quality_score}
                            </div>
                            <span className="text-xs text-slate-400">/ 100</span>
                          </div>
                        </div>
                      )}

                      {/* Issues List */}
                      <ScrollArea className="flex-1 p-3 bg-white">
                        {testResult.result?.issues?.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase text-slate-500">发现问题</span>
                              <Badge variant="secondary" className="bg-rose-50 text-rose-600">
                                {testResult.result.issues.length} 个
                              </Badge>
                            </div>
                            {testResult.result.issues.map((issue: any, idx: number) => (
                              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                <div className={`px-3 py-2 border-b border-slate-100 flex items-center justify-between ${issue.severity === 'critical' ? 'bg-rose-50 text-rose-700' :
                                  issue.severity === 'high' ? 'bg-orange-50 text-orange-700' :
                                    issue.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                                  }`}>
                                  <span className="font-bold text-xs uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {issue.severity}
                                  </span>
                                  {issue.line && <span className="text-xs opacity-80">行 {issue.line}</span>}
                                </div>
                                <div className="p-3">
                                  <h4 className="font-bold text-sm mb-1 text-slate-800">{issue.title}</h4>
                                  {issue.description && (
                                    <p className="text-xs text-slate-500 leading-relaxed">{issue.description}</p>
                                  )}
                                  {issue.suggestion && (
                                    <div className="mt-2 p-2 bg-sky-50 border-l-2 border-sky-500 rounded-r">
                                      <p className="text-xs text-sky-700">
                                        <span className="font-bold">建议: </span>
                                        {issue.suggestion}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            </div>
                            <p className="font-bold text-emerald-600 uppercase text-sm">未发现问题</p>
                            <p className="text-xs text-slate-500 mt-1">代码质量良好</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      {/* Error Header */}
                      <div className="flex items-center justify-between p-3 bg-rose-50 border-b border-rose-100 flex-shrink-0">
                        <div className="flex items-center gap-2 text-rose-700 font-bold">
                          <AlertCircle className="w-5 h-5" />
                          <span className="text-sm">测试失败</span>
                        </div>
                        {testResult.execution_time && (
                          <Badge variant="outline" className="bg-white border-rose-200 text-rose-700">
                            {testResult.execution_time}s
                          </Badge>
                        )}
                      </div>
                      {/* Error Details */}
                      <div className="flex-1 p-4 bg-white overflow-auto">
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded text-xs font-mono text-rose-700 whitespace-pre-wrap break-words">
                          {testResult.error || '未知错误'}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Play className="w-8 h-8 opacity-50 text-slate-500" />
                    </div>
                    <p className="font-medium text-sm text-slate-600">点击"运行测试"</p>
                    <p className="text-xs mt-1">查看分析结果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 gap-0 bg-white">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-base font-bold">
                  {viewTemplate?.name}
                </span>
                <p className="text-xs text-slate-500 font-normal mt-0.5">{viewTemplate?.description || 'View Template'}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {viewTemplate?.is_system && <Badge variant="secondary" className="bg-sky-50 text-sky-600 border-sky-100">系统模板</Badge>}
              {viewTemplate?.is_default && <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100">默认</Badge>}
              <Badge variant="outline" className="text-slate-600">{TEMPLATE_TYPES.find(t => t.value === viewTemplate?.template_type)?.label}</Badge>
              {viewTemplate?.is_active ? (
                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100">已启用</Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100">已禁用</Badge>
              )}
            </div>

            <Tabs defaultValue="zh" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 border border-slate-200 p-1 h-auto gap-1 rounded-lg">
                <TabsTrigger value="zh" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium py-2 text-slate-500 transition-all rounded text-xs">
                  中文提示词
                </TabsTrigger>
                <TabsTrigger value="en" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-medium py-2 text-slate-500 transition-all rounded text-xs">
                  英文提示词
                </TabsTrigger>
              </TabsList>
              <TabsContent value="zh" className="mt-4">
                <div className="bg-slate-50 text-slate-700 p-4 border border-slate-200 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto rounded-lg">
                  {viewTemplate?.content_zh || '(无中文内容)'}
                </div>
              </TabsContent>
              <TabsContent value="en" className="mt-4">
                <div className="bg-slate-50 text-slate-700 p-4 border border-slate-200 font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto rounded-lg">
                  {viewTemplate?.content_en || '(No English content)'}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="flex-shrink-0 flex justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <Button variant="outline" onClick={() => copyToClipboard(viewTemplate?.content_zh || viewTemplate?.content_en || '')} className="border-slate-200">
              <Copy className="w-4 h-4 mr-2" />
              复制内容
            </Button>
            <Button variant="outline" onClick={() => { setShowViewDialog(false); if (viewTemplate) openTestDialog(viewTemplate); }} className="border-slate-200">
              <Play className="w-4 h-4 mr-2" />
              测试
            </Button>
            {!viewTemplate?.is_system && (
              <Button variant="outline" onClick={() => { setShowViewDialog(false); if (viewTemplate) openEditDialog(viewTemplate); }} className="border-slate-200">
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
            )}
            <Button onClick={() => setShowViewDialog(false)} className="bg-primary hover:bg-primary/90">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
