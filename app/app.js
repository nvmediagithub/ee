const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
const SIZE = 900;

const seedInput = document.getElementById("seed");
const regenerateBtn = document.getElementById("regenerate");
const randomizeBtn = document.getElementById("randomize");

let currentVillage = null;

const backendUrlInput = document.getElementById("backend-url");
const createGridBtn = document.getElementById("create-grid");
const simulateBtn = document.getElementById("simulate-grid");
const faultBtn = document.getElementById("fault-line");
const gridIdEl = document.getElementById("grid-id");
const gridTimeEl = document.getElementById("grid-time");
const gridNodesEl = document.getElementById("grid-nodes");
const gridStatusEl = document.getElementById("grid-status");
const consumerSelect = document.getElementById("consumer-select");
const consumerBaseInput = document.getElementById("consumer-base");
const consumerCosPhiInput = document.getElementById("consumer-cosphi");
const consumerUpdateBtn = document.getElementById("consumer-update");
const lineSelect = document.getElementById("line-select");
const lineStatusSelect = document.getElementById("line-status");
const lineSetBtn = document.getElementById("line-set-status");
const consumerSelect = document.getElementById("consumer-select");
const consumerBaseInput = document.getElementById("consumer-base");
const consumerCosPhiInput = document.getElementById("consumer-cosphi");
const consumerUpdateBtn = document.getElementById("consumer-update");

let overlayGridSnapshot = null;
let currentGridId = null;
let gridWs = null;
let backendBase = normalizeBackendUrl(backendUrlInput?.value ?? "http://localhost:8000");
let consumerNodes = [];
let lineEntries = [];

function calibrateCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = SIZE * ratio;
  canvas.height = SIZE * ratio;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createRng(seed = Date.now()) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildVillage(seed) {
  const rng = createRng(seed);
  const center = {x: SIZE * 0.56, y: SIZE * 0.45};
  const river = createRiver(rng);
  const roads = createRoads(rng, center);
  const houses = createHouses(rng, roads, center);
  const fields = createFields(rng, river);
  const treeClusters = createTreeClusters(rng, river);
  const name = pickName(rng);
  const population = Math.floor(houses.length * (1.6 + rng() * 0.6));

  return {
    seed,
    info: {name, population},
    river,
    roads,
    houses,
    fields,
    treeClusters,
  };
}

function pickName(rng) {
  const names = ["Popytree", "Wrenfield", "Oakhurst", "Elean Isle", "Briarwell"];
  return names[Math.floor(rng() * names.length)];
}

function createRiver(rng) {
  const segments = 7;
  const path = [];
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const wobble = Math.sin(t * Math.PI * 1.3);
    const x = clamp(SIZE * (0.2 + wobble * 0.12 + rng() * 0.4), 20, SIZE - 40);
    const y = SIZE * t;
    path.push({x, y});
  }
  return path;
}

function createRoads(rng, center) {
  const baseAngles = [-0.9, -0.2, 0.4, 1.1];
  const roads = [];
  baseAngles.forEach((angleOffset) => {
    const path = [center];
    let angle = angleOffset + (rng() - 0.5) * 0.3;
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const dist = randomRange(rng, SIZE * 0.16, SIZE * 0.25);
      const prev = path[path.length - 1];
      const next = {
        x: clamp(prev.x + Math.cos(angle) * dist, 30, SIZE - 30),
        y: clamp(prev.y + Math.sin(angle) * dist, 30, SIZE - 40),
      };
      path.push(next);
      angle += (rng() - 0.5) * 0.4;
    }
    roads.push({path, type: "major"});
  });

  for (let i = 0; i < 5; i++) {
    const anchorRoad = roads[Math.floor(rng() * roads.length)];
    const anchorIndex = 1 + Math.floor(rng() * (anchorRoad.path.length - 2));
    const anchorPoint = anchorRoad.path[anchorIndex];
    const path = [anchorPoint];
    let angle = Math.atan2(anchorPoint.y - center.y, anchorPoint.x - center.x) + (rng() - 0.5) * 1.2;
    for (let j = 0; j < 3; j++) {
      const dist = randomRange(rng, SIZE * 0.1, SIZE * 0.18);
      const prev = path[path.length - 1];
      path.push({
        x: clamp(prev.x + Math.cos(angle) * dist, 30, SIZE - 30),
        y: clamp(prev.y + Math.sin(angle) * dist, 30, SIZE - 30),
      });
      angle += (rng() - 0.5) * 0.9;
    }
    roads.push({path, type: "minor"});
  }

  return roads;
}

function createHouses(rng, roads, center) {
  const palette = ["#d79b6f", "#c97f5a", "#b86c4c", "#cfa781"];
  const roof = ["#50332b", "#644237", "#3c2215"];
  const houses = [];
  roads.forEach((road) => {
    const spacing = road.type === "major" ? 40 : 32;
    for (let i = 0; i < road.path.length - 1; i++) {
      const a = road.path[i];
      const b = road.path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.hypot(dx, dy);
      let offset = rng() * spacing;
      while (offset < segLen - 12) {
        const t = offset / segLen;
        const px = a.x + dx * t;
        const py = a.y + dy * t;
        const normal = {x: -dy / segLen, y: dx / segLen};
        const side = rng() < 0.5 ? -1 : 1;
        const shift = 28 + rng() * 30;
        const anchor = {
          x: px + normal.x * shift * side,
          y: py + normal.y * shift * side,
        };
        const dCenter = Math.hypot(anchor.x - center.x, anchor.y - center.y);
        if (dCenter < SIZE * 0.18) {
          offset += spacing + rng() * 15;
          continue;
        }
        const width = 26 + rng() * 12;
        const height = 16 + rng() * 12;
        houses.push({
          x: anchor.x,
          y: anchor.y,
          width,
          height,
          angle: Math.atan2(dy, dx),
          bodyColor: palette[Math.floor(rng() * palette.length)],
          roofColor: roof[Math.floor(rng() * roof.length)],
        });
        offset += spacing + rng() * 15;
      }
    }
  });
  return houses;
}

function createFields(rng, river) {
  const centers = [
    {x: SIZE * 0.18, y: SIZE * 0.25},
    {x: SIZE * 0.15, y: SIZE * 0.65},
    {x: SIZE * 0.75, y: SIZE * 0.22},
    {x: SIZE * 0.82, y: SIZE * 0.58},
  ];
  const fields = centers.map((c) => {
    const radius = SIZE * (0.15 + rng() * 0.12);
    const points = [];
    const count = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const dist = radius * (0.6 + rng() * 0.3);
      points.push({
        x: clamp(c.x + Math.cos(angle) * dist, 20, SIZE - 20),
        y: clamp(c.y + Math.sin(angle) * dist, 20, SIZE - 20),
      });
    }
    return {
      points,
      fill: `rgba(189, 209, 146, ${0.55 + rng() * 0.2})`,
      stroke: "#7c8a4e",
    };
  });
  return fields;
}

function createTreeClusters(rng, river) {
  const clusters = [];
  const anchors = [
    {x: SIZE * (0.12 + rng() * 0.2), y: SIZE * (0.18 + rng() * 0.12)},
    {x: SIZE * (0.22 + rng() * 0.15), y: SIZE * (0.62 + rng() * 0.12)},
    {x: SIZE * (0.7 + rng() * 0.18), y: SIZE * (0.15 + rng() * 0.15)},
  ];
  anchors.forEach((anchor) => {
    const count = 18 + Math.floor(rng() * 24);
    const trees = [];
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = (0.2 + rng() * 0.6) * SIZE * 0.2;
      const radius = rng() * 6 + 6;
      const spread = 0.7 + rng() * 0.5;
      trees.push({
        x: clamp(anchor.x + Math.cos(angle) * dist * spread, 10, SIZE - 10),
        y: clamp(anchor.y + Math.sin(angle) * dist * spread, 10, SIZE - 10),
        radius,
      });
    }
    clusters.push({trees});
  });
  return clusters;
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, "#d6e5b9");
  grad.addColorStop(0.5, "#c7dca1");
  grad.addColorStop(1, "#b1c789");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawFields(fields) {
  fields.forEach((field) => {
    ctx.beginPath();
    field.points.forEach((pt, index) => {
      if (index === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = field.fill;
    ctx.fill();
    ctx.strokeStyle = field.stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
}

function drawRiver(river) {
  const gradient = ctx.createLinearGradient(0, 0, 0, SIZE);
  gradient.addColorStop(0, "#a7d7ff");
  gradient.addColorStop(0.65, "#7ec7f1");
  gradient.addColorStop(1, "#4a92d9");

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 120;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  river.forEach((pt, index) => {
    if (index === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();

  ctx.lineWidth = 20;
  ctx.strokeStyle = "#fdfdfd";
  ctx.beginPath();
  river.forEach((pt, index) => {
    if (index === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.stroke();
}

function drawRoads(roads) {
  roads.forEach((road) => {
    const smoothPath = road.path;
    const baseColor = road.type === "major" ? "#dccfb2" : "#e8dfcf";
    const stripeColor = road.type === "major" ? "#9b8f79" : "#b1a188";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    smoothPath.forEach((pt, index) => {
      if (index === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineWidth = road.type === "major" ? 20 : 10;
    ctx.strokeStyle = baseColor;
    ctx.stroke();

    ctx.lineWidth = road.type === "major" ? 5 : 3;
    ctx.strokeStyle = stripeColor;
    ctx.stroke();
  });
}

function drawBridge() {
  const bridge = {
    x: SIZE * 0.45,
    y: SIZE * 0.48,
    length: SIZE * 0.32,
    width: 12,
  };
  ctx.save();
  ctx.translate(bridge.x, bridge.y);
  ctx.fillStyle = "#c79465";
  ctx.fillRect(-bridge.length / 2, -bridge.width / 2, bridge.length, bridge.width);
  ctx.strokeStyle = "#8a5c34";
  ctx.lineWidth = 2;
  ctx.strokeRect(-bridge.length / 2, -bridge.width / 2, bridge.length, bridge.width);
  for (let i = -bridge.length / 2 + 15; i < bridge.length / 2; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, -bridge.width / 2);
    ctx.lineTo(i, bridge.width / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHouses(houses) {
  houses.forEach((house) => {
    ctx.save();
    ctx.translate(house.x, house.y);
    ctx.rotate(house.angle);
    ctx.fillStyle = house.bodyColor;
    ctx.fillRect(-house.width / 2, -house.height / 2, house.width, house.height);
    ctx.strokeStyle = "#3c2a1d";
    ctx.lineWidth = 1.1;
    ctx.strokeRect(-house.width / 2, -house.height / 2, house.width, house.height);

    ctx.beginPath();
    ctx.moveTo(-house.width / 2, -house.height / 2);
    ctx.lineTo(0, -house.height / 1.5);
    ctx.lineTo(house.width / 2, -house.height / 2);
    ctx.closePath();
    ctx.fillStyle = house.roofColor;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawTrees(clusters) {
  clusters.forEach((cluster) => {
    cluster.trees.forEach((tree) => {
      ctx.beginPath();
      ctx.fillStyle = "#4c6b35";
      ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  });
}

function drawTitle(info) {
  ctx.font = "700 32px 'Playfair Display', serif";
  ctx.fillStyle = "rgba(22, 28, 34, 0.9)";
  ctx.fillText(info.name, 40, 72);
  ctx.font = "12px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(22, 28, 34, 0.6)";
  ctx.fillText(`pop. ${info.population}`, 40, 92);
}

function drawVillage(village) {
  calibrateCanvas();
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawBackground();
  drawFields(village.fields);
  drawRiver(village.river);
  drawRoads(village.roads);
  drawBridge();
  drawHouses(village.houses);
  drawTrees(village.treeClusters);
  drawTitle(village.info);
  drawNetworkOverlay(overlayGridSnapshot);
}

const GRID_BOUNDS = {minX: -60, maxX: 80, minY: -40, maxY: 160};

function mapGridPoint(position) {
  if (!position) {
    return {x: SIZE / 2, y: SIZE / 2};
  }
  const pctX = clamp((position.x - GRID_BOUNDS.minX) / (GRID_BOUNDS.maxX - GRID_BOUNDS.minX), 0, 1);
  const pctY = clamp((position.y - GRID_BOUNDS.minY) / (GRID_BOUNDS.maxY - GRID_BOUNDS.minY), 0, 1);
  return {
    x: pctX * SIZE,
    y: pctY * SIZE,
  };
}

function drawNetworkOverlay(snapshot) {
  if (!snapshot || !snapshot.nodes) {
    return;
  }

  const nodes = snapshot.nodes;
  const lines = snapshot.lines ?? {};

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  Object.values(lines).forEach((line) => {
    const from = nodes[line.from_id];
    const to = nodes[line.to_id];
    if (!from || !to) {
      return;
    }
    const fromPt = mapGridPoint(from.position);
    const toPt = mapGridPoint(to.position);
    ctx.beginPath();
    ctx.setLineDash(line.status === "open" ? [6, 6] : []);
    ctx.lineWidth = line.status === "faulted" ? 4.5 : line.status === "open" ? 3 : 2;
    ctx.strokeStyle =
      line.status === "faulted" ? "#de3d45" : line.status === "open" ? "#f1a53a" : "#2e6a5b";
    ctx.moveTo(fromPt.x, fromPt.y);
    ctx.lineTo(toPt.x, toPt.y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  Object.values(nodes).forEach((node) => {
    const pos = mapGridPoint(node.position);
    const radius = node.kind === "plant" ? 9 : node.kind === "tp" ? 7 : 5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle =
      node.kind === "plant"
        ? "#fff4d9"
        : node.kind === "tp"
        ? "#d9eaf4"
        : node.kind === "house"
        ? "#fde4e8"
        : "#e8f3e5";
    ctx.strokeStyle =
      node.status === "faulted" ? "#de3d45" : node.status === "open" ? "#f1a53a" : "#3a4d3c";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.font = "10px \"Inter\", sans-serif";
    ctx.fillStyle = "#1f3c33";
    const label = node.kind?.substring(0, 1).toUpperCase() ?? "N";
    ctx.fillText(label, pos.x + radius + 2, pos.y + 4);
  });

  ctx.restore();
}

function redrawVillage() {
  if (currentVillage) {
    drawVillage(currentVillage);
  }
}

function handleGridSnapshot(snapshot) {
  overlayGridSnapshot = snapshot;
  currentGridId = snapshot?.id ?? currentGridId;
  populateConsumerList(snapshot);
  populateLineList(snapshot);
  updateGridMetadata(snapshot);
  redrawVillage();
}

function populateConsumerList(snapshot) {
  consumerNodes = [];
  if (!consumerSelect) {
    return;
  }
  const nodes = snapshot?.nodes ?? {};
  consumerSelect.innerHTML = "";
  const entries = Object.values(nodes).filter((node) => node.kind === "house");
  entries.forEach((node) => {
    const option = document.createElement("option");
    option.value = node.id;
    option.textContent = `${node.id.slice(-6)} (${node.props?.profile ?? "house"})`;
    consumerSelect.appendChild(option);
  });
  consumerNodes = entries;
  if (consumerUpdateBtn) {
    consumerUpdateBtn.disabled = entries.length === 0;
  }
  if (entries.length > 0) {
    consumerSelect.value = entries[0].id;
    syncConsumerInputs(entries[0]);
  }
}

function syncConsumerInputs(node) {
  if (!node) {
    return;
  }
  if (consumerBaseInput) {
    consumerBaseInput.value = node.props?.base_kw ?? 1.5;
  }
  if (consumerCosPhiInput) {
    consumerCosPhiInput.value = node.props?.cos_phi ?? 0.95;
  }
}

function populateLineList(snapshot) {
  if (!lineSelect) {
    return;
  }
  const lines = snapshot?.lines ?? {};
  lineSelect.innerHTML = "";
  lineEntries = Object.values(lines);
  lineEntries.forEach((line) => {
    const option = document.createElement("option");
    option.value = line.id;
    option.textContent = `${line.id.slice(-6)} [${line.status}]`;
    lineSelect.appendChild(option);
  });
  if (lineSetBtn) {
    lineSetBtn.disabled = lineEntries.length === 0;
  }
  if (lineEntries.length > 0) {
    lineSelect.value = lineEntries[0].id;
    syncLineSelection();
  }
}

function syncLineSelection() {
  const line = lineEntries.find((entry) => entry.id === lineSelect?.value);
  if (line && lineStatusSelect) {
    lineStatusSelect.value = line.status ?? "online";
  }
}

function updateGridMetadata(snapshot) {
  if (gridIdEl) {
    gridIdEl.textContent = snapshot?.id ?? "—";
  }
  if (gridTimeEl) {
    const time = snapshot?.meta?.sim_time ?? 0;
    gridTimeEl.textContent = time.toFixed(1);
  }
  if (gridNodesEl) {
    gridNodesEl.textContent = snapshot?.nodes ? Object.keys(snapshot.nodes).length : "0";
  }
  if (simulateBtn) {
    simulateBtn.disabled = !snapshot;
  }
  if (faultBtn) {
    faultBtn.disabled = !snapshot;
  }
}

function setGridStatus(text) {
  if (gridStatusEl) {
    gridStatusEl.textContent = text;
  }
}

function disconnectWebsocket() {
  if (gridWs) {
    gridWs.onopen = null;
    gridWs.onmessage = null;
    gridWs.onclose = null;
    gridWs.close();
    gridWs = null;
  }
}

function connectGridWs() {
  if (!currentGridId) {
    return;
  }
  disconnectWebsocket();
  try {
    const base = new URL(backendBase);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${base.host}/v1/power-grid/grids/${currentGridId}/ws`;
    gridWs = new WebSocket(wsUrl);
    gridWs.onopen = () => setGridStatus("WS connected");
    gridWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.id) {
        handleGridSnapshot(data);
        return;
      }
      if (data?.status) {
        setGridStatus(`command ${data.action} ok`);
        return;
      }
      if (data?.error) {
        setGridStatus(`ws error: ${data.error}`);
      }
    };
    gridWs.onclose = () => setGridStatus("WS closed");
  } catch (err) {
    console.warn("ws init failed", err);
    setGridStatus("WS unavailable");
  }
}

function apiUrl(path) {
  try {
    return new URL(path, backendBase).toString();
  } catch {
    return backendBase.replace(/\/$/, "") + path;
  }
}

function normalizeBackendUrl(value) {
  let trimmed = value.trim();
  if (!trimmed) {
    return "http://localhost:8000";
  }
  if (!/^https?:\/\//.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }
  return trimmed.replace(/\/$/, "");
}

async function postJson(path, body) {
  const url = apiUrl(path);
  const init = {
    method: "POST",
    headers: {"Content-Type": "application/json"},
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  return await response.json();
}

async function updateConsumerProps() {
  if (!currentGridId || !consumerSelect) {
    return;
  }
  const nodeId = consumerSelect.value;
  const base = parseFloat(consumerBaseInput?.value ?? "");
  const cosPhi = parseFloat(consumerCosPhiInput?.value ?? "");
  if (!nodeId || Number.isNaN(base) || Number.isNaN(cosPhi)) {
    setGridStatus("invalid consumer values");
    return;
  }
  consumerUpdateBtn.disabled = true;
  setGridStatus("updating props…");
  try {
    const snapshot = await postJson(`/v1/power-grid/grids/${currentGridId}/command`, {
      action: "update_node_props",
      payload: {node_id: nodeId, props: {base_kw: base, cos_phi: cosPhi}},
    });
    handleGridSnapshot(snapshot);
    setGridStatus("props updated");
  } catch (err) {
    console.error(err);
    setGridStatus("update failed");
  } finally {
    consumerUpdateBtn.disabled = false;
  }
}

async function setLineStatusCommand() {
  if (!currentGridId || !lineSelect || !lineStatusSelect) {
    return;
  }
  const lineId = lineSelect.value;
  const status = lineStatusSelect.value;
  if (!lineId || !status) {
    setGridStatus("missing line/status");
    return;
  }
  if (lineSetBtn) {
    lineSetBtn.disabled = true;
  }
  setGridStatus("updating line...");
  try {
    const snapshot = await postJson(`/v1/power-grid/grids/${currentGridId}/command`, {
      action: "set_line_status",
      payload: {line_id: lineId, status},
    });
    handleGridSnapshot(snapshot);
    setGridStatus("line updated");
  } catch (err) {
    console.error(err);
    setGridStatus("line update failed");
  } finally {
    if (lineSetBtn) {
      lineSetBtn.disabled = false;
    }
  }
}

async function createGridFromApi() {
  if (!createGridBtn) {
    return;
  }
  createGridBtn.disabled = true;
  setGridStatus("creating grid…");
  try {
    const seedValue = Number(seedInput.value);
    const payload = Number.isInteger(seedValue) ? {seed: seedValue} : {};
    const snapshot = await postJson("/v1/power-grid/grids", payload);
    handleGridSnapshot(snapshot);
    setGridStatus("grid ready");
    connectGridWs();
  } catch (err) {
    console.error(err);
    setGridStatus("create failed");
  } finally {
    createGridBtn.disabled = false;
  }
}

async function simulateGridTick() {
  if (!currentGridId || !simulateBtn) {
    return;
  }
  simulateBtn.disabled = true;
  setGridStatus("simulating…");
  try {
    const currentTime = overlayGridSnapshot?.meta?.sim_time ?? 0;
    const snapshot = await postJson(`/v1/power-grid/grids/${currentGridId}/simulate`, {
      time: currentTime + 1,
    });
    handleGridSnapshot(snapshot);
    setGridStatus("simulation updated");
  } catch (err) {
    console.error(err);
    setGridStatus("simulate failed");
  } finally {
    simulateBtn.disabled = false;
  }
}

async function triggerFault() {
  if (!currentGridId || !faultBtn) {
    return;
  }
  faultBtn.disabled = true;
  setGridStatus("triggering fault…");
  try {
    const snapshot = await postJson(`/v1/power-grid/grids/${currentGridId}/command`, {
      action: "trigger_fault",
    });
    handleGridSnapshot(snapshot);
    setGridStatus("fault injected");
  } catch (err) {
    console.error(err);
    setGridStatus("fault failed");
  } finally {
    faultBtn.disabled = false;
  }
}

function regenerateVillage(seed) {
  const normalizedSeed = Number.isInteger(seed) ? seed : parseInt(seedInput.value, 10);
  const finalSeed = Number.isNaN(normalizedSeed) ? Date.now() : normalizedSeed;
  seedInput.value = finalSeed;
  currentVillage = buildVillage(finalSeed);
  drawVillage(currentVillage);
}

regenerateBtn.addEventListener("click", () => regenerateVillage(Number(seedInput.value)));
randomizeBtn.addEventListener("click", () => {
  const newSeed = Math.floor(Math.random() * 1_000_000);
  seedInput.value = newSeed;
  regenerateVillage(newSeed);
});

createGridBtn?.addEventListener("click", () => {
  createGridFromApi();
});
simulateBtn?.addEventListener("click", () => {
  simulateGridTick();
});
faultBtn?.addEventListener("click", () => {
  triggerFault();
});
backendUrlInput?.addEventListener("change", () => {
  backendBase = normalizeBackendUrl(backendUrlInput.value);
  disconnectWebsocket();
  setGridStatus("backend updated");
});
consumerSelect?.addEventListener("change", () => {
  const node = consumerNodes.find((n) => n.id === consumerSelect.value);
  if (node) {
    syncConsumerInputs(node);
  }
});
consumerUpdateBtn?.addEventListener("click", () => {
  updateConsumerProps();
});
lineSelect?.addEventListener("change", () => {
  syncLineSelection();
});
lineSetBtn?.addEventListener("click", () => {
  setLineStatusCommand();
});

window.addEventListener("resize", () => {
  if (currentVillage) drawVillage(currentVillage);
});

calibrateCanvas();
regenerateVillage(Number(seedInput.value));
