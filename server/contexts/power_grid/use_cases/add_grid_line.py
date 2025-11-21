from __future__ import annotations
from dataclasses import dataclass, field
from typing import Mapping, Any, Dict

from ..domain.grid import Grid
from ..domain.entities import Line
from ..infrastructure.id_generator import IdGenerator


@dataclass
class AddGridLine:
    id_generator: IdGenerator = field(default_factory=IdGenerator)

    def execute(
        self,
        g: Grid,
        from_id: str,
        to_id: str,
        props: Mapping[str, Any] | None = None,
    ) -> Grid:
        if from_id not in g.nodes or to_id not in g.nodes:
            return g
        properties: Dict[str, Any] = dict(props or {})
        line = Line(
            id=self.id_generator.next_id(),
            from_id=from_id,
            to_id=to_id,
            props=properties,
        )
        g.add_line(line)
        return g
