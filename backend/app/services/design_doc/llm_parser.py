"""
LLM-enhanced design document parser

Uses LLM to extract structured information from design documents.
"""

import logging
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)


async def parse_with_llm(
    content: str,
    llm_service,
    max_tokens: int = 4000,
) -> Dict[str, Any]:
    """
    Parse design document using LLM to extract structured information
    
    Args:
        content: Document content
        llm_service: LLM service instance
        max_tokens: Maximum tokens for LLM response
    
    Returns:
        Parsed document information with enhanced structure
    """
    try:
        # Build extraction prompt
        prompt = f"""你是一个专业的技术文档分析专家。请分析以下设计文档，提取结构化信息。

## 设计文档内容
{content[:8000]}  # Limit content to avoid token overflow

请提取以下信息并以 JSON 格式返回：

1. **summary**: 文档摘要（200-500字）
2. **functions**: 功能定义列表，每个功能包含：
   - name: 功能名称
   - description: 功能描述
   - expected_behavior: 预期行为
   - dependencies: 依赖的功能列表（如果有）
3. **interfaces**: API接口定义列表，每个接口包含：
   - name: 接口名称
   - method: HTTP方法（GET/POST/PUT/DELETE等）
   - path: 接口路径
   - request_schema: 请求参数结构（如果有）
   - response_schema: 响应结构（如果有）
   - validation_rules: 参数验证规则（如果有）
4. **constraints**: 设计约束列表，每个约束包含：
   - type: 约束类型（security/performance/architecture/business）
   - description: 约束描述
   - requirements: 具体要求列表
5. **business_rules**: 业务规则列表，每个规则包含：
   - rule: 规则描述
   - conditions: 触发条件列表
   - actions: 执行动作列表

请以以下 JSON 格式返回：
```json
{{
    "summary": "文档摘要",
    "functions": [
        {{
            "name": "功能名称",
            "description": "功能描述",
            "expected_behavior": "预期行为",
            "dependencies": []
        }}
    ],
    "interfaces": [
        {{
            "name": "接口名称",
            "method": "GET",
            "path": "/api/endpoint",
            "request_schema": {{}},
            "response_schema": {{}},
            "validation_rules": []
        }}
    ],
    "constraints": [
        {{
            "type": "security",
            "description": "约束描述",
            "requirements": ["要求1", "要求2"]
        }}
    ],
    "business_rules": [
        {{
            "rule": "规则描述",
            "conditions": ["条件1"],
            "actions": ["动作1"]
        }}
    ]
}}
```

如果文档中没有某些信息，请返回空数组。确保返回有效的 JSON 格式。"""

        messages = [
            {
                "role": "system",
                "content": "你是一个专业的技术文档分析专家，擅长从设计文档中提取结构化信息。请严格按照要求的 JSON 格式返回结果。"
            },
            {"role": "user", "content": prompt}
        ]
        
        # Call LLM
        response = await llm_service.chat_completion(
            messages=messages,
            temperature=0.1,
            max_tokens=max_tokens,
        )
        
        # Extract content
        llm_output = response.get("content", "") or response.get("message", {}).get("content", "")
        
        if not llm_output:
            logger.warning("LLM returned empty response for document parsing")
            return _fallback_parse(content)
        
        # Try to extract JSON from response
        # LLM might wrap JSON in markdown code blocks
        json_text = llm_output.strip()
        
        # Remove markdown code blocks if present
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()
        
        try:
            parsed_data = json.loads(json_text)
            
            # Validate and normalize structure
            result = {
                "summary": parsed_data.get("summary", "")[:1000],
                "functions": parsed_data.get("functions", [])[:50],  # Limit to 50
                "interfaces": parsed_data.get("interfaces", [])[:50],
                "constraints": parsed_data.get("constraints", [])[:50],
                "business_rules": parsed_data.get("business_rules", [])[:50],
            }
            
            # Ensure all items have required fields
            for func in result["functions"]:
                if not isinstance(func, dict):
                    continue
                func.setdefault("name", "")
                func.setdefault("description", "")
                func.setdefault("expected_behavior", "")
                func.setdefault("dependencies", [])
            
            for iface in result["interfaces"]:
                if not isinstance(iface, dict):
                    continue
                iface.setdefault("name", "")
                iface.setdefault("method", "")
                iface.setdefault("path", "")
                iface.setdefault("request_schema", {})
                iface.setdefault("response_schema", {})
                iface.setdefault("validation_rules", [])
            
            for constraint in result["constraints"]:
                if not isinstance(constraint, dict):
                    continue
                constraint.setdefault("type", "general")
                constraint.setdefault("description", "")
                constraint.setdefault("requirements", [])
            
            for rule in result["business_rules"]:
                if not isinstance(rule, dict):
                    continue
                rule.setdefault("rule", "")
                rule.setdefault("conditions", [])
                rule.setdefault("actions", [])
            
            logger.info(f"Successfully parsed document with LLM: {len(result['functions'])} functions, {len(result['interfaces'])} interfaces")
            
            return result
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"LLM output: {llm_output[:500]}")
            # Fallback to basic parsing
            return _fallback_parse(content)
            
    except Exception as e:
        logger.error(f"LLM parsing failed: {e}", exc_info=True)
        return _fallback_parse(content)


def _fallback_parse(content: str) -> Dict[str, Any]:
    """Fallback parsing when LLM is unavailable or fails"""
    from .reader import _parse_text_document
    
    # Use basic text parsing as fallback
    return _parse_text_document(content, ".md")
