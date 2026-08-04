'use client'
import React, { useEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
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

      networkRef.current.on('click', (params: any) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const current = selectionRef.current;

          if (!current.start) {
            current.start = nodeId;
          } else if (!current.goal && nodeId !== current.start) {
            current.goal = nodeId;
          } else {
            current.start = nodeId;
            current.goal = '';
          }

          setSelection({ ...current });
        }
      });
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#ffffff' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{ 
        position: 'absolute', top: '20px', left: '20px', 
        background: 'rgba(255, 255, 255, 0.9)', padding: '15px', borderRadius: '12px', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 10,
        color: 'black', backdropFilter: 'blur(4px)', width: '250px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <p style={{ margin: 0, fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
            Click on a node to select Start and Goal.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
            Start Node:
            <div style={{ marginTop: '5px', padding: '8px', borderRadius: '6px', border: '2px solid #22c55e', backgroundColor: 'white', minHeight: '20px' }}>
              {selection.start || '...'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '14px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
            Goal Node:
            <div style={{ marginTop: '5px', padding: '8px', borderRadius: '6px', border: '2px solid #dc2626', backgroundColor: 'white', minHeight: '20px' }}>
              {selection.goal || '...'}
            </div>
          </div>
          <button 
            onClick={() => {
              selectionRef.current = { start: '', goal: '' };
              setSelection({ start: '', goal: '' });
            }}
            style={{ padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Reset Selection
          </button>
        </div>
      </div>
    </div>
  );
}