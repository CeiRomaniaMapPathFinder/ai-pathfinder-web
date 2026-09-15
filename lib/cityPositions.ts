// Shared, hand-plotted Romania city positions — percentages of whatever
// box the map photo (public/images/romania-fantasy-map.png) is displayed
// in, `object-fit: cover`. Both the city-picker map (app/page.tsx) and the
// search-animation map (components/RomaniaMap.tsx) import this single list
// so they always render the exact same map instead of two hand-tuned
// copies drifting apart.
export type CityPosition = { id: string; label: string; xPct: number; yPct: number };

export const cityPositions: CityPosition[] = [
  { id: 'Oradea', label: 'Oradea', xPct: 32.3, yPct: 19 },
  { id: 'Zerind', label: 'Zerind', xPct: 27.2, yPct: 26 },
  { id: 'Arad', label: 'Arad', xPct: 23.5, yPct: 38.2 },
  { id: 'Timisoara', label: 'Timisoara', xPct: 19, yPct: 49 },
  { id: 'Lugoj', label: 'Lugoj', xPct: 25.8, yPct: 56.8 },
  { id: 'Mehadia', label: 'Mehadia', xPct: 26, yPct: 71 },
  { id: 'Drobeta', label: 'Drobeta', xPct: 31, yPct: 75 },
  { id: 'Sibiu', label: 'Sibiu', xPct: 42.5, yPct: 35.6 },
  { id: 'Fagaras', label: 'Fagaras', xPct: 54, yPct: 40.8 },
  { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', xPct: 46, yPct: 63 },
  { id: 'Craiova', label: 'Craiova', xPct: 41.6, yPct: 85.8 },
  { id: 'Pitesti', label: 'Pitesti', xPct: 54, yPct: 68 },
  { id: 'Bucharest', label: 'Bucharest', xPct: 63.7, yPct: 78 },
  { id: 'Giurgiu', label: 'Giurgiu', xPct: 57, yPct: 90.5 },
  { id: 'Urziceni', label: 'Urziceni', xPct: 66.6, yPct: 65.1 },
  { id: 'Hirsova', label: 'Hirsova', xPct: 73.4, yPct: 71.9 },
  { id: 'Eforie', label: 'Eforie', xPct: 79, yPct: 82.8 },
  { id: 'Vaslui', label: 'Vaslui', xPct: 73, yPct: 49 },
  { id: 'Iasi', label: 'Iasi', xPct: 70, yPct: 36 },
  { id: 'Neamt', label: 'Neamt', xPct: 62, yPct: 29 },
];
