'use client'
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TbCircleNumber1Filled } from "react-icons/tb";
import { VscLocation } from "react-icons/vsc";

const initialNodes = [
  { id: 'Arad', label: 'Arad', x: -300, y: -150 },
  { id: 'Zerind', label: 'Zerind', x: -250, y: -250 },
  { id: 'Oradea', label: 'Oradea', x: -200, y: -350 },
  { id: 'Sibiu', label: 'Sibiu', x: -50, y: -120 },
  { id: 'Timisoara', label: 'Timisoara', x: -300, y: 0 },
  { id: 'Lugoj', label: 'Lugoj', x: -150, y: 70 },
  { id: 'Mehadia', label: 'Mehadia', x: -150, y: 150 },
  { id: 'Drobeta', label: 'Drobeta', x: -150, y: 230 },
  { id: 'Craiova', label: 'Craiova', x: 50, y: 260 },
  { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', x: 0, y: -20 },
  { id: 'Fagaras', label: 'Fagaras', x: 150, y: -120 },
  { id: 'Pitesti', label: 'Pitesti', x: 150, y: 50 },
  { id: 'Bucharest', label: 'Bucharest', x: 350, y: 100 },
  { id: 'Giurgiu', label: 'Giurgiu', x: 300, y: 250 },
  { id: 'Urziceni', label: 'Urziceni', x: 480, y: 50 },
  { id: 'Hirsova', label: 'Hirsova', x: 650, y: 50 },
  { id: 'Eforie', label: 'Eforie', x: 720, y: 200 },
  { id: 'Vaslui', label: 'Vaslui', x: 600, y: -120 },
  { id: 'Iasi', label: 'Iasi', x: 520, y: -220 },
  { id: 'Neamt', label: 'Neamt', x: 350, y: -280 }
];

const cityNames = initialNodes.map((node) => node.id);

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

const baseColors = [
  { background: '#e5e7eb', border: '#6b7280' }
];

const activePathColor = '#3b82f6';

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

  const [selection, setSelection] = useState({ start: '', goal: '' });

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (!nodesDataSetRef.current) {
        nodesDataSetRef.current = new DataSet(
          initialNodes.map((n, i) => ({ ...n, color: baseColors[i % baseColors.length] }))
        );
      }

      if (!edgesDataSetRef.current) {
        edgesDataSetRef.current = new DataSet(
          initialEdges.map((edge, index) => ({
            ...edge,
            id: index,
            color: { color: '#000000', highlight: '#000000', hover: '#000000' }
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
            color: { color: '#000000', highlight: '#000000', hover: '#000000' }
          }))
        );
      };

      const colorConnectedEdges = (nodeId: string) => {
        const connectedEdgeIds = networkRef.current.getConnectedEdges(nodeId);

        edgesDataSetRef.current.update(
          connectedEdgeIds.map((edgeId: string) => ({
            id: edgeId,
            color: { color: '#3b82f6', highlight: '#3b82f6', hover: '#3b82f6' }
          }))
        );
      };

      const options = {
        physics: false,
        edges: {
          font: { align: 'top', size: 14, color: '#020081', strokeWidth: 3, strokeColor: '#ffffff' },
          color: { color: '#000000', highlight: '#000000', hover: '#000000' },
          width: 3
        },
        nodes: {
          shape: 'box',
          font: { size: 16, color: '#111827' },
          borderWidth: 3,
          shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 }
        },
        interaction: { hover: true }
      };

      networkRef.current = new Network(containerRef.current!, data, options);
      previewNetworksRef.current = previewRefs.current
        .filter((container): container is HTMLDivElement => container !== null)
        .map((container) => new Network(container, data, options));

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
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      previewNetworksRef.current.forEach((network) => network.destroy());
      previewNetworksRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!nodesDataSetRef.current) return;
    
    const updatedNodes = initialNodes.map((node, i) => {
      if (node.id === selection.start) return { id: node.id, color: { background: '#22c55e', border: '#14532d' }, font: { color: '#ffffff' } };
      if (node.id === selection.goal) return { id: node.id, color: { background: '#dc2626', border: '#7f1d1d' }, font: { color: '#ffffff' } };
      return { id: node.id, color: baseColors[i % baseColors.length], font: { color: '#111827' } };
    });

    nodesDataSetRef.current.update(updatedNodes);

    if (!edgesDataSetRef.current) return;

    const resetEdgeColors = () => {
      const allEdges = edgesDataSetRef.current.get();
      edgesDataSetRef.current.update(
        allEdges.map((edge: any) => ({
          id: edge.id,
          color: { color: '#000000', highlight: '#000000', hover: '#000000' }
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
    <main style={{ boxSizing: 'border-box', width: '100vw', height: '100vh', padding: '10px', overflow: 'hidden', background: '#eeeeee', color: '#111111', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ height: '26px', padding: '0 16px', display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '9px', fontSize: '14px' }}>
        Compare search algorithm on Romania map
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 235px', height: 'calc(100% - 36px)', gap: '12px', marginTop: '10px', alignItems: 'stretch' }}>
        {['Blind search'].map((title, index) => (
          <article key={title} style={{ minWidth: 0, minHeight: 0, padding: '28px 16px 10px', background: '#ffffff', borderRadius: '9px' }}>
            
            <div
              ref={(element) => { previewRefs.current[index] = element; }}
              style={{ width: '100%', height: 'calc(100% - 30px)' }}
            />
          </article>
        ))}

        <aside style={{ minHeight: 0, padding: '24px 18px', background: '#ffffff', borderRadius: '9px' }}>
          <div className='flex flex-row items-center'>  
            <TbCircleNumber1Filled size={26}/>
            <p style={{fontSize: '24px', fontWeight: '700', lineHeight: 1.35 }} className='ml-1'>
              Select Cities
            </p>
          </div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280' }} className='mt-4 ml-1'>
            Start City
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <VscLocation
                size={19}
                color="#22c55e"
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
                style={{ display: 'block', width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#ffffff', fontSize: '14px' }}
              >
                <option value="">Select start city</option>
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
            style={{ display: 'block', margin: '12px auto', width: '34px', height: '34px', border: 'none', borderRadius: '50%', background: '#e5e7eb', fontSize: '18px', cursor: 'pointer' }}
          >
            ⇅
          </button>
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280' }} className='ml-1'>
            Goal City
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <VscLocation
                size={19}
                color="#ef4444"
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
                style={{ display: 'block', width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#ffffff', fontSize: '14px' }}
              >
                <option value="">Select goal city</option>
                {cityNames.filter((city) => city !== selection.start).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </label>
          <button
            onClick={() => {
              selectionRef.current = { start: '', goal: '' };
              setSelection({ start: '', goal: '' });
            }}
            style={{ width: '100%', marginTop: '14px', padding: '8px', border: 'none', borderRadius: '10px', backgroundColor: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer' }}
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
            style={{ width: '100%', marginTop: '10px', padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#000000', color: '#ffffff', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
          >
            ▶ Start Search
          </button>
          <div ref={containerRef} style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }} />
        </aside>
      </section>

      
    </main>
  );
}