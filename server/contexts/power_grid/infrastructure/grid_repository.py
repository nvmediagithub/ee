from __future__ import annotations
from typing import Dict, Optional, Iterable

from ..domain.grid import Grid

class GridRepository:
    def save(self, grid: Grid) -> None:
        raise NotImplementedError

    def get(self, grid_id: str) -> Optional[Grid]:
        raise NotImplementedError

    def list(self) -> Iterable[Grid]:
        raise NotImplementedError

    def delete(self, grid_id: str) -> None:
        raise NotImplementedError


class InMemoryGridRepository(GridRepository):
    def __init__(self) -> None:
        self._store: Dict[str, Grid] = {}

    def save(self, grid: Grid) -> None:
        self._store[grid.id] = grid

    def get(self, grid_id: str) -> Optional[Grid]:
        return self._store.get(grid_id)

    def list(self) -> Iterable[Grid]:
        return list(self._store.values())

    def delete(self, grid_id: str) -> None:
        self._store.pop(grid_id, None)
