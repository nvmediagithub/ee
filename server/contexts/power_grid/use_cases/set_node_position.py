from __future__ import annotations
from dataclasses import dataclass

from ..domain.grid import Grid
from ..domain.geometry import Point


@dataclass
class SetNodePosition:
    def execute(self, g: Grid, node_id: str, x: float, y: float) -> Grid:
        node = g.nodes.get(node_id)
        if not node:
            return g
        node.position = Point(float(x), float(y))
        return g
