from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Any

from .entities import BaseNode, Line, Source, Consumer, Pole

@dataclass
class Grid:
    id: str
    nodes: Dict[str, BaseNode] = field(default_factory=dict)
    lines: Dict[str, Line] = field(default_factory=dict)
    meta: Dict[str, Any] = field(default_factory=dict)

    def add_node(self, node: BaseNode) -> None:
        self.nodes[node.id] = node

    def add_line(self, line: Line) -> None:
        self.lines[line.id] = line

    def sources(self) -> List[Source]:
        return [n for n in self.nodes.values() if isinstance(n, Source)]

    def consumers(self) -> List[Consumer]:
        return [n for n in self.nodes.values() if isinstance(n, Consumer)]

    def poles(self) -> List[Pole]:
        return [n for n in self.nodes.values() if isinstance(n, Pole)]
