'use client';

import { useEffect, useRef } from 'react';
import { findPathEdgeIds, routeEdges } from './routePath';

type RomaniaMapProps = {
  start?: string;
  goal?: string;
};

const initialNodes = [
  { id: 'Arad', label: 'Arad', x: -300, y: -150 }, { id: 'Zerind', label: 'Zerind', x: -250, y: -250 },
  { id: 'Oradea', label: 'Oradea', x: -200, y: -350 }, { id: 'Sibiu', label: 'Sibiu', x: -50, y: -120 },
  { id: 'Timisoara', label: 'Timisoara', x: -300, y: 0 }, { id: 'Lugoj', label: 'Lugoj', x: -150, y: 70 },
  { id: 'Mehadia', label: 'Mehadia', x: -150, y: 150 }, { id: 'Drobeta', label: 'Drobeta', x: -150, y: 230 },
  { id: 'Craiova', label: 'Craiova', x: 50, y: 260 }, { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', x: 0, y: -20 },
  { id: 'Fagaras', label: 'Fagaras', x: 150, y: -120 }, { id: 'Pitesti', label: 'Pitesti', x: 150, y: 50 },
  { id: 'Bucharest', label: 'Bucharest', x: 350, y: 100 }, { id: 'Giurgiu', label: 'Giurgiu', x: 300, y: 250 },
  { id: 'Urziceni', label: 'Urziceni', x: 480, y: 50 }, { id: 'Hirsova', label: 'Hirsova', x: 650, y: 50 },
  { id: 'Eforie', label: 'Eforie', x: 720, y: 200 }, { id: 'Vaslui', label: 'Vaslui', x: 600, y: -120 },
  { id: 'Iasi', label: 'Iasi', x: 520, y: -220 }, { id: 'Neamt', label: 'Neamt', x: 350, y: -280 }
];

const pathColor = '#3b82f6';

export default function RomaniaMap({ start, goal }: RomaniaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let network: any;
    let disposed = false;
    import('vis-network/standalone').then(({ Network, DataSet }) => {
      if (disposed || !containerRef.current) return;
      const nodes = new DataSet(initialNodes.map((node) => ({
        ...node,
        color: node.id === start ? { background: '#22c55e', border: '#14532d' } : node.id === goal ? { background: '#dc2626', border: '#7f1d1d' } : { background: '#e5e7eb', border: '#6b7280' },
        font: node.id === start || node.id === goal ? { color: '#ffffff' } : { color: '#111827' }
      })));
      const pathIds = start && goal ? new Set(findPathEdgeIds(start, goal)) : new Set<number>();
      const edges = new DataSet(routeEdges.map((edge) => ({
        ...edge,
        color: { color: pathIds.has(edge.id) ? pathColor : '#000000', highlight: pathIds.has(edge.id) ? pathColor : '#000000', hover: pathIds.has(edge.id) ? pathColor : '#000000' }
      })));
      network = new Network(containerRef.current, { nodes, edges }, {
        physics: false,
        edges: { font: { align: 'top', size: 12, color: '#020081', strokeWidth: 3, strokeColor: '#ffffff' }, width: 3 },
        nodes: { shape: 'box', font: { size: 14 }, borderWidth: 3, shadow: { enabled: true, color: 'rgba(0,0,0,0.15)', size: 10, x: 5, y: 5 } },
        interaction: { hover: true }
      });
    });
    return () => { disposed = true; network?.destroy(); };
  }, [start, goal]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}