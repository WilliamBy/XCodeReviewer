import httpx
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class CVECrawler:
    """
    Crawler service to fetch CVE data from public APIs.
    Source: cve.circl.lu (Open Source Computer Security Incident Response Team Luxembourg)
    """
    BASE_URL = "https://cve.circl.lu/api/last"

    @classmethod
    async def fetch_latest_cves(cls, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Fetch latest CVEs from CIRCL API.
        The API typically returns the last 30 CVEs.
        """
        logger.info(f"Fetching latest CVEs from {cls.BASE_URL}...")
        async with httpx.AsyncClient() as client:
            try:
                # Add a timeout to prevent hanging
                response = await client.get(cls.BASE_URL, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                if not isinstance(data, list):
                    logger.warning(f"Unexpected response format from CVE API: {type(data)}")
                    return []
                
                logger.info(f"Successfully fetched {len(data)} CVEs from CIRCL.")
                return data
            except httpx.HTTPError as e:
                logger.error(f"HTTP error occurred while fetching CVEs: {e}")
                return []
            except Exception as e:
                logger.error(f"Unexpected error while fetching CVEs: {e}")
                return []
