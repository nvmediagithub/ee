from __future__ import annotations
from dataclasses import asdict
from typing import Optional, Mapping, Any

import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from server.contexts.power_grid.domain.grid import Grid
from server.contexts.power_grid.use_cases.build_grid_from_geo import BuildGridFromGeo
from server.contexts.power_grid.use_cases.simulate_tick import SimulateTick
from server.contexts.power_grid.use_cases.set_line_status import SetLineStatus
from server.contexts.power_grid.use_cases.trigger_fault import TriggerFault
from server.contexts.power_grid.use_cases.clear_faults import ClearFaults
from server.contexts.power_grid.use_cases.add_grid_node import AddGridNode
from server.contexts.power_grid.use_cases.add_grid_line import AddGridLine
from server.contexts.power_grid.use_cases.update_node_props import UpdateNodeProps
from server.contexts.power_grid.infrastructure.grid_repository import InMemoryGridRepository
from server.contexts.power_grid.use_cases.set_node_position import SetNodePosition

app = FastAPI(title="Power Grid Twin")
app.mount("/app", StaticFiles(directory="app"), name="frontend")

builder = BuildGridFromGeo()
simulator = SimulateTick()
set_status = SetLineStatus()
trigger_fault = TriggerFault()
clear_faults = ClearFaults()
add_grid_node = AddGridNode()
add_grid_line = AddGridLine()
set_node_position = SetNodePosition()
update_props = UpdateNodeProps()
grid_repo = InMemoryGridRepository()


class GridCreateRequest(BaseModel):
    seed: Optional[int] = None
    tags: Optional[list[str]] = None


class SimulateRequest(BaseModel):
    time: float


class CommandRequest(BaseModel):
    action: str
    payload: Mapping[str, Any] = Field(default_factory=dict)


def grid_snapshot(grid: Grid) -> dict[str, Any]:
    return {
        "id": grid.id,
        "meta": grid.meta,
        "nodes": {nid: asdict(node) for nid, node in grid.nodes.items()},
        "lines": {lid: asdict(line) for lid, line in grid.lines.items()},
    }


def get_grid(grid_id: str) -> Grid:
    grid = grid_repo.get(grid_id)
    if grid is None:
        raise HTTPException(status_code=404, detail="Grid not found")
    return grid


@app.post("/v1/power-grid/grids")
def create_grid(req: GridCreateRequest):
    grid = builder.execute(seed=req.seed, tags=req.tags)
    grid_repo.save(grid)
    return grid_snapshot(grid)


@app.get("/v1/power-grid/grids/{grid_id}")
def get_grid_snapshot(grid_id: str):
    grid = get_grid(grid_id)
    return grid_snapshot(grid)


@app.post("/v1/power-grid/grids/{grid_id}/simulate")
def simulate_grid(grid_id: str, req: SimulateRequest):
    grid = get_grid(grid_id)
    simulator.execute(grid, req.time)
    grid_repo.save(grid)
    return grid_snapshot(grid)


def run_command(grid: Grid, action: str, payload: Mapping[str, Any]) -> None:
    if action == "set_line_status":
        line_id = payload.get("line_id")
        status = payload.get("status")
        if not line_id or not status:
            raise ValueError("line_id and status are required for set_line_status")
        set_status.execute(grid, line_id, status)
        return

    if action == "trigger_fault":
        trigger_fault.execute(grid, payload.get("line_id"))
        return

    if action == "clear_faults":
        clear_faults.execute(grid)
        return

    if action == "add_node":
        node_type = payload.get("type")
        position = payload.get("position")
        props = payload.get("props", {})
        if not node_type:
            raise ValueError("type is required for add_node")
        if not position or "x" not in position or "y" not in position:
            raise ValueError("position.x and position.y are required for add_node")
        add_grid_node.execute(grid, node_type, position, props)
        return

    if action == "add_line":
        from_id = payload.get("from_id")
        to_id = payload.get("to_id")
        line_props = payload.get("props", {})
        if not from_id or not to_id:
            raise ValueError("from_id and to_id are required for add_line")
        add_grid_line.execute(grid, from_id, to_id, line_props)
        return

    if action == "set_node_position":
        node_id = payload.get("node_id")
        position = payload.get("position")
        if not node_id or not isinstance(position, dict):
            raise ValueError("node_id and position dict required")
        x = position.get("x")
        y = position.get("y")
        if x is None or y is None:
            raise ValueError("position requires x and y")
        set_node_position.execute(grid, node_id, x, y)
        return

    if action == "update_node_props":
        node_id = payload.get("node_id")
        props = payload.get("props")
        if not node_id or not isinstance(props, dict):
            raise ValueError("node_id and props dict required")
        update_props.execute(grid, node_id, props)
        return

    raise ValueError(f"Unknown action: {action}")


@app.post("/v1/power-grid/grids/{grid_id}/command")
def command_grid(grid_id: str, req: CommandRequest):
    grid = get_grid(grid_id)
    payload = dict(req.payload or {})
    try:
        run_command(grid, req.action, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    grid_repo.save(grid)
    return grid_snapshot(grid)


@app.websocket("/v1/power-grid/grids/{grid_id}/ws")
async def grid_stream(grid_id: str, websocket: WebSocket):
    grid = get_grid(grid_id)
    await websocket.accept()

    async def publisher():
        while True:
            sim_time = grid.meta.get("sim_time", 0.0) + simulator.params.dt
            simulator.execute(grid, sim_time)
            grid_repo.save(grid)
            await websocket.send_json(grid_snapshot(grid))
            await asyncio.sleep(simulator.params.dt)

    async def listener():
        while True:
            msg = await websocket.receive_json()
            action = msg.get("action")
            payload = dict(msg.get("payload") or {})
            try:
                run_command(grid, action, payload)
                grid_repo.save(grid)
                await websocket.send_json({"status": "ok", "action": action})
            except ValueError as exc:
                await websocket.send_json({"error": str(exc)})

    send_task = asyncio.create_task(publisher())
    recv_task = asyncio.create_task(listener())
    pending_tasks = set()

    try:
        done, pending_tasks = await asyncio.wait(
            {send_task, recv_task}, return_when=asyncio.FIRST_EXCEPTION
        )
        for task in pending_tasks:
            task.cancel()
        for task in done:
            if task.exception():
                raise task.exception()
    except WebSocketDisconnect:
        pass
    finally:
        send_task.cancel()
        recv_task.cancel()
