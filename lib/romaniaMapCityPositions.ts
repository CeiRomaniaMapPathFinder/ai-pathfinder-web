// Hand-plotted Romania city positions for the SEARCH-ANIMATION map
// (components/RomaniaMap.tsx, the BFS/A* panels on page2) only —
// percentages of that component's own card, which is a different shape
// than the city-picker page's full-viewport photo. See the comment in
// lib/cityPositions.ts for why these can't be shared between the two pages.
import type { CityPosition } from './cityPositions';

export const romaniaMapCityPositions: CityPosition[] = [
  { id: 'Oradea', label: 'Oradea', xPct: 30.6, yPct: 7.3 },
  { id: 'Zerind', label: 'Zerind', xPct: 25.7, yPct: 19.7 },
  { id: 'Arad', label: 'Arad', xPct: 20.7, yPct: 35.2 },
  { id: 'Timisoara', label: 'Timisoara', xPct: 18, yPct: 51.6 },
  { id: 'Lugoj', label: 'Lugoj', xPct: 25.8, yPct: 56.8 },
  { id: 'Mehadia', label: 'Mehadia', xPct: 25.4, yPct: 82.2 },
  { id: 'Drobeta', label: 'Drobeta', xPct: 31.4, yPct: 88 },
  { id: 'Sibiu', label: 'Sibiu', xPct: 42.4, yPct: 37 },
  { id: 'Fagaras', label: 'Fagaras', xPct: 54.7, yPct: 39.2 },
  { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', xPct: 45.8, yPct: 63.7 },
  { id: 'Craiova', label: 'Craiova', xPct: 41.7, yPct: 91.4 },
  { id: 'Pitesti', label: 'Pitesti', xPct: 54.3, yPct: 71 },
  { id: 'Bucharest', label: 'Bucharest', xPct: 62.5, yPct: 75 },
  { id: 'Giurgiu', label: 'Giurgiu', xPct: 57.6, yPct: 92.9 },
  { id: 'Urziceni', label: 'Urziceni', xPct: 68.1, yPct: 58.9 },
  { id: 'Hirsova', label: 'Hirsova', xPct: 73.1, yPct: 78 },
  { id: 'Eforie', label: 'Eforie', xPct: 80.1, yPct: 92.9 },
  { id: 'Vaslui', label: 'Vaslui', xPct: 74.2, yPct: 48.9 },
  { id: 'Iasi', label: 'Iasi', xPct: 70.6, yPct: 31.9 },
  { id: 'Neamt', label: 'Neamt', xPct: 63.7, yPct: 20.3 },
];
