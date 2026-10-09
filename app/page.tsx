'use client'
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TbBrandGithub, TbChevronDown, TbCircleNumber1Filled, TbPlayerPlayFilled } from "react-icons/tb";
import { VscLocation } from "react-icons/vsc";
import { buildDeviceIcon, pixelFont } from '../lib/pixelNetworkTheme';
import { cityPositions } from '../lib/cityPositions';
import { computeMapBox, mapEdgeFadeStyle, projectCity, sameMapBox, type MapBox } from '../lib/mapProjection';
import type {
  DataSet,
  Edge as VisEdge,
  IdType,
  Network,
  Node as VisNode,
} from 'vis-network/standalone';

const initialNodes = cityPositions;

const cityNames = initialNodes.map((node) => node.id);

const MAP_PAD = { left: 60, right: 60, top: 16, bottom: 48 };

const FULL_SIZE_GRAPH_WIDTH = 900;
const MIN_SIZE_SCALE = 0.6;

function sizeScaleFor(graphWidth: number) {
  return Math.min(1, Math.max(MIN_SIZE_SCALE, graphWidth / FULL_SIZE_GRAPH_WIDTH));
}

function scaledMapPad(scale: number) {
  return {
    left: MAP_PAD.left * scale,
    right: MAP_PAD.right * scale,
    top: MAP_PAD.top * scale,
    bottom: MAP_PAD.bottom * scale,
  };
}

const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

function computePageMapPlacement(pageRect: DOMRect, graphRect: DOMRect, pad: typeof MAP_PAD) {
  const graph = {
    left: graphRect.left - pageRect.left,
    top: graphRect.top - pageRect.top,
    right: graphRect.right - pageRect.left,
    bottom: graphRect.bottom - pageRect.top,
  };

  if (window.matchMedia(SIDE_BY_SIDE_QUERY).matches) {
    const box = computeMapBox(pageRect.width, pageRect.height, initialNodes, graph, pad);
    return { box, fade: mapEdgeFadeStyle(box, pageRect) };
  }

  const local = computeMapBox(
    graphRect.width,
    graphRect.height,
    initialNodes,
    { left: 0, top: 0, right: graphRect.width, bottom: graphRect.height },
    pad,
    { fit: 'contain' },
  );
  const box = { ...local, left: local.left + graph.left, top: local.top + graph.top };
  return { box, fade: mapEdgeFadeStyle(local, graphRect) };
}

function computeNodePixelPositions(mapBox: MapBox, containerOffset: { left: number; top: number }) {
  return initialNodes.map((n) => {
    const { x, y } = projectCity(n, mapBox);
    return { id: n.id, x: x - containerOffset.left, y: y - containerOffset.top };
  });
}

type MapPlacement = ReturnType<typeof computePageMapPlacement>;

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
const edgeShadow = { enabled: true, color: 'rgba(0,0,0,0.65)', size: 6, x: 0, y: 0 };
const lockedInteraction = { hover: true, dragView: false, zoomView: false, dragNodes: false, selectable: true } as const;
const ROUTER_ICON_SIZE = 23;
const DEVICE_ICON_SIZE = 26;
const EDGE_FONT_SIZE = 11;

const CITY_LABEL_FONT_SIZE = 12;
const CITY_LABEL_COLOR = '#eafbff';
const CITY_LABEL_IDLE_DIM_COLOR = '#64748b';
const CITY_LABEL_OFFSET_Y = 24;
const CITY_LABEL_STROKE_WIDTH = 3;
const CITY_LABEL_STROKE_COLOR = '#0a1628';
const CITY_LABEL_SHADOW_COLOR = 'rgba(0,0,0,0.6)';
const CITY_LABEL_SHADOW_BLUR = 6;
const CITY_LABEL_SHADOW_OFFSET_Y = 2;
const CITY_LABEL_PILL_COLOR = 'rgba(8,16,28,0.55)';
const CITY_LABEL_PILL_PAD_X = 5;
const CITY_LABEL_PILL_PAD_Y = 4;
const CITY_LABEL_PILL_RADIUS = 6;

const idleRouterIcon = buildDeviceIcon('router', 'idle');
const pcIcon = buildDeviceIcon('pc', 'start');
const serverIcon = buildDeviceIcon('server', 'goal');

function nodeVisualForSelection(nodeId: string, selection: { start: string; goal: string }, scale = 1) {
  if (nodeId === selection.start) return { image: pcIcon, size: DEVICE_ICON_SIZE * scale };
  if (nodeId === selection.goal) return { image: serverIcon, size: DEVICE_ICON_SIZE * scale };
  return { image: idleRouterIcon, size: ROUTER_ICON_SIZE * scale };
}

function drawCityLabels(
  ctx: CanvasRenderingContext2D,
  positions: Map<string, { x: number; y: number }>,
  selection: { start: string; goal: string },
  scale: number,
) {
  const fontSize = CITY_LABEL_FONT_SIZE * scale;
  const padX = CITY_LABEL_PILL_PAD_X * scale;
  const padY = CITY_LABEL_PILL_PAD_Y * scale;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${fontSize}px ${pixelFont.style.fontFamily}`;

  const bothPicked = Boolean(selection.start && selection.goal);

  for (const node of initialNodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const isEndpoint = node.id === selection.start || node.id === selection.goal;
    const fillColor = bothPicked && !isEndpoint ? CITY_LABEL_IDLE_DIM_COLOR : CITY_LABEL_COLOR;

    const labelY = pos.y + CITY_LABEL_OFFSET_Y * scale;
    const textWidth = ctx.measureText(node.label).width;
    const pillW = textWidth + padX * 2;
    const pillH = fontSize + padY * 2;
    const pillX = pos.x - pillW / 2;
    const pillY = labelY - padY;

    const roundRect = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
    ctx.beginPath();
    if (typeof roundRect === 'function') {
      roundRect.call(ctx, pillX, pillY, pillW, pillH, CITY_LABEL_PILL_RADIUS * scale);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = CITY_LABEL_PILL_COLOR;
    ctx.fill();

    ctx.shadowColor = CITY_LABEL_SHADOW_COLOR;
    ctx.shadowBlur = CITY_LABEL_SHADOW_BLUR;
    ctx.shadowOffsetY = CITY_LABEL_SHADOW_OFFSET_Y;
    ctx.lineWidth = CITY_LABEL_STROKE_WIDTH * scale;
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
  const pageRef = useRef<HTMLElement>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);
  const networkRef = useRef<Network | null>(null);
  const previewNetworksRef = useRef<Network[]>([]);
  const nodesDataSetRef = useRef<DataSet<VisNode> | null>(null);
  const edgesDataSetRef = useRef<DataSet<VisEdge> | null>(null);
  const selectionRef = useRef({ start: '', goal: '' });
  const nodePixelPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const sizeScaleRef = useRef(1);

  const [selection, setSelection] = useState({ start: '', goal: '' });
  const [mapPlacement, setMapPlacement] = useState<MapPlacement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const asValidCity = (id: string | null) => (id && cityNames.includes(id) ? id : '');
    const nextStart = asValidCity(params.get('start'));
    const nextGoal = asValidCity(params.get('goal'));
    if (!nextStart && !nextGoal) return;

    const next = { start: nextStart, goal: nextGoal === nextStart ? '' : nextGoal };
    selectionRef.current = next;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(next);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let resizeHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (!nodesDataSetRef.current) {
        nodesDataSetRef.current = new DataSet(
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

      const nodesDataSet = nodesDataSetRef.current;
      const edgesDataSet = edgesDataSetRef.current;

      const data = {
        nodes: nodesDataSet,
        edges: edgesDataSet
      };

      const resetEdgeColors = () => {
        const allEdges = edgesDataSet.get();
        edgesDataSet.update(
          allEdges.map((edge) => ({
            id: edge.id,
            color: { color: idleEdgeColor, highlight: idleEdgeColor, hover: idleEdgeColor }
          }))
        );
      };

      const colorConnectedEdges = (nodeId: IdType) => {
        const network = networkRef.current;
        if (!network) return;
        const connectedEdgeIds = network.getConnectedEdges(nodeId);

        edgesDataSet.update(
          connectedEdgeIds.map((edgeId) => ({
            id: edgeId,
            color: { color: hoverEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor }
          }))
        );
      };

      const options = {
        physics: false,
        edges: {
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
          // Straight edges: with physics off, curved edges never get laid out.
          smooth: false,
        },
        nodes: {
          shape: 'image',
          shapeProperties: { interpolation: false },
        },
        interaction: lockedInteraction,
      };

      const alignPreviewNetwork = (network: Network, container: HTMLDivElement) => {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || !pageRef.current) return;
        const pageRect = pageRef.current.getBoundingClientRect();
        const scale = sizeScaleFor(rect.width);
        if (scale !== sizeScaleRef.current) {
          sizeScaleRef.current = scale;
          nodesDataSet.update(initialNodes.map(({ id }) => ({ id, ...nodeVisualForSelection(id, selectionRef.current, scale) })));
          edgesDataSet.update(initialEdges.map((_, index) => ({ id: index, font: { size: EDGE_FONT_SIZE * scale } })));
        }
        const placement = computePageMapPlacement(pageRect, rect, scaledMapPad(scale));
        const { box } = placement;
        setMapPlacement((prev) => (prev && sameMapBox(prev.box, box) ? prev : placement));
        const positions = computeNodePixelPositions(box, { left: rect.left - pageRect.left, top: rect.top - pageRect.top });
        nodesDataSet.update(positions);
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
          drawCityLabels(ctx, nodePixelPositionsRef.current, selectionRef.current, sizeScaleRef.current);
        });
      });
      previewNetworksRef.current.forEach((network, i) => alignPreviewNetwork(network, previewContainers[i]));

      const handleNodeClick = (params: { nodes: IdType[] }) => {
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

      networkRef.current.on('hoverNode', (params: { node: IdType }) => {
        if (selectionRef.current.start && selectionRef.current.goal) return;
        resetEdgeColors();
        colorConnectedEdges(params.node);
      });

      networkRef.current.on('blurNode', () => {
        if (selectionRef.current.start && selectionRef.current.goal) {
          const selectedPathEdges = findPathEdgeIds(selectionRef.current.start, selectionRef.current.goal);

          if (selectedPathEdges.length > 0) {
            edgesDataSet.update(
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

      resizeHandler = () => {
        previewNetworksRef.current.forEach((network, i) => alignPreviewNetwork(network, previewContainers[i]));
      };
      window.addEventListener('resize', resizeHandler);
      resizeObserver = new ResizeObserver(resizeHandler);
      previewContainers.forEach((container) => resizeObserver?.observe(container));
    });

    return () => {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();

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
      ...nodeVisualForSelection(node.id, selection, sizeScaleRef.current),
    }));

    nodesDataSetRef.current.update(updatedNodes);

    const edgesDataSet = edgesDataSetRef.current;
    if (!edgesDataSet) return;

    const resetEdgeColors = () => {
      const allEdges = edgesDataSet.get();
      edgesDataSet.update(
        allEdges.map((edge) => ({
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
      edgesDataSet.update(
        selectedPathEdges.map((edgeId: number) => ({
          id: edgeId,
          color: { color: activePathColor, highlight: activePathColor, hover: activePathColor }
        }))
      );
    }
  }, [selection]);

  return (
    <main
      ref={pageRef}
      className={`relative box-border min-h-screen w-full overflow-x-hidden p-[10px] lg:h-screen lg:overflow-hidden ${pixelFont.className}`}
      style={{ background: '#060a13', color: '#e2f8ff' }}
    >
      <div
        style={{
          position: 'absolute',
          zIndex: 0,
          pointerEvents: 'none',
          ...(mapPlacement
            ? {
                left: mapPlacement.box.left,
                top: mapPlacement.box.top,
                width: mapPlacement.box.width,
                height: mapPlacement.box.height,
                ...mapPlacement.fade,
              }
            : { inset: 0 }),
        }}
      >
        <Image
          src="/images/romania-fantasy-map.png"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          style={{ objectFit: mapPlacement ? 'fill' : 'cover' }}
        />
      </div>

      <header
        className="h-[64px] px-[10px] sm:px-5 lg:h-[100px]"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          className="text-[22px] sm:text-[30px]"
          style={{
            fontWeight: 700,
            letterSpacing: '2px',
            color: '#a5f3fc',
            textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 26px rgba(34,211,238,0.55)',
          }}
        >
          ROMANIA MAP
        </span>
        <a
          href="https://github.com/orgs/CeiRomaniaMapPathFinder/repositories"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CeiRomaniaMapPathFinder on GitHub"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: '1px solid rgba(34,211,238,0.3)',
            background: '#0b1220',
            color: '#67e8f9',
            boxShadow: '0 0 14px rgba(34,211,238,0.25)',
          }}
        >
          <TbBrandGithub size={20} />
        </a>
      </header>

      <section
        className="grid grid-cols-1 gap-3 lg:h-[calc(100%-110px)] lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch"
        style={{ position: 'relative', zIndex: 1, marginTop: '10px' }}
      >
        {['Blind search'].map((title, index) => (
          <article
            key={title}
            className="aspect-[3/2] max-h-[70vh] w-full lg:aspect-auto lg:max-h-none"
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

        <aside
          className="w-full max-w-[420px] justify-self-center lg:mr-4 lg:max-w-none lg:justify-self-stretch"
          style={{
            position: 'relative',
            alignSelf: 'start',
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
                  display: 'block', width: '100%', padding: '10px 32px 10px 36px',
                  border: '1px solid rgba(34,211,238,0.3)', borderRadius: '10px',
                  background: '#0b1220', color: '#e2f8ff', fontSize: '11px',
                  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
                }}
              >
                <option value="">Select city</option>
                {cityNames.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <TbChevronDown
                size={14}
                color="#7dd3fc"
                aria-hidden="true"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              />
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
                  display: 'block', width: '100%', padding: '10px 32px 10px 36px',
                  border: '1px solid rgba(34,211,238,0.3)', borderRadius: '10px',
                  background: '#0b1220', color: '#e2f8ff', fontSize: '11px',
                  WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
                }}
              >
                <option value="">Select city</option>
                {cityNames.filter((city) => city !== selection.start).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <TbChevronDown
                size={14}
                color="#7dd3fc"
                aria-hidden="true"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
              />
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
