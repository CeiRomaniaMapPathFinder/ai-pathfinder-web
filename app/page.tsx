'use client'
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TbCircleNumber1Filled, TbPlayerPlayFilled } from "react-icons/tb";
import { VscLocation } from "react-icons/vsc";
import { buildDeviceIcon, pixelFont } from '../lib/pixelNetworkTheme';
import { cityPositions } from '../lib/cityPositions';

// Hand-plotted positions as a percentage of the viewport (matching the map
// photo, which is `fill` + `object-fit: cover` across the full 100vw x 100vh
// main — so x% of window.innerWidth / y% of window.innerHeight lands exactly
// on that spot in the photo). This list is specific to THIS page — see the
// comment in lib/cityPositions.ts for why it's no longer shared with
// RomaniaMap.tsx (components/RomaniaMap.tsx has its own list in
// lib/romaniaMapCityPositions.ts instead); see computeNodePixelPositions()
// below for how percent turns into the exact pixel position each render.
const initialNodes = cityPositions;

const cityNames = initialNodes.map((node) => node.id);

// The photo fills the whole viewport, but each visible network container
// only covers part of it (e.g. the graph column, not the sidebar) — so a
// node's local pixel position is its viewport pixel position minus that
// container's own offset from the viewport origin.
function computeNodePixelPositions(containerRect: { left: number; top: number }) {
  return initialNodes.map((n) => ({
    id: n.id,
    x: (n.xPct / 100) * window.innerWidth - containerRect.left,
    y: (n.yPct / 100) * window.innerHeight - containerRect.top,
  }));
}

const initialEdges = [
  { from: 'Arad', to: 'Zerind', label: '75' },
  { from: 'Zerind', to: 'Oradea', label: '71' },
  { from: 'Oradea', to: 'Sibiu', label: '151' },
  { from: 'Arad', to: 'Sibiu', label: '140' },
  { from: 'Arad', to: 'Timisoara', label: '118' },
  { from: 'Timisoara', to: 'Lugoj', label: '111' },
  { from: 'Lugoj', to: 'Mehadia', label: '70' },
  { from: 'Mehadia', to: 'Drobeta', label: '75' },
  { from: 'Drobeta', to: 'Craiova', label: '120' },
  { from: 'Craiova', to: 'Rimnicu Vilcea', label: '146' },
  { from: 'Craiova', to: 'Pitesti', label: '138' },
  { from: 'Rimnicu Vilcea', to: 'Sibiu', label: '80' },
  { from: 'Rimnicu Vilcea', to: 'Pitesti', label: '97' },
  { from: 'Sibiu', to: 'Fagaras', label: '99' },
  { from: 'Fagaras', to: 'Bucharest', label: '211' },
  { from: 'Pitesti', to: 'Bucharest', label: '101' },
  { from: 'Bucharest', to: 'Giurgiu', label: '90' },
  { from: 'Bucharest', to: 'Urziceni', label: '85' },
  { from: 'Urziceni', to: 'Hirsova', label: '98' },
  { from: 'Hirsova', to: 'Eforie', label: '86' },
  { from: 'Urziceni', to: 'Vaslui', label: '142' },
  { from: 'Vaslui', to: 'Iasi', label: '92' },
  { from: 'Iasi', to: 'Neamt', label: '87' }
];

const activePathColor = '#22d3ee';
const idleEdgeColor = '#a5f3fc';
const hoverEdgeColor = '#67e8f9';
// Edges get a dark drop-shadow (below) so a bright cyan line reads clearly
// whether it crosses a light cloud or a dark mountain patch in the photo.
const edgeShadow = { enabled: true, color: 'rgba(0,0,0,0.65)', size: 6, x: 0, y: 0 };
const lockedInteraction = { hover: true, dragView: false, zoomView: false, dragNodes: false, selectable: true } as const;
// The view is pinned 1:1 to real screen pixels (see alignPreviewNetwork
// below) rather than vis-network's auto-fit zoom, so these are plain pixel
// sizes now — no zoom multiplier to compensate for.
const ROUTER_ICON_SIZE = 23;
const DEVICE_ICON_SIZE = 26;
const EDGE_FONT_SIZE = 11; // path-cost numbers only — city names are custom-drawn below

// City names are drawn by hand on an `afterDrawing` canvas hook (see
// drawCityLabels) instead of vis-network's built-in label renderer, because
// that renderer only supports one flat text-stroke — it can't layer a solid
// outline under a separate soft shadow, or add a rounded backing chip.
const CITY_LABEL_FONT_SIZE = 12;
const CITY_LABEL_COLOR = '#eafbff'; // light cyan-white, picks up a touch of the UI's glow
// Once both start and goal are picked, every other city name drops to this
// muted tone instead — makes the PC/server labels the only bright text left.
const CITY_LABEL_IDLE_DIM_COLOR = '#64748b';
const CITY_LABEL_OFFSET_Y = 24; // gap below the icon center where the label sits
// 1) A real solid stroke (opaque dark navy, not a translucent blur) — holds
//    up on mid-tone terrain (green patches near Fagaras/Timisoara) where a
//    shadow alone gets lost.
const CITY_LABEL_STROKE_WIDTH = 3;
const CITY_LABEL_STROKE_COLOR = '#0a1628';
// A soft shadow rendered in the same pass as the stroke (canvas shadows
// composite behind their source), so the outline gets a soft halo under it
// rather than replacing the shadow with a hard edge.
const CITY_LABEL_SHADOW_COLOR = 'rgba(0,0,0,0.6)';
const CITY_LABEL_SHADOW_BLUR = 6;
const CITY_LABEL_SHADOW_OFFSET_Y = 2;
// 4) Small dark backing chip — subtle, but guarantees contrast regardless of
// what's directly behind a given label.
const CITY_LABEL_PILL_COLOR = 'rgba(8,16,28,0.55)';
const CITY_LABEL_PILL_PAD_X = 5;
const CITY_LABEL_PILL_PAD_Y = 4;
const CITY_LABEL_PILL_RADIUS = 6;

const idleRouterIcon = buildDeviceIcon('router', 'idle');
const pcIcon = buildDeviceIcon('pc', 'start');
const serverIcon = buildDeviceIcon('server', 'goal');

// Single source of truth for "what icon/size should this node have given the
// current selection" — used both for the very first paint (see the prefill
// effect below, which can set selectionRef before the network exists) and
// for the per-selection-change update effect, so the two can't drift apart.
function nodeVisualForSelection(nodeId: string, selection: { start: string; goal: string }) {
  if (nodeId === selection.start) return { image: pcIcon, size: DEVICE_ICON_SIZE };
  if (nodeId === selection.goal) return { image: serverIcon, size: DEVICE_ICON_SIZE };
  return { image: idleRouterIcon, size: ROUTER_ICON_SIZE };
}

// Draws every city name for one network instance: dark solid outline (with a
// soft shadow baked into the same stroke pass) topped with a crisp light
// cyan-white fill, over a small rounded dark chip for guaranteed contrast.
// Once both start and goal are chosen, every other city dims so the PC/server
// labels are the only bright text left on the map.
function drawCityLabels(
  ctx: CanvasRenderingContext2D,
  positions: Map<string, { x: number; y: number }>,
  selection: { start: string; goal: string },
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${CITY_LABEL_FONT_SIZE}px ${pixelFont.style.fontFamily}`;

  const bothPicked = Boolean(selection.start && selection.goal);

  for (const node of initialNodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const isEndpoint = node.id === selection.start || node.id === selection.goal;
    const fillColor = bothPicked && !isEndpoint ? CITY_LABEL_IDLE_DIM_COLOR : CITY_LABEL_COLOR;

    const labelY = pos.y + CITY_LABEL_OFFSET_Y;
    const textWidth = ctx.measureText(node.label).width;
    const pillW = textWidth + CITY_LABEL_PILL_PAD_X * 2;
    const pillH = CITY_LABEL_FONT_SIZE + CITY_LABEL_PILL_PAD_Y * 2;
    const pillX = pos.x - pillW / 2;
    const pillY = labelY - CITY_LABEL_PILL_PAD_Y;

    const roundRect = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
    ctx.beginPath();
    if (typeof roundRect === 'function') {
      roundRect.call(ctx, pillX, pillY, pillW, pillH, CITY_LABEL_PILL_RADIUS);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = CITY_LABEL_PILL_COLOR;
    ctx.fill();

    ctx.shadowColor = CITY_LABEL_SHADOW_COLOR;
    ctx.shadowBlur = CITY_LABEL_SHADOW_BLUR;
    ctx.shadowOffsetY = CITY_LABEL_SHADOW_OFFSET_Y;
    ctx.lineWidth = CITY_LABEL_STROKE_WIDTH;
    ctx.strokeStyle = CITY_LABEL_STROKE_COLOR;
    ctx.strokeText(node.label, pos.x, labelY);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = fillColor;
    ctx.fillText(node.label, pos.x, labelY);
  }

  ctx.restore();
}

function findPathEdgeIds(start: string, goal: string) {
  const adjacency = new Map<string, string[]>();
  const edgeIdByKey = new Map<string, number>();

  initialEdges.forEach((edge, index) => {
    const forwardKey = `${edge.from}|${edge.to}`;
    const reverseKey = `${edge.to}|${edge.from}`;

    edgeIdByKey.set(forwardKey, index);
    edgeIdByKey.set(reverseKey, index);

    const forwardNeighbors = adjacency.get(edge.from) ?? [];
    forwardNeighbors.push(edge.to);
    adjacency.set(edge.from, forwardNeighbors);

    const reverseNeighbors = adjacency.get(edge.to) ?? [];
    reverseNeighbors.push(edge.from);
    adjacency.set(edge.to, reverseNeighbors);
  });

  const queue = [start];
  const visited = new Set([start]);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const currentNode = queue.shift();

    if (currentNode === goal) {
      break;
    }

    const neighbors = adjacency.get(currentNode ?? '') ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;

      visited.add(neighbor);
      previous.set(neighbor, currentNode ?? '');
      queue.push(neighbor);
    }
  }

  if (!visited.has(goal)) {
    return [];
  }

  const pathNodes = [goal];
  let currentNode = goal;

  while (currentNode !== start) {
    const parent = previous.get(currentNode);

    if (!parent) {
      return [];
    }

    pathNodes.unshift(parent);
    currentNode = parent;
  }

  const pathEdgeIds: number[] = [];

  for (let index = 0; index < pathNodes.length - 1; index += 1) {
    const edgeId = edgeIdByKey.get(`${pathNodes[index]}|${pathNodes[index + 1]}`);

    if (edgeId !== undefined) {
      pathEdgeIds.push(edgeId);
    }
  }

  return pathEdgeIds;
}

export default function VisMap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);
  const networkRef = useRef<any>(null);
  const previewNetworksRef = useRef<any[]>([]);
  const nodesDataSetRef = useRef<any>(null);
  const edgesDataSetRef = useRef<any>(null);
  const selectionRef = useRef({ start: '', goal: '' });
  // Latest on-screen pixel position per city, kept in sync by
  // alignPreviewNetwork() and read every frame by drawCityLabels().
  const nodePixelPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [selection, setSelection] = useState({ start: '', goal: '' });

  // Prefill Start/Goal from the URL (?start=..&goal=..) — used when arriving
  // back from the results page via "Back to Map", so the user can tweak one
  // city and re-run instead of starting from scratch. Declared before the
  // network-setup effect below so selectionRef is already correct by the
  // time that effect's dynamic import resolves and builds the initial node
  // DataSet (see nodeVisualForSelection above).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const asValidCity = (id: string | null) => (id && cityNames.includes(id) ? id : '');
    const nextStart = asValidCity(params.get('start'));
    const nextGoal = asValidCity(params.get('goal'));
    if (!nextStart && !nextGoal) return;

    const next = { start: nextStart, goal: nextGoal === nextStart ? '' : nextGoal };
    selectionRef.current = next;
    setSelection(next);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let resizeHandler: (() => void) | null = null;

    import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (!nodesDataSetRef.current) {
        nodesDataSetRef.current = new DataSet(
          // x/y are placeholders — alignPreviewNetwork() overwrites them with
          // real pixel positions (derived from xPct/yPct) right after the
          // network mounts, once the container's actual size is known. No
          // `label` here on purpose — city names are hand-drawn by
          // drawCityLabels() instead of vis-network's built-in label text.
          // Icon/size read from selectionRef.current (not hardcoded idle) so
          // cities prefilled from the URL already show as PC/server on the
          // very first paint, instead of flashing idle-router first.
          initialNodes.map(({ id }) => ({
            id,
            x: 0,
            y: 0,
            shape: 'image',
            ...nodeVisualForSelection(id, selectionRef.current),
            shapeProperties: { interpolation: false },
          }))
        );
      }

      if (!edgesDataSetRef.current) {
        edgesDataSetRef.current = new DataSet(
          initialEdges.map((edge, index) => ({
            ...edge,
            id: index,
            color: { color: idleEdgeColor, highlight: idleEdgeColor, hover: idleEdgeColor }
          }))
        );
      }

      const data = {
        nodes: nodesDataSetRef.current,
        edges: edgesDataSetRef.current
      };

      const resetEdgeColors = () => {
        const allEdges = edgesDataSetRef.current.get();
        edgesDataSetRef.current.update(
          allEdges.map((edge: any) => ({
            id: edge.id,
            color: { color: idleEdgeColor, highlight: idleEdgeColor, hover: idleEdgeColor }
          }))
        );
      };

      const colorConnectedEdges = (nodeId: string) => {
        const connectedEdgeIds = networkRef.current.getConnectedEdges(nodeId);

        edgesDataSetRef.current.update(
          connectedEdgeIds.map((edgeId: string) => ({
            id: edgeId,
            color: { color: hoverEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor }
          }))
        );
      };

      const options = {
        physics: false,
        edges: {
          // No label background pill — a dark text outline instead, so there's
          // no rectangle anywhere, just glowing lines and outlined text sitting
          // directly on the map.
          font: {
            align: 'top',
            size: EDGE_FONT_SIZE,
            color: '#a5f3fc',
            face: pixelFont.style.fontFamily,
            strokeWidth: 2,
            strokeColor: '#020617',
          },
          color: { color: idleEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor },
          width: 2,
          shadow: edgeShadow,
        },
        nodes: {
          shape: 'image',
          shapeProperties: { interpolation: false },
          // No node font here — city names are hand-drawn (see drawCityLabels).
        },
        // Locked down: this is a fixed reference map, not a freeform canvas —
        // clicking still selects start/goal, but nothing can be dragged or
        // panned out of view.
        interaction: lockedInteraction,
      };

      // Pin the view 1:1 to real screen pixels instead of vis-network's
      // auto-fit zoom: read the container's current on-screen rect, convert
      // every node's xPct/yPct into a pixel position local to that
      // container, push those into the (shared) node DataSet, then center
      // the view at scale 1 so network-unit == on-screen pixel exactly.
      const alignPreviewNetwork = (network: any, container: HTMLDivElement) => {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const positions = computeNodePixelPositions(rect);
        nodesDataSetRef.current.update(positions);
        nodePixelPositionsRef.current = new Map(positions.map((p) => [p.id, { x: p.x, y: p.y }]));
        network.moveTo({ position: { x: rect.width / 2, y: rect.height / 2 }, scale: 1 });
        network.redraw();
      };

      networkRef.current = new Network(containerRef.current!, data, options);

      const previewContainers = previewRefs.current.filter(
        (container): container is HTMLDivElement => container !== null,
      );
      previewNetworksRef.current = previewContainers.map((container) => new Network(container, data, options));
      previewNetworksRef.current.forEach((network) => {
        network.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
          drawCityLabels(ctx, nodePixelPositionsRef.current, selectionRef.current);
        });
      });
      previewNetworksRef.current.forEach((network, i) => alignPreviewNetwork(network, previewContainers[i]));

      const handleNodeClick = (params: any) => {
        if (params.nodes.length === 0) return;

        const nodeId = String(params.nodes[0]);
        const current = selectionRef.current;
        const nextSelection = current.start && current.goal
          ? { start: nodeId, goal: '' }
          : !current.start
            ? { start: nodeId, goal: current.goal }
            : nodeId === current.start
              ? current
              : { start: current.start, goal: nodeId };

        selectionRef.current = nextSelection;
        setSelection(nextSelection);
      };

      networkRef.current.on('hoverNode', (params: any) => {
        if (selectionRef.current.start && selectionRef.current.goal) return;
        resetEdgeColors();
        colorConnectedEdges(params.node);
      });

      networkRef.current.on('blurNode', () => {
        if (selectionRef.current.start && selectionRef.current.goal) {
          const selectedPathEdges = findPathEdgeIds(selectionRef.current.start, selectionRef.current.goal);

          if (selectedPathEdges.length > 0) {
            edgesDataSetRef.current.update(
              selectedPathEdges.map((edgeId: number) => ({
                id: edgeId,
                color: { color: activePathColor, highlight: activePathColor, hover: activePathColor }
              }))
            );
          }

          return;
        }

        resetEdgeColors();
      });

      networkRef.current.on('click', handleNodeClick);
      previewNetworksRef.current.forEach((network) => network.on('click', handleNodeClick));

      // Re-align on resize — the container's pixel rect (and the photo's own
      // pixel mapping, since it's window-sized) both change with the window.
      resizeHandler = () => {
        previewNetworksRef.current.forEach((network, i) => alignPreviewNetwork(network, previewContainers[i]));
      };
      window.addEventListener('resize', resizeHandler);
    });

    return () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);

      if (networkRef.current) {
        networkRef.current.destroy();
      }

      previewNetworksRef.current.forEach((network) => network.destroy());
      previewNetworksRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!nodesDataSetRef.current) return;

    const updatedNodes = initialNodes.map((node) => ({
      id: node.id,
      ...nodeVisualForSelection(node.id, selection),
    }));

    nodesDataSetRef.current.update(updatedNodes);

    if (!edgesDataSetRef.current) return;

    const resetEdgeColors = () => {
      const allEdges = edgesDataSetRef.current.get();
      edgesDataSetRef.current.update(
        allEdges.map((edge: any) => ({
          id: edge.id,
          color: { color: idleEdgeColor, highlight: idleEdgeColor, hover: idleEdgeColor }
        }))
      );
    };

    if (!selection.start || !selection.goal) {
      resetEdgeColors();
      return;
    }

    const selectedPathEdges = findPathEdgeIds(selection.start, selection.goal);

    resetEdgeColors();

    if (selectedPathEdges.length > 0) {
      edgesDataSetRef.current.update(
        selectedPathEdges.map((edgeId: number) => ({
          id: edgeId,
          color: { color: activePathColor, highlight: activePathColor, hover: activePathColor }
        }))
      );
    }
  }, [selection]);

  return (
    <main
      className={pixelFont.className}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        width: '100vw',
        height: '100vh',
        padding: '10px',
        overflow: 'hidden',
        background: '#060a13',
        color: '#e2f8ff',
      }}
    >
      {/* The photo itself is the background now — no dark scrim over it.
          Legibility comes from the icon glow/outline + text-stroke treatment
          instead of dimming the map. */}
      <Image
        src="/images/romania-fantasy-map.png"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', zIndex: 0 }}
      />

      {/* No box here either — just a standout glowing title sitting on the map. */}
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          fontSize: '30px',
          fontWeight: 700,
          letterSpacing: '2px',
          color: '#a5f3fc',
          textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 26px rgba(34,211,238,0.55)',
        }}
      >
        ROMANIA MAP
      </header>

      <section style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', height: 'calc(100% - 50px)', gap: '12px', marginTop: '10px', alignItems: 'stretch' }}>
        {['Blind search'].map((title, index) => (
          // No card here on purpose — the graph sits directly on the map
          // background with no panel, border, or fill behind it.
          <article
            key={title}
            style={{
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              ref={(element) => { previewRefs.current[index] = element; }}
              style={{ position: 'relative', width: '100%', height: '100%' }}
            />
          </article>
        ))}

        {/* alignSelf: 'start' so this box hugs its own content (ending right
            after the Start Search button) instead of stretching to match the
            graph column's full height. */}
        <aside
          style={{
            position: 'relative',
            alignSelf: 'start',
            marginRight: '16px',
            padding: '24px 18px',
            background: 'rgba(10,18,32,0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: '9px',
            boxShadow: '0 0 25px rgba(34,211,238,0.1)',
          }}
        >
          <div className='flex flex-row items-center'>
            <TbCircleNumber1Filled size={22} color="#67e8f9" />
            <p style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.5, color: '#e2f8ff' }} className='ml-2'>
              Select Cities
            </p>
          </div>
          <label style={{ display: 'block', fontSize: '10px', color: '#7dd3fc' }} className='mt-4 ml-1'>
            Start City
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <VscLocation
                size={19}
                color="#4ade80"
                aria-hidden="true"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              />
              <select
                value={selection.start}
                onChange={(event) => {
                  const start = event.target.value;
                  const nextSelection = { start, goal: start === selection.goal ? '' : selection.goal };
                  selectionRef.current = nextSelection;
                  setSelection(nextSelection);
                }}
                style={{
                  display: 'block', width: '100%', padding: '10px 10px 10px 36px',
                  border: '1px solid rgba(34,211,238,0.3)', borderRadius: '10px',
                  background: '#0b1220', color: '#e2f8ff', fontSize: '11px',
                }}
              >
                <option value="">Select city</option>
                {cityNames.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </label>
          <button
            type="button"
            aria-label="Swap start and goal cities"
            onClick={() => {
              const nextSelection = { start: selection.goal, goal: selection.start };
              selectionRef.current = nextSelection;
              setSelection(nextSelection);
            }}
            style={{
              display: 'block', margin: '14px auto', width: '34px', height: '34px', border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: '50%', background: '#0b1220', color: '#67e8f9', fontSize: '16px', cursor: 'pointer',
            }}
          >
            ⇅
          </button>
          <label style={{ display: 'block', fontSize: '10px', color: '#7dd3fc' }} className='ml-1'>
            Goal City
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <VscLocation
                size={19}
                color="#f87171"
                aria-hidden="true"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              />
              <select
                value={selection.goal}
                onChange={(event) => {
                  const goal = event.target.value;
                  if (goal === selection.start) return;
                  const nextSelection = { ...selection, goal };
                  selectionRef.current = nextSelection;
                  setSelection(nextSelection);
                }}
                style={{
                  display: 'block', width: '100%', padding: '10px 10px 10px 36px',
                  border: '1px solid rgba(34,211,238,0.3)', borderRadius: '10px',
                  background: '#0b1220', color: '#e2f8ff', fontSize: '11px',
                }}
              >
                <option value="">Select city</option>
                {cityNames.filter((city) => city !== selection.start).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </label>
          <button
            onClick={() => {
              selectionRef.current = { start: '', goal: '' };
              setSelection({ start: '', goal: '' });
            }}
            style={{
              width: '100%', marginTop: '16px', padding: '12px', border: 'none',
              borderRadius: '10px', backgroundColor: '#dc2626', color: '#fff0f0', fontWeight: 700,
              fontSize: '10px', cursor: 'pointer', boxShadow: '0 0 14px rgba(239,68,68,0.4)',
            }}
          >
            Reset Selection
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selection.start || !selection.goal) {
                window.alert('Please select both Start City and Goal City before starting search.');
                return;
              }

              const query = new URLSearchParams({
                start: selection.start,
                goal: selection.goal
              });

              router.push(`/page2?${query.toString()}`);
            }}
            style={{
              width: '100%', marginTop: '10px', padding: '12px', border: 'none', borderRadius: '10px',
              backgroundColor: '#0891b2', color: '#f0fdff', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 0 18px rgba(34,211,238,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <TbPlayerPlayFilled size={11} />
            Start Search
          </button>
          <div ref={containerRef} style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }} />
        </aside>
      </section>
    </main>
  );
}
