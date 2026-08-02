"""Real-Time Business Intelligence Engine powered by Tavily Search API.

Provides live market intelligence, competitor research, pricing benchmarks, regulatory tracking,
and investor insights with MongoDB caching, retries, and graceful fallbacks.
"""

import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.database.collections import CollectionName, get_collection

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 48 * 3600  # 48 hours cache expiration


class TavilyService:
    """Enterprise Real-Time Business Intelligence Research Engine."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.TAVILY_API_KEY
        self.api_url = "https://api.tavily.com/search"

    def _generate_cache_key(self, query: str, search_depth: str, max_results: int) -> str:
        """Generates deterministic MD5 hash for query parameter combination."""
        raw = f"{query.strip().lower()}:{search_depth}:{max_results}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    async def _get_from_cache(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        """Queries MongoDB tavily_cache for valid unexpired search results."""
        try:
            col = get_collection(CollectionName.TAVILY_CACHE)
            doc = await col.find_one({"cache_key": cache_key})
            if doc:
                cached_at = doc.get("created_at")
                if cached_at:
                    now = datetime.now(timezone.utc)
                    if isinstance(cached_at, datetime):
                        if cached_at.tzinfo is None:
                            cached_at = cached_at.replace(tzinfo=timezone.utc)
                        age = (now - cached_at).total_seconds()
                    else:
                        age = 0
                    if age < CACHE_TTL_SECONDS:
                        logger.info(f"[Business Intelligence Engine] Cache HIT for key {cache_key[:8]}")
                        return doc.get("results", [])
                    else:
                        logger.info(f"[Business Intelligence Engine] Cache EXPIRED for key {cache_key[:8]}")
        except Exception as e:
            logger.warning(f"[Business Intelligence Engine] MongoDB Cache lookup notice: {e}")
        return None

    async def _save_to_cache(self, cache_key: str, query: str, results: List[Dict[str, Any]]) -> None:
        """Persists search results into MongoDB tavily_cache collection."""
        try:
            col = get_collection(CollectionName.TAVILY_CACHE)
            await col.update_one(
                {"cache_key": cache_key},
                {
                    "$set": {
                        "cache_key": cache_key,
                        "query": query,
                        "results": results,
                        "result_count": len(results),
                        "created_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"[Business Intelligence Engine] MongoDB Cache write notice: {e}")

    async def validate_key(self) -> bool:
        """Validates Tavily API Key during backend startup."""
        if not self.api_key:
            logger.warning("[Business Intelligence Engine] TAVILY_API_KEY is missing or empty.")
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    self.api_url,
                    json={"api_key": self.api_key, "query": "test market research", "max_results": 1},
                )
                if res.status_code == 200:
                    logger.info("[Business Intelligence Engine] Tavily API key validated successfully.")
                    return True
                else:
                    logger.warning(f"[Business Intelligence Engine] Key validation returned HTTP {res.status_code}")
                    return False
        except Exception as e:
            logger.warning(f"[Business Intelligence Engine] Key validation notice: {e}")
            return False

    async def search(
        self,
        query: str,
        search_depth: str = "basic",
        max_results: int = 5,
        include_answer: bool = True,
    ) -> Dict[str, Any]:
        """Core search orchestrator with caching, retries, and error resilience."""
        if not query or not query.strip():
            return {"query": query, "answer": "", "results": []}

        cache_key = self._generate_cache_key(query, search_depth, max_results)
        cached_results = await self._get_from_cache(cache_key)
        if cached_results is not None:
            return {
                "query": query,
                "answer": f"Cached business intelligence for '{query}'",
                "results": cached_results,
                "cached": True,
            }

        if not self.api_key:
            logger.warning("[Business Intelligence Engine] Skipping live search: API key not set")
            return {"query": query, "answer": "", "results": [], "error": "API key unconfigured"}

        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": search_depth,
            "max_results": max_results,
            "include_answer": include_answer,
            "include_domains": [],
            "exclude_domains": [],
        }

        # Automatic retry logic (up to 2 attempts)
        for attempt in range(1, 3):
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    response = await client.post(self.api_url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        raw_results = data.get("results", [])
                        sanitized_results = [
                            {
                                "title": r.get("title", ""),
                                "url": r.get("url", ""),
                                "content": r.get("content", ""),
                                "score": r.get("score", 0.0),
                            }
                            for r in raw_results
                        ]

                        # Persist in cache
                        await self._save_to_cache(cache_key, query, sanitized_results)

                        logger.info(
                            f"[Business Intelligence Engine] Search SUCCESS for query '{query[:30]}...' | "
                            f"Results: {len(sanitized_results)}"
                        )
                        return {
                            "query": query,
                            "answer": data.get("answer", ""),
                            "results": sanitized_results,
                            "cached": False,
                        }
                    else:
                        logger.warning(
                            f"[Business Intelligence Engine] Attempt {attempt} returned HTTP {response.status_code}: {response.text[:150]}"
                        )
            except Exception as exc:
                logger.warning(f"[Business Intelligence Engine] Attempt {attempt} network error: {exc}")

        logger.error(f"[Business Intelligence Engine] All search attempts failed for query: '{query}'")
        return {"query": query, "answer": "", "results": [], "error": "Search service unavailable"}

    # --- REUSABLE SPECIALIZED DOMAIN SEARCH METHOD HELPERS ---
    async def search_competitors(self, startup_name: str, industry: str) -> Dict[str, Any]:
        """Searches direct and indirect competitors in the specified industry."""
        q = f"Top competitors companies products pricing features in {industry} industry similar to {startup_name}"
        return await self.search(q, max_results=6)

    async def search_market_trends(self, industry: str) -> Dict[str, Any]:
        """Searches current industry trends, emerging technologies, and growth drivers."""
        q = f"Current industry market trends emerging technology growth drivers 2026 for {industry}"
        return await self.search(q, max_results=5)

    async def search_industry_reports(self, industry: str) -> Dict[str, Any]:
        """Searches industry size, market share reports, and forecast metrics."""
        q = f"Market size industry statistics revenue forecast analysis report for {industry}"
        return await self.search(q, max_results=5)

    async def search_funding_trends(self, industry: str) -> Dict[str, Any]:
        """Searches recent venture capital funding rounds, seed investments, and startup valuations."""
        q = f"Recent venture capital seed funding rounds startup investments valuation benchmark in {industry}"
        return await self.search(q, max_results=5)

    async def search_regulations(self, industry: str) -> Dict[str, Any]:
        """Searches regulatory compliance requirements, policy updates, and legal risks."""
        q = f"Legal regulatory compliance requirements policy risks updates for {industry} industry"
        return await self.search(q, max_results=5)

    async def search_pricing(self, companies: List[str]) -> Dict[str, Any]:
        """Searches pricing models, SaaS tier pricing, and monetization strategy for named companies."""
        comp_str = ", ".join(companies) if companies else "SaaS companies"
        q = f"Pricing plans monthly cost subscription tiers revenue model for {comp_str}"
        return await self.search(q, max_results=5)

    async def search_similar_startups(self, startup_name: str, industry: str) -> Dict[str, Any]:
        """Searches similar early-stage startups, product offerings, and market traction."""
        q = f"Similar funded early stage startups companies products solving problem in {industry} {startup_name}"
        return await self.search(q, max_results=5)
