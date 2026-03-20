import redis.asyncio as redis
import json
from typing import Any, Optional


class AsyncRedisClient:
    def __init__(
        self,
        url: str = "redis://localhost:6379/0",
    ):
        self._client = redis.from_url(url, decode_responses=True)

    async def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        return await self._client.set(key, json.dumps(value), ex=ex)

    async def get(self, key: str) -> Any:
        value = await self._client.get(key)
        return json.loads(value) if value else None

    async def delete(self, key: str) -> int:
        return await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return await self._client.exists(key) == 1

    async def close(self):
        await self._client.close()


redis_client = AsyncRedisClient()