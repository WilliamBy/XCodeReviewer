import logging
import json
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.audit_rule import AuditRule, AuditRuleSet
from app.services.crawler import CVECrawler
from app.services.llm.service import LLMService

logger = logging.getLogger(__name__)

class RuleUpdaterService:
    RULE_SET_NAME = "CVE漏洞模式"
    RULE_SET_DESC = "自动解析的CVE漏洞库模式，实时更新"

    @classmethod
    async def get_or_create_rule_set(cls, db: AsyncSession) -> AuditRuleSet:
        result = await db.execute(select(AuditRuleSet).where(AuditRuleSet.name == cls.RULE_SET_NAME))
        rule_set = result.scalars().first()
        
        if not rule_set:
            rule_set = AuditRuleSet(
                name=cls.RULE_SET_NAME,
                description=cls.RULE_SET_DESC,
                language="all",
                rule_type="security",
                is_system=True
            )
            db.add(rule_set)
            await db.commit()
            await db.refresh(rule_set)
            logger.info(f"Created new rule set: {cls.RULE_SET_NAME}")
        
        return rule_set

    @classmethod
    def map_cvss_to_severity(cls, cvss: float) -> str:
        if not cvss:
            return "low"
        if cvss >= 9.0:
            return "critical"
        elif cvss >= 7.0:
            return "high"
        elif cvss >= 4.0:
            return "medium"
        else:
            return "low"

    @classmethod
    async def enhance_cve_with_llm(cls, cve_id: str, cve_url: str, summary: str, cvss: float) -> dict:
        """
        使用LLM增强CVE规则字段
        
        Args:
            cve_id: CVE编号
            cve_url: CVE详情页面URL
            summary: CVE摘要(可能为空)
            cvss: CVSS分数
        
        Returns:
            包含增强字段的字典: {name, description, category, custom_prompt, fix_suggestion}
        """
        try:
            # 1. 获取CVE详情页面内容
            logger.info(f"Fetching CVE details for {cve_id} from {cve_url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(cve_url)
                response.raise_for_status()
                page_content = response.text
            
            # 截取页面内容,避免token过多(取前8000字符)
            if len(page_content) > 8000:
                page_content = page_content[:8000] + "...(truncated)"
            
            # 2. 构建LLM提示词 - 要求具体的代码级别特征
            system_prompt = """你是一个代码安全审计专家,专门从CVE漏洞中提取**具体的代码级别**的审计特征。

**核心要求**: 只有当CVE包含**明确的代码细节**时才提取,否则返回空JSON {}

输出格式必须是纯JSON,不要包含markdown标记:
{
    "name": "具体的代码问题描述(必须包含函数名/文件名/具体代码模式)",
    "description": "代码问题的具体位置和触发条件",
    "category": "security",
    "custom_prompt": "具体的代码检测规则(必须包含可识别的代码特征)",
    "fix_suggestion": "具体的代码修复方法"
}

**严格标准**:

1. **name** 必须包含以下至少一项,否则返回空{}:
   - 具体的函数名(如: dc_stream_get_scanoutpos函数缺少NULL检查)
   - 具体的文件路径(如: drivers/gpu/drm/amd/display/中的指针访问问题)
   - 具体的代码模式(如: shortcode回调函数中未转义的$atts['id']直接输出)
   
   ❌ 不合格: "内核驱动中指针访问前缺少NULL检查"
   ✅ 合格: "dc_stream_get_scanoutpos()函数访问stream->link前缺少NULL检查"

2. **description** 必须说明:
   - 具体的代码位置(文件/函数/行号范围)
   - 具体的变量/参数名称
   - 具体的触发场景
   
   ❌ 不合格: "访问指针前未进行NULL验证"
   ✅ 合格: "在dc_stream_get_scanoutpos()函数中,第123行直接访问stream->link->ddc,但stream可能为NULL"

3. **custom_prompt** 必须包含:
   - 具体要检查的函数名/变量名
   - 具体的代码模式(用伪代码或正则表达式描述)
   - 具体的检测步骤
   
   ❌ 不合格: "检查指针解引用前是否有NULL检查"
   ✅ 合格: "检查dc_stream_get_scanoutpos()函数:
   1) 定位stream->link或stream->link->ddc的访问
   2) 向上查找5行内是否有if(!stream)或if(!stream->link)检查
   3) 检查所有调用路径是否保证stream非NULL"

4. **fix_suggestion** 必须包含:
   - 具体要添加的代码(if语句/函数调用等)
   - 具体的位置(在哪个函数的哪里添加)
   
   ❌ 不合格: "添加NULL检查"
   ✅ 合格: "在dc_stream_get_scanoutpos()函数开头添加:
   if (!stream || !stream->link) {
       return -EINVAL;
   }"

**如果CVE不包含以下信息,必须返回空JSON {}**:
- 没有具体的函数名/文件名
- 没有具体的代码片段或代码模式描述
- 只有泛泛的漏洞类型描述(如"XSS漏洞"、"NULL指针"等)
- 只有影响范围描述,没有代码细节

**示例**:

✅ 可以提取(包含具体代码细节):
"The vulnerability is in the dc_stream_get_scanoutpos() function where stream->link is accessed without NULL check..."

❌ 必须返回空{}(缺少代码细节):
"The driver has a NULL pointer dereference issue in multi-monitor configurations..."

记住: **宁缺毋滥**! 如果没有足够的代码细节,返回空JSON {},不要编造泛泛的描述!"""

            user_prompt = f"""CVE ID: {cve_id}
CVSS分数: {cvss}
CVE摘要: {summary}

CVE详情页面内容:
{page_content}

请分析以上CVE信息。**只有当包含具体代码细节时才提取**,否则返回空JSON {{}}。"""

            # 3. 调用LLM服务
            llm_service = LLMService()
            response = await llm_service.chat_completion_raw(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2048
            )
            
            content = response.get("content", "")
            if not content:
                raise Exception("LLM returned empty content")
            
            # 4. 解析LLM返回的JSON
            # 尝试提取JSON对象
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            enhanced_fields = json.loads(content)
            
            # 5. 验证是否包含有效内容
            # 如果返回空JSON或custom_prompt为空/太短,说明没有足够的代码细节
            if not enhanced_fields or not enhanced_fields.get("custom_prompt"):
                logger.warning(f"CVE {cve_id} lacks sufficient code details, skipping...")
                return None
            
            # 检查custom_prompt是否足够具体(至少100字符,包含具体的检测步骤)
            custom_prompt = enhanced_fields.get("custom_prompt", "")
            if len(custom_prompt) < 100:
                logger.warning(f"CVE {cve_id} custom_prompt too generic (len={len(custom_prompt)}), skipping...")
                return None
            
            # 验证必要字段
            required_fields = ["name", "description", "category", "custom_prompt", "fix_suggestion"]
            for field in required_fields:
                if field not in enhanced_fields or not enhanced_fields[field]:
                    logger.warning(f"CVE {cve_id} missing required field '{field}', skipping...")
                    return None
            
            # 确保name不超过180字符
            if len(enhanced_fields["name"]) > 180:
                enhanced_fields["name"] = enhanced_fields["name"][:177] + "..."
            
            logger.info(f"Successfully enhanced CVE {cve_id} with LLM")
            return enhanced_fields
            
        except Exception as e:
            logger.error(f"Failed to enhance CVE {cve_id} with LLM: {e}")
            raise

    @classmethod
    async def sync_cve_rules(cls):
        """
        Main entry point for the background task.
        """
        logger.info("Starting CVE rule synchronization...")
        
        # 1. Fetch latest CVEs
        cves = await CVECrawler.fetch_latest_cves()
        if not cves:
            logger.info("No CVEs fetched. Skipping update.")
            return

        # 🔍 调试:打印第一个CVE的数据结构
        if cves:
            logger.info(f"🔍 DEBUG: First CVE data structure: {list(cves[0].keys())}")
            logger.info(f"🔍 DEBUG: First CVE sample: {cves[0]}")

        async with AsyncSessionLocal() as db:
            try:
                # 2. Get Rule Set
                rule_set = await cls.get_or_create_rule_set(db)

                # 3. Filter existing rules to avoid duplicates
                # CVE 数据结构: cveMetadata.cveId 包含 CVE ID
                cve_ids = []
                for item in cves:
                    cve_metadata = item.get("cveMetadata", {})
                    cve_id = cve_metadata.get("cveId")
                    if cve_id:
                        cve_ids.append(cve_id)
                
                logger.info(f"🔍 DEBUG: Extracted {len(cve_ids)} CVE IDs from {len(cves)} CVEs")
                logger.info(f"🔍 DEBUG: CVE IDs sample: {cve_ids[:5] if cve_ids else 'EMPTY'}")
                
                if not cve_ids:
                    logger.warning("⚠️ No CVE IDs extracted! Check CVE data structure.")
                    return

                # Check which CVEs already exist in DB
                result = await db.execute(
                    select(AuditRule.rule_code).where(AuditRule.rule_code.in_(cve_ids))
                )
                existing_codes = set(result.scalars().all())

                new_rules = []
                for cve in cves:
                    # 从正确的路径提取 CVE 数据
                    cve_metadata = cve.get("cveMetadata", {})
                    cve_id = cve_metadata.get("cveId")
                    
                    if not cve_id or cve_id in existing_codes:
                        continue
                    
                    # Deduplicate in current batch
                    existing_codes.add(cve_id)

                    # 提取描述信息
                    containers = cve.get("containers", {})
                    cna = containers.get("cna", {})
                    descriptions = cna.get("descriptions", [])
                    summary = descriptions[0].get("value", "No description available.") if descriptions else "No description available."
                    
                    # 提取 CVSS 分数
                    metrics = cna.get("metrics", [])
                    cvss = 0.0
                    if metrics:
                        cvss_v3 = metrics[0].get("cvssV3_1", {})
                        cvss = cvss_v3.get("baseScore", 0.0)
                    cve_url = f"https://cve.circl.lu/cve/{cve_id}"
                    
                    # 使用LLM增强CVE规则
                    try:
                        logger.info(f"Enhancing CVE {cve_id} with LLM...")
                        enhanced_fields = await cls.enhance_cve_with_llm(
                            cve_id=cve_id,
                            cve_url=cve_url,
                            summary=summary,
                            cvss=float(cvss) if cvss else 0.0
                        )
                        
                        # 如果返回None,说明CVE缺少具体代码细节,跳过
                        if enhanced_fields is None:
                            logger.info(f"⏭️  Skipping CVE {cve_id} - insufficient code details")
                            continue
                        
                        rule = AuditRule(
                            rule_set_id=rule_set.id,
                            rule_code=cve_id,
                            name=enhanced_fields.get("name", f"{cve_id}: {summary}"[:190]),
                            description=enhanced_fields.get("description", summary),
                            category=enhanced_fields.get("category", "security"),
                            severity=cls.map_cvss_to_severity(float(cvss) if cvss else 0.0),
                            custom_prompt=enhanced_fields.get("custom_prompt"),
                            fix_suggestion=enhanced_fields.get("fix_suggestion"),
                            reference_url=cve_url,
                            enabled=True
                        )
                        logger.info(f"✅ Successfully enhanced CVE {cve_id} with LLM")
                        
                        # 打印规则详细信息
                        logger.info(f"📋 Rule Details for {cve_id}:")
                        logger.info(f"  ├─ Name: {rule.name}")
                        logger.info(f"  ├─ Category: {rule.category}")
                        logger.info(f"  ├─ Severity: {rule.severity}")
                        logger.info(f"  ├─ Description: {rule.description[:100]}..." if len(rule.description) > 100 else f"  ├─ Description: {rule.description}")
                        logger.info(f"  ├─ Custom Prompt: {rule.custom_prompt[:80]}..." if rule.custom_prompt and len(rule.custom_prompt) > 80 else f"  ├─ Custom Prompt: {rule.custom_prompt or 'N/A'}")
                        logger.info(f"  └─ Fix Suggestion: {rule.fix_suggestion[:80]}..." if rule.fix_suggestion and len(rule.fix_suggestion) > 80 else f"  └─ Fix Suggestion: {rule.fix_suggestion or 'N/A'}")
                        
                    except Exception as e:
                        logger.error(f"⚠️ LLM enhancement failed for {cve_id}: {e}, skipping this CVE")
                        continue
                    
                    # 💾 逐个保存到数据库,而不是批量插入
                    try:
                        db.add(rule)
                        await db.commit()
                        await db.refresh(rule)
                        logger.info(f"💾 Saved CVE {cve_id} to database (ID: {rule.id})")
                        new_rules.append(rule)
                    except Exception as e:
                        logger.error(f"❌ Failed to save CVE {cve_id} to database: {e}")
                        await db.rollback()
                        continue

                # 4. 报告结果
                if new_rules:
                    logger.info(f"✅ Successfully imported {len(new_rules)} new CVE rules.")
                else:
                    logger.info("No new CVEs to import.")

            except Exception as e:
                logger.error(f"Error during CVE sync: {e}")
                await db.rollback()
