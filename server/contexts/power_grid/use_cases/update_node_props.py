from __future__ import annotations
from dataclasses import dataclass
from typing import Mapping, Any

from ..domain.grid import Grid

@dataclass
class UpdateNodeProps:
    def execute(self, g: Grid, node_id: str, props: Mapping[str, Any]) -> Grid:
        node = g.nodes.get(node_id)
        if not node:
            return g
        node.props.update(props)
        return g
