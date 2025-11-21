from __future__ import annotations
import uuid

class IdGenerator:
    def next_id(self) -> str:
        return uuid.uuid4().hex
