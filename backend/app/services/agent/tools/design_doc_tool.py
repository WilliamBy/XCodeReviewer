"""
Design Document Reading Tool

Agent tool for reading and querying project design documents.
"""

import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from .base import AgentTool, ToolResult
from ...design_doc.reader import load_design_document

logger = logging.getLogger(__name__)


class ReadDesignDocInput(BaseModel):
    """读取设计文档输入"""
    doc_path: Optional[str] = Field(
        default=None,
        description="设计文档路径（相对于项目根目录）。如果不提供，将使用任务配置中的设计文档路径。"
    )
    query: Optional[str] = Field(
        default=None,
        description="查询问题，如 '有哪些API接口？'、'功能模块有哪些？'。如果不提供，返回完整文档信息。"
    )


class ReadDesignDocTool(AgentTool):
    """
    设计文档读取工具
    
    允许 Agent 动态读取和查询项目设计文档。
    """
    
    def __init__(
        self,
        project_root: str,
        design_doc_path: Optional[str] = None,
        llm_service=None,
    ):
        """
        初始化设计文档读取工具
        
        Args:
            project_root: 项目根目录
            design_doc_path: 默认设计文档路径（从任务配置获取）
            llm_service: LLM 服务（用于智能查询）
        """
        super().__init__()
        self.project_root = project_root
        self.default_doc_path = design_doc_path
        self.llm_service = llm_service
        self._cached_doc: Optional[Dict[str, Any]] = None
    
    @property
    def name(self) -> str:
        return "read_design_doc"
    
    @property
    def description(self) -> str:
        return """读取和查询项目设计文档。

使用场景:
- 了解项目的功能定义和接口规范
- 检查代码实现是否符合设计文档要求
- 查询特定的功能或接口信息

输入:
- doc_path: 可选，设计文档路径。如果不提供，使用任务配置中的路径
- query: 可选，查询问题。如 '有哪些API接口？'、'功能模块有哪些？'、'安全要求是什么？'

如果提供了 query，工具会使用 LLM 从文档中提取相关信息。
如果不提供 query，返回完整的文档解析结果。

注意: 文档会被缓存，多次调用不会重复读取。"""
    
    @property
    def args_schema(self):
        return ReadDesignDocInput
    
    async def _load_document(self, doc_path: str) -> ToolResult:
        """加载设计文档"""
        try:
            doc_info = await load_design_document(self.project_root, doc_path)
            
            if not doc_info:
                return ToolResult(
                    success=False,
                    error=f"无法加载设计文档: {doc_path}",
                )
            
            if doc_info.get("error"):
                return ToolResult(
                    success=False,
                    error=f"设计文档加载错误: {doc_info.get('error')}",
                )
            
            return ToolResult(
                success=True,
                data=doc_info,
            )
        except Exception as e:
            logger.error(f"Failed to load design document: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"加载设计文档失败: {str(e)}",
            )
    
    async def _query_document(self, doc_info: Dict[str, Any], query: str) -> ToolResult:
        """使用 LLM 查询文档"""
        if not self.llm_service:
            return ToolResult(
                success=False,
                error="LLM 服务不可用，无法执行智能查询",
            )
        
        try:
            # 构建查询 prompt
            doc_summary = doc_info.get("summary", "")[:2000]
            doc_functions = doc_info.get("functions", [])[:20]
            doc_interfaces = doc_info.get("interfaces", [])[:20]
            doc_constraints = doc_info.get("constraints", [])[:20]
            
            prompt = f"""你是一个设计文档分析助手。请根据以下设计文档内容回答用户的问题。

## 设计文档摘要
{doc_summary}

## 功能定义
"""
            for i, func in enumerate(doc_functions, 1):
                func_name = func.get("name", f"功能 {i}")
                func_desc = func.get("description", "")[:200]
                prompt += f"{i}. **{func_name}**: {func_desc}\n"
            
            prompt += f"""
## 接口规范
"""
            for i, iface in enumerate(doc_interfaces, 1):
                iface_desc = iface.get("description", "")[:200]
                prompt += f"{i}. {iface_desc}\n"
            
            prompt += f"""
## 设计约束
"""
            for i, constraint in enumerate(doc_constraints, 1):
                constraint_desc = constraint.get("description", "")[:200]
                prompt += f"{i}. {constraint_desc}\n"
            
            prompt += f"""
## 用户问题
{query}

请基于以上设计文档内容，准确回答用户的问题。如果文档中没有相关信息，请明确说明。"""
            
            # 调用 LLM
            messages = [
                {"role": "system", "content": "你是一个专业的设计文档分析助手，能够准确理解文档内容并回答相关问题。"},
                {"role": "user", "content": prompt},
            ]
            
            response = await self.llm_service.chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=2000,
            )
            
            answer = response.get("content", "") or response.get("message", {}).get("content", "")
            
            if not answer:
                return ToolResult(
                    success=False,
                    error="LLM 返回空响应",
                )
            
            return ToolResult(
                success=True,
                data={
                    "query": query,
                    "answer": answer,
                    "source": "design_document",
                },
            )
            
        except Exception as e:
            logger.error(f"Failed to query design document: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"查询设计文档失败: {str(e)}",
            )
    
    async def _execute(
        self,
        doc_path: Optional[str] = None,
        query: Optional[str] = None,
        **kwargs
    ) -> ToolResult:
        """执行设计文档读取"""
        try:
            # 确定文档路径
            target_doc_path = doc_path or self.default_doc_path
            
            if not target_doc_path:
                return ToolResult(
                    success=False,
                    error="未指定设计文档路径。请在任务配置中设置 design_doc_path，或在调用时提供 doc_path 参数。",
                )
            
            # 加载文档（使用缓存）
            if self._cached_doc is None:
                load_result = await self._load_document(target_doc_path)
                if not load_result.success:
                    return load_result
                self._cached_doc = load_result.data
            
            doc_info = self._cached_doc
            
            # 如果有查询，使用 LLM 查询
            if query:
                return await self._query_document(doc_info, query)
            
            # 否则返回完整文档信息
            output_parts = [f"📄 设计文档: {target_doc_path}\n"]
            
            if doc_info.get("summary"):
                output_parts.append(f"\n## 文档摘要\n{doc_info['summary'][:1000]}")
            
            functions = doc_info.get("functions", [])
            if functions:
                output_parts.append(f"\n## 功能定义（共 {len(functions)} 个）")
                for i, func in enumerate(functions[:20], 1):
                    func_name = func.get("name", f"功能 {i}")
                    func_desc = func.get("description", "")[:200]
                    output_parts.append(f"{i}. **{func_name}**: {func_desc}")
                if len(functions) > 20:
                    output_parts.append(f"... 还有 {len(functions) - 20} 个功能")
            
            interfaces = doc_info.get("interfaces", [])
            if interfaces:
                output_parts.append(f"\n## 接口规范（共 {len(interfaces)} 个）")
                for i, iface in enumerate(interfaces[:20], 1):
                    iface_desc = iface.get("description", "")[:200]
                    output_parts.append(f"{i}. {iface_desc}")
                if len(interfaces) > 20:
                    output_parts.append(f"... 还有 {len(interfaces) - 20} 个接口")
            
            constraints = doc_info.get("constraints", [])
            if constraints:
                output_parts.append(f"\n## 设计约束（共 {len(constraints)} 个）")
                for i, constraint in enumerate(constraints[:20], 1):
                    constraint_desc = constraint.get("description", "")[:200]
                    output_parts.append(f"{i}. {constraint_desc}")
                if len(constraints) > 20:
                    output_parts.append(f"... 还有 {len(constraints) - 20} 个约束")
            
            business_rules = doc_info.get("business_rules", [])
            if business_rules:
                output_parts.append(f"\n## 业务规则（共 {len(business_rules)} 个）")
                for i, rule in enumerate(business_rules[:20], 1):
                    rule_desc = rule.get("rule", "")[:200]
                    output_parts.append(f"{i}. {rule_desc}")
                if len(business_rules) > 20:
                    output_parts.append(f"... 还有 {len(business_rules) - 20} 个规则")
            
            return ToolResult(
                success=True,
                data="\n".join(output_parts),
                metadata={
                    "doc_path": target_doc_path,
                    "functions_count": len(functions),
                    "interfaces_count": len(interfaces),
                    "constraints_count": len(constraints),
                }
            )
            
        except Exception as e:
            logger.error(f"Read design doc tool error: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"读取设计文档失败: {str(e)}",
            )
