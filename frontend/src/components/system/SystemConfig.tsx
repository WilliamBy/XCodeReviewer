/**
 * System Config Component
 * Corporate Blue Theme
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Save, RotateCcw, Eye, EyeOff, CheckCircle2, AlertCircle,
  Info, Zap, Globe, PlayCircle, Brain
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/api/database";
import EmbeddingConfig from "@/components/agent/EmbeddingConfig";

// LLM Providers - 2025
const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI GPT', icon: '🟢', category: 'litellm', hint: 'gpt-5, gpt-5-mini, o3 等' },
  { value: 'claude', label: 'Anthropic Claude', icon: '🟣', category: 'litellm', hint: 'claude-sonnet-4.5, claude-opus-4 等' },
  { value: 'gemini', label: 'Google Gemini', icon: '🔵', category: 'litellm', hint: 'gemini-3-pro, gemini-3-flash 等' },
  { value: 'deepseek', label: 'DeepSeek', icon: '🔷', category: 'litellm', hint: 'deepseek-v3.1-terminus, deepseek-v3 等' },
  { value: 'qwen', label: '通义千问', icon: '🟠', category: 'litellm', hint: 'qwen3-max-instruct, qwen3-plus 等' },
  { value: 'zhipu', label: '智谱AI (GLM)', icon: '🔴', category: 'litellm', hint: 'glm-4.6, glm-4.5-flash 等' },
  { value: 'moonshot', label: 'Moonshot (Kimi)', icon: '🌙', category: 'litellm', hint: 'kimi-k2, kimi-k1.5 等' },
  { value: 'ollama', label: 'Ollama 本地', icon: '🖥️', category: 'litellm', hint: 'llama3.3-70b, qwen3-8b 等' },
  { value: 'baidu', label: '百度文心', icon: '📘', category: 'native', hint: 'ernie-4.5 (需要 API_KEY:SECRET_KEY)' },
  { value: 'minimax', label: 'MiniMax', icon: '⚡', category: 'native', hint: 'minimax-m2, minimax-m1 等' },
  { value: 'doubao', label: '字节豆包', icon: '🎯', category: 'native', hint: 'doubao-1.6-pro, doubao-1.5-pro 等' },
];

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-5', claude: 'claude-sonnet-4.5', gemini: 'gemini-3-pro',
  deepseek: 'deepseek-v3.1-terminus', qwen: 'qwen3-max-instruct', zhipu: 'glm-4.6', moonshot: 'kimi-k2',
  ollama: 'llama3.3-70b', baidu: 'ernie-4.5', minimax: 'minimax-m2', doubao: 'doubao-1.6-pro',
};

interface SystemConfigData {
  llmProvider: string; llmApiKey: string; llmModel: string; llmBaseUrl: string;
  llmTimeout: number; llmTemperature: number; llmMaxTokens: number;
  githubToken: string; gitlabToken: string;
  maxAnalyzeFiles: number; llmConcurrency: number; llmGapMs: number; outputLanguage: string;
}

export function SystemConfig() {
  const [config, setConfig] = useState<SystemConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [testingLLM, setTestingLLM] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      console.log('[SystemConfig] 开始加载配置...');

      const backendConfig = await api.getUserConfig();

      console.log('[SystemConfig] 后端返回的原始数据:', JSON.stringify(backendConfig, null, 2));

      if (backendConfig) {
        const llmConfig = backendConfig.llmConfig || {};
        const otherConfig = backendConfig.otherConfig || {};

        const newConfig = {
          llmProvider: llmConfig.llmProvider || 'openai',
          llmApiKey: llmConfig.llmApiKey || '',
          llmModel: llmConfig.llmModel || '',
          llmBaseUrl: llmConfig.llmBaseUrl || '',
          llmTimeout: llmConfig.llmTimeout || 150000,
          llmTemperature: llmConfig.llmTemperature ?? 0.1,
          llmMaxTokens: llmConfig.llmMaxTokens || 4096,
          githubToken: otherConfig.githubToken || '',
          gitlabToken: otherConfig.gitlabToken || '',
          maxAnalyzeFiles: otherConfig.maxAnalyzeFiles ?? 0,
          llmConcurrency: otherConfig.llmConcurrency || 3,
          llmGapMs: otherConfig.llmGapMs || 2000,
          outputLanguage: otherConfig.outputLanguage || 'zh-CN',
        };

        console.log('[SystemConfig] 解析后的配置:', newConfig);
        setConfig(newConfig);

        console.log('✓ 配置已加载:', {
          provider: llmConfig.llmProvider,
          hasApiKey: !!llmConfig.llmApiKey,
          model: llmConfig.llmModel,
        });
      } else {
        console.warn('[SystemConfig] 后端返回空数据，使用默认配置');
        setConfig({
          llmProvider: 'openai', llmApiKey: '', llmModel: '', llmBaseUrl: '',
          llmTimeout: 150000, llmTemperature: 0.1, llmMaxTokens: 4096,
          githubToken: '', gitlabToken: '',
          maxAnalyzeFiles: 0, llmConcurrency: 3, llmGapMs: 2000, outputLanguage: 'zh-CN',
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setConfig({
        llmProvider: 'openai', llmApiKey: '', llmModel: '', llmBaseUrl: '',
        llmTimeout: 150000, llmTemperature: 0.1, llmMaxTokens: 4096,
        githubToken: '', gitlabToken: '',
        maxAnalyzeFiles: 0, llmConcurrency: 3, llmGapMs: 2000, outputLanguage: 'zh-CN',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    try {
      const savedConfig = await api.updateUserConfig({
        llmConfig: {
          llmProvider: config.llmProvider, llmApiKey: config.llmApiKey,
          llmModel: config.llmModel, llmBaseUrl: config.llmBaseUrl,
          llmTimeout: config.llmTimeout, llmTemperature: config.llmTemperature,
          llmMaxTokens: config.llmMaxTokens,
        },
        otherConfig: {
          githubToken: config.githubToken, gitlabToken: config.gitlabToken,
          maxAnalyzeFiles: config.maxAnalyzeFiles, llmConcurrency: config.llmConcurrency,
          llmGapMs: config.llmGapMs, outputLanguage: config.outputLanguage,
        },
      });

      if (savedConfig) {
        const llmConfig = savedConfig.llmConfig || {};
        const otherConfig = savedConfig.otherConfig || {};
        setConfig({
          llmProvider: llmConfig.llmProvider || config.llmProvider,
          llmApiKey: llmConfig.llmApiKey || '',
          llmModel: llmConfig.llmModel || '',
          llmBaseUrl: llmConfig.llmBaseUrl || '',
          llmTimeout: llmConfig.llmTimeout || 150000,
          llmTemperature: llmConfig.llmTemperature ?? 0.1,
          llmMaxTokens: llmConfig.llmMaxTokens || 4096,
          githubToken: otherConfig.githubToken || '',
          gitlabToken: otherConfig.gitlabToken || '',
          maxAnalyzeFiles: otherConfig.maxAnalyzeFiles ?? 0,
          llmConcurrency: otherConfig.llmConcurrency || 3,
          llmGapMs: otherConfig.llmGapMs || 2000,
          outputLanguage: otherConfig.outputLanguage || 'zh-CN',
        });
      }

      setHasChanges(false);
      toast.success("配置已保存！");
    } catch (error) {
      toast.error(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const resetConfig = async () => {
    if (!window.confirm("确定要重置为默认配置吗？")) return;
    try {
      await api.deleteUserConfig();
      await loadConfig();
      setHasChanges(false);
      toast.success("已重置为默认配置");
    } catch (error) {
      toast.error(`重置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const updateConfig = (key: keyof SystemConfigData, value: string | number) => {
    if (!config) return;
    setConfig(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const testLLMConnection = async () => {
    if (!config) return;
    if (!config.llmApiKey && config.llmProvider !== 'ollama') {
      toast.error('请先配置 API Key');
      return;
    }
    setTestingLLM(true);
    setLlmTestResult(null);
    try {
      const result = await api.testLLMConnection({
        provider: config.llmProvider,
        apiKey: config.llmApiKey,
        model: config.llmModel || undefined,
        baseUrl: config.llmBaseUrl || undefined,
      });
      setLlmTestResult(result);
      if (result.success) toast.success(`连接成功！模型: ${result.model}`);
      else toast.error(`连接失败: ${result.message}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误';
      setLlmTestResult({ success: false, message: msg });
      toast.error(`测试失败: ${msg}`);
    } finally {
      setTestingLLM(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="loading-spinner text-primary mx-auto" />
          <p className="text-slate-500 font-sans text-sm uppercase tracking-wider">加载配置中...</p>
        </div>
      </div>
    );
  }

  const currentProvider = LLM_PROVIDERS.find(p => p.value === config.llmProvider);
  const isConfigured = config.llmApiKey !== '' || config.llmProvider === 'ollama';

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className={`cloud-card p-4 ${isConfigured ? 'border-emerald-100 bg-emerald-50/10' : 'border-amber-100 bg-amber-50/10'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Info className="h-5 w-5 text-sky-500" />
            <span className="font-sans text-sm">
              {isConfigured ? (
                <span className="text-emerald-600 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> LLM 已配置 ({currentProvider?.label})
                </span>
              ) : (
                <span className="text-amber-600 font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> 请配置 LLM API Key
                </span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button onClick={saveConfig} size="sm" className="bg-primary hover:bg-primary/90 h-8 shadow-sm">
                <Save className="w-3 h-3 mr-2" /> 保存
              </Button>
            )}
            <Button onClick={resetConfig} variant="outline" size="sm" className="h-8 border-slate-200">
              <RotateCcw className="w-3 h-3 mr-2" /> 重置
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 border border-slate-200 p-1 h-auto gap-1 rounded-lg mb-6">
          <TabsTrigger value="llm" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-sans font-medium py-2.5 text-slate-500 transition-all rounded text-xs flex items-center gap-2">
            <Zap className="w-3 h-3" /> LLM 配置
          </TabsTrigger>
          <TabsTrigger value="embedding" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-sans font-medium py-2.5 text-slate-500 transition-all rounded text-xs flex items-center gap-2">
            <Brain className="w-3 h-3" /> 嵌入模型
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-sans font-medium py-2.5 text-slate-500 transition-all rounded text-xs flex items-center gap-2">
            <Settings className="w-3 h-3" /> 分析参数
          </TabsTrigger>
          <TabsTrigger value="git" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-sans font-medium py-2.5 text-slate-500 transition-all rounded text-xs flex items-center gap-2">
            <Globe className="w-3 h-3" /> Git 集成
          </TabsTrigger>
        </TabsList>

        {/* LLM Config */}
        <TabsContent value="llm" className="space-y-6">
          <div className="cloud-card p-6 space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">选择 LLM 提供商</Label>
              <Select value={config.llmProvider} onValueChange={(v) => updateConfig('llmProvider', v)}>
                <SelectTrigger className="h-12 border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase">LiteLLM 统一适配 (推荐)</div>
                  {LLM_PROVIDERS.filter(p => p.category === 'litellm').map(p => (
                    <SelectItem key={p.value} value={p.value} className="font-sans">
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        <span className="text-xs text-slate-400">- {p.hint}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase mt-2">原生适配器</div>
                  {LLM_PROVIDERS.filter(p => p.category === 'native').map(p => (
                    <SelectItem key={p.value} value={p.value} className="font-sans">
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        <span className="text-xs text-slate-400">- {p.hint}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            {config.llmProvider !== 'ollama' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.llmApiKey}
                    onChange={(e) => updateConfig('llmApiKey', e.target.value)}
                    placeholder={config.llmProvider === 'baidu' ? 'API_KEY:SECRET_KEY 格式' : '输入你的 API Key'}
                    className="h-12 border-slate-200 focus:ring-primary/20"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="h-12 w-12 border-slate-200"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Model and Base URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">模型名称 (可选)</Label>
                <Input
                  value={config.llmModel}
                  onChange={(e) => updateConfig('llmModel', e.target.value)}
                  placeholder={`默认: ${DEFAULT_MODELS[config.llmProvider] || 'auto'}`}
                  className="h-10 border-slate-200 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">API Base URL (可选)</Label>
                <Input
                  value={config.llmBaseUrl}
                  onChange={(e) => updateConfig('llmBaseUrl', e.target.value)}
                  placeholder="留空使用官方地址，或填入中转站地址"
                  className="h-10 border-slate-200 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Test Connection */}
            <div className="pt-4 border-t border-slate-100 border-dashed flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm">
                <span className="font-bold text-slate-700">测试连接</span>
                <span className="text-slate-500 ml-2">验证配置是否正确</span>
              </div>
              <Button
                onClick={testLLMConnection}
                disabled={testingLLM || (!isConfigured && config.llmProvider !== 'ollama')}
                className="bg-primary hover:bg-primary/90 h-10 shadow-sm"
              >
                {testingLLM ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2" />
                    测试中...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    测试
                  </>
                )}
              </Button>
            </div>
            {llmTestResult && (
              <div className={`p-3 rounded-lg ${llmTestResult.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                <div className="flex items-center gap-2 text-sm">
                  {llmTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <span className={llmTestResult.success ? 'text-emerald-700' : 'text-rose-700'}>
                    {llmTestResult.message}
                  </span>
                </div>
              </div>
            )}

            {/* Advanced Parameters */}
            <details className="pt-4 border-t border-slate-100 border-dashed">
              <summary className="font-bold uppercase cursor-pointer hover:text-primary text-slate-400 text-sm transition-colors">高级参数</summary>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">超时 (毫秒)</Label>
                  <Input
                    type="number"
                    value={config.llmTimeout}
                    onChange={(e) => updateConfig('llmTimeout', Number(e.target.value))}
                    className="h-10 border-slate-200 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">温度 (0-2)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.llmTemperature}
                    onChange={(e) => updateConfig('llmTemperature', Number(e.target.value))}
                    className="h-10 border-slate-200 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase">最大 Tokens</Label>
                  <Input
                    type="number"
                    value={config.llmMaxTokens}
                    onChange={(e) => updateConfig('llmMaxTokens', Number(e.target.value))}
                    className="h-10 border-slate-200 focus:ring-primary/20"
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Usage Notes */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs space-y-2">
            <p className="font-bold uppercase text-slate-600 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-sky-500" />
              配置说明
            </p>
            <p className="text-slate-500">• <strong className="text-slate-700">LiteLLM 统一适配</strong>: 大多数提供商通过 LiteLLM 统一处理，支持自动重试和负载均衡</p>
            <p className="text-slate-500">• <strong className="text-slate-700">原生适配器</strong>: 百度、MiniMax、豆包因 API 格式特殊，使用专用适配器</p>
            <p className="text-slate-500">• <strong className="text-slate-700">API 中转站</strong>: 在 Base URL 填入中转站地址即可，API Key 填中转站提供的 Key</p>
          </div>
        </TabsContent>

        {/* Embedding Config */}
        <TabsContent value="embedding" className="space-y-6">
          <EmbeddingConfig />
        </TabsContent>

        {/* Analysis Parameters */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="cloud-card p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">最大分析文件数</Label>
                <Input
                  type="number"
                  value={config.maxAnalyzeFiles}
                  onChange={(e) => updateConfig('maxAnalyzeFiles', Number(e.target.value))}
                  className="h-10 border-slate-200 focus:ring-primary/20"
                />
                <p className="text-xs text-slate-500">单次任务最多处理的文件数量</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">LLM 并发数</Label>
                <Input
                  type="number"
                  value={config.llmConcurrency}
                  onChange={(e) => updateConfig('llmConcurrency', Number(e.target.value))}
                  className="h-10 border-slate-200 focus:ring-primary/20"
                />
                <p className="text-xs text-slate-500">同时发送的 LLM 请求数量</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">请求间隔 (毫秒)</Label>
                <Input
                  type="number"
                  value={config.llmGapMs}
                  onChange={(e) => updateConfig('llmGapMs', Number(e.target.value))}
                  className="h-10 border-slate-200 focus:ring-primary/20"
                />
                <p className="text-xs text-slate-500">每个请求之间的延迟时间</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">输出语言</Label>
                <Select value={config.outputLanguage} onValueChange={(v) => updateConfig('outputLanguage', v)}>
                  <SelectTrigger className="h-10 border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN" className="font-sans">🇨🇳 中文</SelectItem>
                    <SelectItem value="en-US" className="font-sans">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">代码审查结果的输出语言</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Git Integration */}
        <TabsContent value="git" className="space-y-6">
          <div className="cloud-card p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">GitHub Token (可选)</Label>
              <Input
                type="password"
                value={config.githubToken}
                onChange={(e) => updateConfig('githubToken', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="h-10 border-slate-200 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">
                用于访问私有仓库。获取:{' '}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  github.com/settings/tokens
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">GitLab Token (可选)</Label>
              <Input
                type="password"
                value={config.gitlabToken}
                onChange={(e) => updateConfig('gitlabToken', e.target.value)}
                placeholder="glpat-xxxxxxxxxxxx"
                className="h-10 border-slate-200 focus:ring-primary/20"
              />
              <p className="text-xs text-slate-500">
                用于访问私有仓库。获取:{' '}
                <a href="https://gitlab.com/-/profile/personal_access_tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  gitlab.com/-/profile/personal_access_tokens
                </a>
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs">
              <p className="font-bold text-slate-600 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-sky-500" />
                提示
              </p>
              <p className="text-slate-500">• 公开仓库无需配置 Token</p>
              <p className="text-slate-500">• 私有仓库需要配置对应平台的 Token</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 cloud-card p-4 z-50">
          <Button onClick={saveConfig} className="bg-primary hover:bg-primary/90 h-12 shadow-lg">
            <Save className="w-4 h-4 mr-2" /> 保存所有更改
          </Button>
        </div>
      )}
    </div>
  );
}
