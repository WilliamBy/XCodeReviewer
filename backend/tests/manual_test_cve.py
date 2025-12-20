import asyncio
import sys
import os
import logging

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Configure logging
logging.basicConfig(level=logging.INFO)

from app.services.rule_updater import RuleUpdaterService
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func
from app.models.audit_rule import AuditRule, AuditRuleSet

async def verify_cve_sync():
    print("=" * 50)
    print("Starting Manual Verification of CVE Sync")
    print("=" * 50)

    try:
        # Run Sync
        await RuleUpdaterService.sync_cve_rules()

        # Verify Results
        async with AsyncSessionLocal() as db:
            # Check Rule Set
            rule_set = await db.scalar(
                select(AuditRuleSet).where(AuditRuleSet.name == RuleUpdaterService.RULE_SET_NAME)
            )
            if rule_set:
                print(f"[PASS] Rule Set created: {rule_set.name}")
            else:
                print("[FAIL] Rule Set not found!")

            # Check Rules
            rule_count = await db.scalar(
                select(func.count(AuditRule.id)).where(AuditRule.rule_set_id == rule_set.id)
            )
            print(f"[INFO] Number of CVE Rules imported: {rule_count}")
            
            if rule_count > 0:
                print("[PASS] Successfully imported rules.")
            else:
                print("[WARN] No rules imported. This might be normal if API returned no new CVEs or fetch failed.")

    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_cve_sync())
