from __future__ import annotations
from dataclasses import dataclass, field
from typing import Mapping, Any, Dict

from ..domain.grid import Grid
from ..domain.entities import Source, Transformer, Pole, Consumer
from ..domain.geometry import Point
from ..infrastructure.id_generator import IdGenerator


@dataclass
class AddGridNode:
    id_generator: IdGenerator = field(default_factory=IdGenerator)

    def execute(
        self,
        g: Grid,
        node_type: str,
        position: Mapping[str, Any] | None = None,
        props: Mapping[str, Any] | None = None,
    ) -> Grid:
        position = position or {}
        props = props or {}
        x = float(position.get("x", 0.0))
        y = float(position.get("y", 0.0))
        target: Dict[str, Any] = dict(props)

        kind = node_type.lower()
        if kind == "source":
            node = Source(
                id=self.id_generator.next_id(),
                position=Point(x, y),
                props=target,
            )
        elif kind == "transformer":
            node = Transformer(
                id=self.id_generator.next_id(),
                position=Point(x, y),
                props=target,
            )
        elif kind == "pole":
            node = Pole(
                id=self.id_generator.next_id(),
                position=Point(x, y),
                props=target,
            )
        elif kind == "consumer" or kind == "house":
            node = Consumer(
                id=self.id_generator.next_id(),
                position=Point(x, y),
                props=target,
            )
        else:
            return g

        g.add_node(node)
        return g
