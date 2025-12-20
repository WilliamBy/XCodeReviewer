import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.audit_rule import AuditRule, AuditRuleSet
from app.services.crawler import CVECrawler

logger = logging.getLogger(__name__)

class RuleUpdaterService:
    RULE_SET_NAME = "Auto-Imported CVEs"
    RULE_SET_DESC = "Automatically imported from CIRCL CVE Search API"

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

        async with AsyncSessionLocal() as db:
            try:
                # 2. Get Rule Set
                rule_set = await cls.get_or_create_rule_set(db)

                # 3. Filter existing rules to avoid duplicates
                cve_ids = [item.get("id") for item in cves if item.get("id")]
                if not cve_ids:
                    return

                # Check which CVEs already exist in DB (globally, or just within this rule set? 
                # Better globally check by rule_code to avoid duplicates across sets if strict, 
                # but here we check within this set or generally by rule_code uniqueness)
                # AuditRule model has rule_code, let's assume it should be unique enough.
                
                result = await db.execute(
                    select(AuditRule.rule_code).where(AuditRule.rule_code.in_(cve_ids))
                )
                existing_codes = set(result.scalars().all())

                new_rules = []
                for cve in cves:
                    cve_id = cve.get("id")
                    if not cve_id or cve_id in existing_codes:
                        continue
                    
                    # Deduplicate in current batch
                    existing_codes.add(cve_id)

                    summary = cve.get("summary", "No description available.")
                    cvss = cve.get("cvss", 0.0)
                    
                    # Truncate name if too long
                    name = f"{cve_id}: {summary}"[:190] 
                    if len(summary) > 190:
                        name += "..."

                    rule = AuditRule(
                        rule_set_id=rule_set.id,
                        rule_code=cve_id,
                        name=name,
                        description=summary,
                        category="security",
                        severity=cls.map_cvss_to_severity(float(cvss) if cvss else 0.0),
                        reference_url=f"https://cve.circl.lu/cve/{cve_id}",
                        enabled=True
                    )
                    new_rules.append(rule)

                # 4. Bulk Insert
                if new_rules:
                    db.add_all(new_rules)
                    await db.commit()
                    logger.info(f"Successfully imported {len(new_rules)} new CVE rules.")
                else:
                    logger.info("No new CVEs to import.")

            except Exception as e:
                logger.error(f"Error during CVE sync: {e}")
                await db.rollback()
