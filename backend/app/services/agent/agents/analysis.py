"""
Analysis Agent (漏洞分析层) - LLM 驱动版

LLM 是真正的安全分析大脑！
- LLM 决定分析策略
- LLM 选择使用什么工具
- LLM 决定深入分析哪些代码
- LLM 判断发现的问题是否是真实漏洞

类型: ReAct (真正的!)
"""

import asyncio
import json
import logging
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from .base import BaseAgent, AgentConfig, AgentResult, AgentType, AgentPattern
from ..json_parser import AgentJsonParser
from ..prompts import CORE_SECURITY_PRINCIPLES, VULNERABILITY_PRIORITIES

logger = logging.getLogger(__name__)


ANALYSIS_SYSTEM_PROMPT = """你是 DeepAudit 的漏洞分析 Agent，一个**自主**的安全专家。

## 你的角色
你是安全审计的**核心大脑**，不是工具执行器。你需要：
1. 自主制定分析策略
2. 选择最有效的工具和方法
3. 深入分析可疑代码
4. 判断是否是真实漏洞
5. 动态调整分析方向

## ⚠️ 核心原则：优先使用外部专业工具！

**外部工具优先级最高！** 必须首先使用外部安全工具进行扫描，它们有：
- 经过验证的专业规则库
- 更低的误报率
- 更全面的漏洞检测能力

## 🔧 工具优先级（必须按此顺序使用）

### 第一优先级：外部专业安全工具 ⭐⭐⭐ 【必须首先使用！】
- **semgrep_scan**: 全语言静态分析 - **每次分析必用**
  参数: target_path (str), rules (str: "auto" 或 "p/security-audit")
  示例: {"target_path": ".", "rules": "auto"}

- **bandit_scan**: Python 安全扫描 - **Python项目必用**
  参数: target_path (str), severity (str)
  示例: {"target_path": ".", "severity": "medium"}

- **gitleaks_scan**: 密钥泄露检测 - **每次分析必用**
  参数: target_path (str)
  示例: {"target_path": "."}

- **safety_scan**: Python 依赖漏洞 - **有 requirements.txt 时必用**
  参数: requirements_file (str)
  示例: {"requirements_file": "requirements.txt"}

- **npm_audit**: Node.js 依赖漏洞 - **有 package.json 时必用**
  参数: target_path (str)
  示例: {"target_path": "."}

- **kunlun_scan**: 深度代码审计（Kunlun-M）
  参数: target_path (str), language (str: "php"|"javascript")
  示例: {"target_path": ".", "language": "php"}

### 第二优先级：智能扫描工具 ⭐⭐
- **smart_scan**: 智能批量安全扫描
  参数: target (str), quick_mode (bool), focus_vulnerabilities (list)
  示例: {"target": ".", "quick_mode": true}

- **quick_audit**: 快速文件审计
  参数: file_path (str), deep_analysis (bool)
  示例: {"file_path": "app/views.py", "deep_analysis": true}

### 第三优先级：内置分析工具 ⭐
- **pattern_match**: 危险模式匹配（外部工具不可用时的备选）
  参数: scan_file (str) 或 code (str), pattern_types (list)
  示例: {"scan_file": "app/models.py", "pattern_types": ["sql_injection"]}

- **dataflow_analysis**: 数据流追踪
  参数: source_code (str), variable_name (str)

### 辅助工具
- **read_file**: 读取文件内容验证发现
  参数: file_path (str), start_line (int), end_line (int)
- **list_files**: 列出目录文件
  参数: directory (str), pattern (str)
- **search_code**: 代码关键字搜索
  参数: keyword (str), max_results (int)
- **query_security_knowledge**: 查询安全知识库
- **get_vulnerability_knowledge**: 获取漏洞知识

## 📋 推荐分析流程（严格按此执行！）

### 第一步：外部工具全面扫描（60%时间）⚡ 最重要！
根据项目技术栈，**必须首先**执行以下外部工具：

```
# 所有项目必做
Action: semgrep_scan
Action Input: {"target_path": ".", "rules": "auto"}

Action: gitleaks_scan
Action Input: {"target_path": "."}

# Python 项目必做
Action: bandit_scan
Action Input: {"target_path": ".", "severity": "medium"}

Action: safety_scan
Action Input: {"requirements_file": "requirements.txt"}

# Node.js 项目必做
Action: npm_audit
Action Input: {"target_path": "."}
```

### 第二步：分析外部工具结果（25%时间）
对外部工具发现的问题进行深入分析：
- 使用 `read_file` 查看完整代码上下文
- 使用 `dataflow_analysis` 追踪数据流
- 验证是否为真实漏洞，排除误报

### 第三步：补充扫描（10%时间）
如果外部工具覆盖不足，使用内置工具补充：
- `smart_scan` 综合扫描
- `pattern_match` 模式匹配

### 第四步：汇总报告（5%时间）
整理所有发现，输出 Final Answer

## ⚠️ 重要提醒
1. **不要跳过外部工具！** 即使内置工具可能更快，外部工具的检测能力更强
2. **Docker依赖**：外部工具需要Docker环境，如果返回"Docker不可用"，再使用内置工具
3. **并行执行**：可以连续调用多个外部工具

## 工作方式
每一步，你需要输出：

```
Thought: [分析当前情况，思考下一步应该做什么]
Action: [工具名称]
Action Input: [JSON 格式的参数]
```

当你完成分析后，输出：

```
Thought: [总结所有发现]
Final Answer: [JSON 格式的漏洞报告]
```

## Final Answer 格式
```json
{
    "findings": [
        {
            "vulnerability_type": "sql_injection",
            "severity": "high",
            "title": "SQL 注入漏洞",
            "description": "详细描述",
            "file_path": "path/to/file.py",
            "line_start": 42,
            "code_snippet": "危险代码片段",
            "source": "污点来源",
            "sink": "危险函数",
            "suggestion": "修复建议",
            "confidence": 0.9,
            "needs_verification": true
        }
    ],
    "summary": "分析总结"
}
```

## 重点关注的漏洞类型
- SQL 注入 (query, execute, raw SQL)
- XSS (innerHTML, document.write, v-html)
- 命令注入 (exec, system, subprocess)
- 路径遍历 (open, readFile, path 拼接)
- SSRF (requests, fetch, http client)
- 硬编码密钥 (password, secret, api_key)
- 不安全的反序列化 (pickle, yaml.load, eval)

## 📋 设计文档检查要求（如果提供了项目设计文档）

如果提供了项目设计文档，你需要**同时进行**以下检查：

1. **功能完整性检查**：检查代码是否实现了设计文档中描述的所有功能
2. **接口一致性检查**：验证 API 接口是否符合设计文档的规范（请求/响应格式、参数验证等）
3. **设计约束检查**：检查代码是否违反了设计文档中的约束条件（安全要求、性能要求、架构约束等）
4. **业务逻辑一致性**：验证业务逻辑实现是否符合设计文档的描述

### 设计文档检查流程
1. 首先理解设计文档中的功能定义、接口规范和约束条件
2. 在分析代码时，对比实现与设计文档
3. 发现不一致时，记录为"design_inconsistency"类型的发现，严重程度根据影响范围确定
4. 对于缺失的功能，记录为"missing_feature"类型的发现
5. 对于接口不匹配，记录为"interface_mismatch"类型的发现

### 设计不一致发现格式
```json
{
    "vulnerability_type": "design_inconsistency|missing_feature|interface_mismatch",
    "severity": "high|medium|low",
    "title": "设计与实现不一致：功能缺失/接口不匹配/违反约束",
    "description": "详细说明不一致之处，引用设计文档中的具体要求",
    "file_path": "相关代码文件",
    "line_start": 行号,
    "code_snippet": "相关代码片段",
    "suggestion": "如何修复以符合设计文档要求"
}
```

## 重要原则
1. **外部工具优先** - 首先使用 semgrep、bandit 等专业工具
2. **质量优先** - 宁可深入分析几个真实漏洞，不要浅尝辄止报告大量误报
3. **上下文分析** - 看到可疑代码要读取上下文，理解完整逻辑
4. **自主判断** - 不要机械相信工具输出，要用你的专业知识判断
5. **设计一致性** - 如果提供了设计文档，必须同时检查代码是否符合设计要求

现在开始你的安全分析！首先使用外部工具进行全面扫描。"""


@dataclass
class AnalysisStep:
    """分析步骤"""
    thought: str
    action: Optional[str] = None
    action_input: Optional[Dict] = None
    observation: Optional[str] = None
    is_final: bool = False
    final_answer: Optional[Dict] = None


class AnalysisAgent(BaseAgent):
    """
    漏洞分析 Agent - LLM 驱动版
    
    LLM 全程参与，自主决定：
    1. 分析什么
    2. 使用什么工具
    3. 深入哪些代码
    4. 报告什么发现
    """
    
    def __init__(
        self,
        llm_service,
        tools: Dict[str, Any],
        event_emitter=None,
    ):
        # 组合增强的系统提示词，注入核心安全原则和漏洞优先级
        full_system_prompt = f"{ANALYSIS_SYSTEM_PROMPT}\n\n{CORE_SECURITY_PRINCIPLES}\n\n{VULNERABILITY_PRIORITIES}"
        
        config = AgentConfig(
            name="Analysis",
            agent_type=AgentType.ANALYSIS,
            pattern=AgentPattern.REACT,
            max_iterations=30,
            system_prompt=full_system_prompt,
        )
        super().__init__(config, llm_service, tools, event_emitter)
        
        self._conversation_history: List[Dict[str, str]] = []
        self._steps: List[AnalysisStep] = []
    

    
    def _parse_llm_response(self, response: str) -> AnalysisStep:
        """解析 LLM 响应 - 增强版，更健壮地提取思考内容"""
        step = AnalysisStep(thought="")

        # 🔥 首先尝试提取明确的 Thought 标记
        thought_match = re.search(r'Thought:\s*(.*?)(?=Action:|Final Answer:|$)', response, re.DOTALL)
        if thought_match:
            step.thought = thought_match.group(1).strip()

        # 🔥 检查是否是最终答案
        final_match = re.search(r'Final Answer:\s*(.*?)$', response, re.DOTALL)
        if final_match:
            step.is_final = True
            answer_text = final_match.group(1).strip()
            answer_text = re.sub(r'```json\s*', '', answer_text)
            answer_text = re.sub(r'```\s*', '', answer_text)
            # 使用增强的 JSON 解析器
            step.final_answer = AgentJsonParser.parse(
                answer_text,
                default={"findings": [], "raw_answer": answer_text}
            )
            # 确保 findings 格式正确
            if "findings" in step.final_answer:
                step.final_answer["findings"] = [
                    f for f in step.final_answer["findings"]
                    if isinstance(f, dict)
                ]

            # 🔥 如果没有提取到 thought，使用 Final Answer 前的内容作为思考
            if not step.thought:
                before_final = response[:response.find('Final Answer:')].strip()
                if before_final:
                    before_final = re.sub(r'^Thought:\s*', '', before_final)
                    step.thought = before_final[:500] if len(before_final) > 500 else before_final

            return step

        # 🔥 提取 Action
        action_match = re.search(r'Action:\s*(\w+)', response)
        if action_match:
            step.action = action_match.group(1).strip()

            # 🔥 如果没有提取到 thought，提取 Action 之前的内容作为思考
            if not step.thought:
                action_pos = response.find('Action:')
                if action_pos > 0:
                    before_action = response[:action_pos].strip()
                    before_action = re.sub(r'^Thought:\s*', '', before_action)
                    if before_action:
                        step.thought = before_action[:500] if len(before_action) > 500 else before_action

        # 🔥 提取 Action Input
        input_match = re.search(r'Action Input:\s*(.*?)(?=Thought:|Action:|Observation:|$)', response, re.DOTALL)
        if input_match:
            input_text = input_match.group(1).strip()
            input_text = re.sub(r'```json\s*', '', input_text)
            input_text = re.sub(r'```\s*', '', input_text)
            # 使用增强的 JSON 解析器
            step.action_input = AgentJsonParser.parse(
                input_text,
                default={"raw_input": input_text}
            )

        # 🔥 最后的 fallback：如果整个响应没有任何标记，整体作为思考
        if not step.thought and not step.action and not step.is_final:
            if response.strip():
                step.thought = response.strip()[:500]

        return step
    

    
    async def run(self, input_data: Dict[str, Any]) -> AgentResult:
        """
        执行漏洞分析 - LLM 全程参与！
        """
        import time
        start_time = time.time()
        
        project_info = input_data.get("project_info", {})
        config = input_data.get("config", {})
        plan = input_data.get("plan", {})
        previous_results = input_data.get("previous_results", {})
        task = input_data.get("task", "")
        task_context = input_data.get("task_context", "")
        
        # 🔥 处理交接信息
        handoff = input_data.get("handoff")
        if handoff:
            from .base import TaskHandoff
            if isinstance(handoff, dict):
                handoff = TaskHandoff.from_dict(handoff)
            self.receive_handoff(handoff)
        
        # 从 Recon 结果获取上下文
        recon_data = previous_results.get("recon", {})
        if isinstance(recon_data, dict) and "data" in recon_data:
            recon_data = recon_data["data"]
        
        tech_stack = recon_data.get("tech_stack", {})
        entry_points = recon_data.get("entry_points", [])
        high_risk_areas = recon_data.get("high_risk_areas", plan.get("high_risk_areas", []))
        initial_findings = recon_data.get("initial_findings", [])
        
        # 🔥 构建包含交接上下文的初始消息
        handoff_context = self.get_handoff_context()
        
        # 🔥 获取目标文件列表
        target_files = config.get("target_files", [])
        
        initial_message = f"""请开始对项目进行安全漏洞分析。

## 项目信息
- 名称: {project_info.get('name', 'unknown')}
- 语言: {tech_stack.get('languages', [])}
- 框架: {tech_stack.get('frameworks', [])}

"""
        # 🔥 如果指定了目标文件，明确告知 Agent
        if target_files:
            initial_message += f"""## ⚠️ 审计范围
用户指定了 {len(target_files)} 个目标文件进行审计：
"""
            for tf in target_files[:10]:
                initial_message += f"- {tf}\n"
            if len(target_files) > 10:
                initial_message += f"- ... 还有 {len(target_files) - 10} 个文件\n"
            initial_message += """
请直接分析这些指定的文件，不要分析其他文件。

"""
        
        initial_message += f"""{handoff_context if handoff_context else f'''## 上下文信息
### ⚠️ 高风险区域（来自 Recon Agent，必须优先分析）
以下是 Recon Agent 识别的高风险区域，请**务必优先**读取和分析这些文件：
{json.dumps(high_risk_areas[:20], ensure_ascii=False)}

**重要**: 请使用 read_file 工具读取上述高风险文件，不要假设文件路径或使用其他路径。

### 入口点 (前10个)
{json.dumps(entry_points[:10], ensure_ascii=False, indent=2)}

### 初步发现 (如果有)
{json.dumps(initial_findings[:5], ensure_ascii=False, indent=2) if initial_findings else "无"}'''}
"""
        
        # 🔥 添加设计文档信息（如果提供）
        design_doc = project_info.get("design_document")
        if design_doc and not design_doc.get("error"):
            initial_message += f"""
## 📄 项目设计文档

设计文档已提供，请在进行安全分析的同时，检查代码实现是否符合设计文档的要求。

### 设计文档摘要
{design_doc.get('summary', '无摘要')[:500]}

"""
            # 添加功能定义
            functions = design_doc.get('functions', [])
            if functions:
                initial_message += f"""### 关键功能定义（共 {len(functions)} 个）
"""
                for i, func in enumerate(functions[:10], 1):
                    func_name = func.get('name', f'功能 {i}')
                    func_desc = func.get('description', '')[:100]
                    initial_message += f"{i}. **{func_name}**: {func_desc}\n"
                if len(functions) > 10:
                    initial_message += f"... 还有 {len(functions) - 10} 个功能\n"
                initial_message += "\n"
            
            # 添加接口规范
            interfaces = design_doc.get('interfaces', [])
            if interfaces:
                initial_message += f"""### 接口规范（共 {len(interfaces)} 个）
"""
                for i, iface in enumerate(interfaces[:10], 1):
                    iface_desc = iface.get('description', '')[:100]
                    initial_message += f"{i}. {iface_desc}\n"
                if len(interfaces) > 10:
                    initial_message += f"... 还有 {len(interfaces) - 10} 个接口\n"
                initial_message += "\n"
            
            # 添加设计约束
            constraints = design_doc.get('constraints', [])
            if constraints:
                initial_message += f"""### 设计约束（共 {len(constraints)} 个）
"""
                for i, constraint in enumerate(constraints[:10], 1):
                    constraint_desc = constraint.get('description', '')[:100]
                    initial_message += f"{i}. {constraint_desc}\n"
                if len(constraints) > 10:
                    initial_message += f"... 还有 {len(constraints) - 10} 个约束\n"
                initial_message += "\n"
            
            initial_message += """**重要**: 在分析代码时，请同时检查：
1. 代码是否实现了设计文档中描述的所有功能
2. API 接口是否符合设计规范
3. 是否违反了设计约束
4. 业务逻辑是否与设计文档一致

如果发现设计与实现不一致，请将其记录为发现项，类型为 "design_inconsistency"、"missing_feature" 或 "interface_mismatch"。

"""
        
        initial_message += f"""
## 任务
{task_context or task or '进行全面的安全漏洞分析，发现代码中的安全问题。'}

## ⚠️ 分析策略要求
1. **首先**：使用 read_file 读取上面列出的高风险文件
2. **然后**：分析这些文件中的安全问题
3. **最后**：如果需要，使用 smart_scan 或其他工具扩展分析

**禁止**：不要跳过高风险区域直接做全局扫描

## 目标漏洞类型
{config.get('target_vulnerabilities', ['all'])}

## 可用工具
{self.get_tools_description()}

请开始你的安全分析。首先读取高风险区域的文件，然后分析其中的安全问题。"""
        
        # 🔥 记录工作开始
        self.record_work("开始安全漏洞分析")

        # 初始化对话历史
        self._conversation_history = [
            {"role": "system", "content": self.config.system_prompt},
            {"role": "user", "content": initial_message},
        ]
        
        self._steps = []
        all_findings = []
        error_message = None  # 🔥 跟踪错误信息
        
        await self.emit_thinking("🔬 Analysis Agent 启动，LLM 开始自主安全分析...")
        
        try:
            for iteration in range(self.config.max_iterations):
                if self.is_cancelled:
                    break
                
                self._iteration = iteration + 1
                
                # 🔥 再次检查取消标志（在LLM调用之前）
                if self.is_cancelled:
                    await self.emit_thinking("🛑 任务已取消，停止执行")
                    break
                
                # 调用 LLM 进行思考和决策（流式输出）
                # 🔥 增加 max_tokens 到 4096，避免长输出被截断
                try:
                    llm_output, tokens_this_round = await self.stream_llm_call(
                        self._conversation_history,
                        temperature=0.1,
                        max_tokens=4096,
                    )
                except asyncio.CancelledError:
                    logger.info(f"[{self.name}] LLM call cancelled")
                    break
                
                self._total_tokens += tokens_this_round

                # 🔥 Enhanced: Handle empty LLM response with better diagnostics
                if not llm_output or not llm_output.strip():
                    empty_retry_count = getattr(self, '_empty_retry_count', 0) + 1
                    self._empty_retry_count = empty_retry_count
                    
                    # 🔥 记录更详细的诊断信息
                    logger.warning(
                        f"[{self.name}] Empty LLM response in iteration {self._iteration} "
                        f"(retry {empty_retry_count}/3, tokens_this_round={tokens_this_round})"
                    )
                    
                    if empty_retry_count >= 3:
                        logger.error(f"[{self.name}] Too many empty responses, generating fallback result")
                        error_message = "连续收到空响应，使用回退结果"
                        await self.emit_event("warning", error_message)
                        # 🔥 不是直接 break，而是尝试生成一个回退结果
                        break
                    
                    # 🔥 更有针对性的重试提示
                    retry_prompt = f"""收到空响应。请根据以下格式输出你的思考和行动：

Thought: [你对当前安全分析情况的思考]
Action: [工具名称，如 read_file, search_code, pattern_match, semgrep_scan]
Action Input: {{"参数名": "参数值"}}

可用工具: {', '.join(self.tools.keys())}

如果你已完成分析，请输出：
Thought: [总结所有发现]
Final Answer: {{"findings": [...], "summary": "..."}}"""
                    
                    self._conversation_history.append({
                        "role": "user",
                        "content": retry_prompt,
                    })
                    continue
                
                # 重置空响应计数器
                self._empty_retry_count = 0

                # 解析 LLM 响应
                step = self._parse_llm_response(llm_output)
                self._steps.append(step)
                
                # 🔥 发射 LLM 思考内容事件 - 展示安全分析的思考过程
                if step.thought:
                    await self.emit_llm_thought(step.thought, iteration + 1)
                
                # 添加 LLM 响应到历史
                self._conversation_history.append({
                    "role": "assistant",
                    "content": llm_output,
                })
                
                # 检查是否完成
                if step.is_final:
                    await self.emit_llm_decision("完成安全分析", "LLM 判断分析已充分")
                    logger.info(f"[{self.name}] Received Final Answer: {step.final_answer}")
                    if step.final_answer and "findings" in step.final_answer:
                        all_findings = step.final_answer["findings"]
                        logger.info(f"[{self.name}] Final Answer contains {len(all_findings)} findings")
                        # 🔥 发射每个发现的事件
                        for finding in all_findings[:5]:  # 限制数量
                            await self.emit_finding(
                                finding.get("title", "Unknown"),
                                finding.get("severity", "medium"),
                                finding.get("vulnerability_type", "other"),
                                finding.get("file_path", "")
                            )
                            # 🔥 记录洞察
                            self.add_insight(
                                f"发现 {finding.get('severity', 'medium')} 级别漏洞: {finding.get('title', 'Unknown')}"
                            )
                    else:
                        logger.warning(f"[{self.name}] Final Answer has no 'findings' key or is None: {step.final_answer}")
                    
                    # 🔥 记录工作完成
                    self.record_work(f"完成安全分析，发现 {len(all_findings)} 个潜在漏洞")
                    
                    await self.emit_llm_complete(
                        f"分析完成，发现 {len(all_findings)} 个潜在漏洞",
                        self._total_tokens
                    )
                    break
                
                # 执行工具
                if step.action:
                    # 🔥 发射 LLM 动作决策事件
                    await self.emit_llm_action(step.action, step.action_input or {})
                    
                    # 🔥 循环检测：追踪工具调用失败历史
                    tool_call_key = f"{step.action}:{json.dumps(step.action_input or {}, sort_keys=True)}"
                    if not hasattr(self, '_failed_tool_calls'):
                        self._failed_tool_calls = {}
                    
                    observation = await self.execute_tool(
                        step.action,
                        step.action_input or {}
                    )
                    
                    # 🔥 检测工具调用失败并追踪
                    is_tool_error = (
                        "失败" in observation or 
                        "错误" in observation or 
                        "不存在" in observation or
                        "文件过大" in observation or
                        "Error" in observation
                    )
                    
                    if is_tool_error:
                        self._failed_tool_calls[tool_call_key] = self._failed_tool_calls.get(tool_call_key, 0) + 1
                        fail_count = self._failed_tool_calls[tool_call_key]
                        
                        # 🔥 如果同一调用连续失败3次，添加强制跳过提示
                        if fail_count >= 3:
                            logger.warning(f"[{self.name}] Tool call failed {fail_count} times: {tool_call_key}")
                            observation += f"\n\n⚠️ **系统提示**: 此工具调用已连续失败 {fail_count} 次。请：\n"
                            observation += "1. 尝试使用不同的参数（如指定较小的行范围）\n"
                            observation += "2. 使用 search_code 工具定位关键代码片段\n"
                            observation += "3. 跳过此文件，继续分析其他文件\n"
                            observation += "4. 如果已有足够发现，直接输出 Final Answer"
                            
                            # 重置计数器但保留记录
                            self._failed_tool_calls[tool_call_key] = 0
                    else:
                        # 成功调用，重置失败计数
                        if tool_call_key in self._failed_tool_calls:
                            del self._failed_tool_calls[tool_call_key]
                    
                    # 🔥 工具执行后检查取消状态
                    if self.is_cancelled:
                        logger.info(f"[{self.name}] Cancelled after tool execution")
                        break
                    
                    step.observation = observation
                    
                    # 🔥 发射 LLM 观察事件
                    await self.emit_llm_observation(observation)
                    
                    # 添加观察结果到历史
                    self._conversation_history.append({
                        "role": "user",
                        "content": f"Observation:\n{observation}",
                    })
                else:
                    # LLM 没有选择工具，提示它继续
                    await self.emit_llm_decision("继续分析", "LLM 需要更多分析")
                    self._conversation_history.append({
                        "role": "user",
                        "content": "请继续分析。选择一个工具执行，或者如果分析完成，输出 Final Answer 汇总所有发现。",
                    })
            
            # 🔥 如果循环结束但没有发现，强制 LLM 总结
            if not all_findings and not self.is_cancelled and not error_message:
                await self.emit_thinking("📝 分析阶段结束，正在生成漏洞总结...")
                
                # 添加强制总结的提示
                self._conversation_history.append({
                    "role": "user",
                    "content": """分析阶段已结束。请立即输出 Final Answer，总结你发现的所有安全问题。

即使没有发现严重漏洞，也请总结你的分析过程和观察到的潜在风险点。

请按以下 JSON 格式输出：
```json
{
    "findings": [
        {
            "vulnerability_type": "sql_injection|xss|command_injection|path_traversal|ssrf|hardcoded_secret|other",
            "severity": "critical|high|medium|low",
            "title": "漏洞标题",
            "description": "详细描述",
            "file_path": "文件路径",
            "line_start": 行号,
            "code_snippet": "相关代码片段",
            "suggestion": "修复建议"
        }
    ],
    "summary": "分析总结"
}
```

Final Answer:""",
                })
                
                try:
                    summary_output, _ = await self.stream_llm_call(
                        self._conversation_history,
                        temperature=0.1,
                        max_tokens=4096,
                    )
                    
                    if summary_output and summary_output.strip():
                        # 解析总结输出
                        import re
                        summary_text = summary_output.strip()
                        summary_text = re.sub(r'```json\s*', '', summary_text)
                        summary_text = re.sub(r'```\s*', '', summary_text)
                        parsed_result = AgentJsonParser.parse(
                            summary_text,
                            default={"findings": [], "summary": ""}
                        )
                        if "findings" in parsed_result:
                            all_findings = parsed_result["findings"]
                except Exception as e:
                    logger.warning(f"[{self.name}] Failed to generate summary: {e}")
            
            # 处理结果
            duration_ms = int((time.time() - start_time) * 1000)
            
            # 🔥 如果被取消，返回取消结果
            if self.is_cancelled:
                await self.emit_event(
                    "info",
                    f"🛑 Analysis Agent 已取消: {len(all_findings)} 个发现, {self._iteration} 轮迭代"
                )
                return AgentResult(
                    success=False,
                    error="任务已取消",
                    data={"findings": all_findings},
                    iterations=self._iteration,
                    tool_calls=self._tool_calls,
                    tokens_used=self._total_tokens,
                    duration_ms=duration_ms,
                )
            
            # 🔥 如果有错误，返回失败结果
            if error_message:
                await self.emit_event(
                    "error",
                    f"❌ Analysis Agent 失败: {error_message}"
                )
                return AgentResult(
                    success=False,
                    error=error_message,
                    data={"findings": all_findings},
                    iterations=self._iteration,
                    tool_calls=self._tool_calls,
                    tokens_used=self._total_tokens,
                    duration_ms=duration_ms,
                )
            
            # 标准化发现
            logger.info(f"[{self.name}] Standardizing {len(all_findings)} findings")
            standardized_findings = []
            for finding in all_findings:
                # 确保 finding 是字典
                if not isinstance(finding, dict):
                    logger.warning(f"Skipping invalid finding (not a dict): {finding}")
                    continue
                    
                standardized = {
                    "vulnerability_type": finding.get("vulnerability_type", "other"),
                    "severity": finding.get("severity", "medium"),
                    "title": finding.get("title", "Unknown Finding"),
                    "description": finding.get("description", ""),
                    "file_path": finding.get("file_path", ""),
                    "line_start": finding.get("line_start") or finding.get("line", 0),
                    "code_snippet": finding.get("code_snippet", ""),
                    "source": finding.get("source", ""),
                    "sink": finding.get("sink", ""),
                    "suggestion": finding.get("suggestion", ""),
                    "confidence": finding.get("confidence", 0.7),
                    "needs_verification": finding.get("needs_verification", True),
                }
                standardized_findings.append(standardized)
            
            await self.emit_event(
                "info",
                f"Analysis Agent 完成: {len(standardized_findings)} 个发现, {self._iteration} 轮迭代, {self._tool_calls} 次工具调用"
            )

            # 🔥 CRITICAL: Log final findings count before returning
            logger.info(f"[{self.name}] Returning {len(standardized_findings)} standardized findings")

            return AgentResult(
                success=True,
                data={
                    "findings": standardized_findings,
                    "steps": [
                        {
                            "thought": s.thought,
                            "action": s.action,
                            "action_input": s.action_input,
                            "observation": s.observation[:500] if s.observation else None,
                        }
                        for s in self._steps
                    ],
                },
                iterations=self._iteration,
                tool_calls=self._tool_calls,
                tokens_used=self._total_tokens,
                duration_ms=duration_ms,
            )
            
        except Exception as e:
            logger.error(f"Analysis Agent failed: {e}", exc_info=True)
            return AgentResult(success=False, error=str(e))
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """获取对话历史"""
        return self._conversation_history
    
    def get_steps(self) -> List[AnalysisStep]:
        """获取执行步骤"""
        return self._steps
