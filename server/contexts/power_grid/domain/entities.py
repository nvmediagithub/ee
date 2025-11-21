from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any

from .geometry import Point

@dataclass
class BaseNode:
    id: str
    position: Point
    props: Dict[str, Any] = field(default_factory=dict)
    state: Dict[str, Any] = field(default_factory=dict)
    status: str = "online"

@dataclass
class Source(BaseNode):
    kind: str = "plant"

@dataclass
class Transformer(BaseNode):
    kind: str = "tp"

@dataclass
class Pole(BaseNode):
    kind: str = "pole"

@dataclass
class Consumer(BaseNode):
    kind: str = "house"

@dataclass
class Line:
    id: str
    from_id: str
    to_id: str
    props: Dict[str, Any] = field(default_factory=dict)
    state: Dict[str, Any] = field(default_factory=dict)
    status: str = "online"
