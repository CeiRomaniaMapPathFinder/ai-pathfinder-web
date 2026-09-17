// Romania city positions as a percentage of the map PHOTO itself
// (public/images/romania-fantasy-map.png, 1536x1024) — not of the screen or
// of any container. That makes them the same on every screen size and on
// both pages; lib/mapProjection.ts turns them into pixels for wherever the
// photo is actually drawn. To move a city, change it here only.
export type CityPosition = { id: string; label: string; xPct: number; yPct: number };

export const cityPositions: CityPosition[] = [
  { id: 'Oradea', label: 'Oradea', xPct: 32.2, yPct: 24.5 },
  { id: 'Zerind', label: 'Zerind', xPct: 27.2, yPct: 32 },
  { id: 'Arad', label: 'Arad', xPct: 23.5, yPct: 41.1 },
  { id: 'Timisoara', label: 'Timisoara', xPct: 19, yPct: 49.2 },
  { id: 'Lugoj', label: 'Lugoj', xPct: 25.8, yPct: 55.1 },
  { id: 'Mehadia', label: 'Mehadia', xPct: 26, yPct: 65.8 },
  { id: 'Drobeta', label: 'Drobeta', xPct: 31, yPct: 68.8 },
  { id: 'Sibiu', label: 'Sibiu', xPct: 42.5, yPct: 42.1 },
  { id: 'Fagaras', label: 'Fagaras', xPct: 54, yPct: 43.1 },
  { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', xPct: 45.4, yPct: 58.5 },
  { id: 'Craiova', label: 'Craiova', xPct: 41.6, yPct: 76.9 },
  { id: 'Pitesti', label: 'Pitesti', xPct: 54, yPct: 63.5 },
  { id: 'Bucharest', label: 'Bucharest', xPct: 63.7, yPct: 71 },
  { id: 'Giurgiu', label: 'Giurgiu', xPct: 57, yPct: 80.4 },
  { id: 'Urziceni', label: 'Urziceni', xPct: 66.6, yPct: 61.3 },
  { id: 'Hirsova', label: 'Hirsova', xPct: 73.4, yPct: 66.4 },
  { id: 'Eforie', label: 'Eforie', xPct: 79, yPct: 74.6 },
  { id: 'Vaslui', label: 'Vaslui', xPct: 73, yPct: 49.2 },
  { id: 'Iasi', label: 'Iasi', xPct: 70, yPct: 39.5 },
  { id: 'Neamt', label: 'Neamt', xPct: 62, yPct: 34.2 },
];
