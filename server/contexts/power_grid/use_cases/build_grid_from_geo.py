from __future__ import annotations
from dataclasses import dataclass, field
import random
from typing import Sequence, Any

from ..domain.grid import Grid
from ..domain.entities import Source, Transformer, Pole, Consumer, Line
from ..domain.geometry import Point
from ..infrastructure.id_generator import IdGenerator

@dataclass
class BuildGridFromGeo:
    id_generator: IdGenerator = field(default_factory=IdGenerator)

    def execute(self, seed: int | None = None, tags: Sequence[str] | None = None) -> Grid:
        rng = random.Random(seed if seed is not None else random.random())
        grid = Grid(
            id=self.id_generator.next_id(),
            meta={"seed": seed, "tags": list(tags or [])},
        )

        source = Source(
            id=self.id_generator.next_id(),
            position=Point(0.0, 0.0),
            props={"p_max_kw": 120.0, "voltage_out_kv": 10.0},
        )
        transformer = Transformer(
            id=self.id_generator.next_id(),
            position=Point(0.0, 40.0),
            props={
                "capacity_kva": 400.0,
                "voltage_in_kv": 10.0,
                "voltage_out_kv": 0.4,
                "efficiency": 0.98,
            },
        )
        grid.add_node(source)
        grid.add_node(transformer)

        hv_poles = []
        for i in range(2):
            pole = Pole(
                id=self.id_generator.next_id(),
                position=Point(-20 + i * 20, 80.0),
                props={"capacity_kw": 120.0, "voltage_kv": 10.0, "class": "hv"},
            )
            hv_poles.append(pole)
            grid.add_node(pole)

        lv_poles = []
        for i in range(3):
            pole = Pole(
                id=self.id_generator.next_id(),
                position=Point(-30 + i * 30, 110.0),
                props={"capacity_kw": 80.0, "voltage_kv": 0.4, "class": "lv"},
            )
            lv_poles.append(pole)
            grid.add_node(pole)

        profiles = ["residential", "commercial", "industrial", "nightlife"]
        for idx in range(6):
            pole = lv_poles[idx % len(lv_poles)]
            consumer = Consumer(
                id=self.id_generator.next_id(),
                position=Point(pole.position.x + (idx % 2) * 8 - 4, pole.position.y + 8 + (idx // 2) * 4),
                props={
                    "base_kw": round(0.9 + rng.random() * 2.1, 2),
                    "profile": rng.choice(profiles),
                    "cos_phi": round(0.9 + rng.random() * 0.08, 3),
                    "voltage_kv": 0.4,
                },
            )
            grid.add_node(consumer)

            line = Line(
                id=self.id_generator.next_id(),
                from_id=pole.id,
                to_id=consumer.id,
                props={"length": 12.0 + rng.random() * 6, "capacity_kva": 60.0, "voltage_kv": 0.4},
            )
            grid.add_line(line)

        hv_lines = []
        hv_lines.append(
            Line(
                id=self.id_generator.next_id(),
                from_id=source.id,
                to_id=transformer.id,
                props={"length": 15.0, "capacity_kva": 220.0, "voltage_kv": 10.0, "r_pu": 0.0008, "x_pu": 0.0012},
            )
        )
        for pol in hv_poles:
            line = Line(
                id=self.id_generator.next_id(),
                from_id=transformer.id,
                to_id=pol.id,
                props={"length": 12.0 + rng.random() * 5, "capacity_kva": 180.0, "voltage_kv": 10.0},
            )
            hv_lines.append(line)

        for line in hv_lines:
            grid.add_line(line)

        for pole in lv_poles:
            parent_hv = rng.choice(hv_poles)
            line = Line(
                id=self.id_generator.next_id(),
                from_id=parent_hv.id,
                to_id=pole.id,
                props={"length": 18.0 + rng.random() * 8, "capacity_kva": 120.0, "voltage_kv": 0.4},
            )
            grid.add_line(line)

        return grid
