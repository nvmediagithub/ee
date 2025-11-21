from __future__ import annotations
from dataclasses import dataclass
import random

from ..domain.grid import Grid

@dataclass
class TriggerFault:
    probability: float = 1.0

    def execute(self, g: Grid, line_id: str | None = None) -> Grid:
        if random.random() > self.probability:
            return g

        if line_id and line_id in g.lines:
            g.lines[line_id].status = "faulted"
            return g

        candidates = [l for l in g.lines.values() if l.status == "online"]
        if candidates:
            random.choice(candidates).status = "faulted"
        return g
