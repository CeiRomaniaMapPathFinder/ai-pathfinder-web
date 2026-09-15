// Hand-plotted Romania city positions for the CITY-PICKER map (app/page.tsx)
// only — percentages of the full-viewport photo there (`fill` +
// `object-fit: cover` across 100vw x 100vh).
//
// This used to be shared with the search-animation map
// (components/RomaniaMap.tsx) too, on the assumption that "percent of own
// container" would land in the same spot regardless of container shape. It
// doesn't: page1's container is the full viewport while RomaniaMap's is a
// much shorter, wider card, so `object-fit: cover` crops each one
// differently — the same percentage lands on a different part of the actual
// artwork. Positions hand-tuned by eye on one page's shape looked wrong on
// the other's. RomaniaMap.tsx now has its own independently-tuned list in
// lib/romaniaMapCityPositions.ts — if you reposition a city, you may need to
// update it in both places.
export type CityPosition = { id: string; label: string; xPct: number; yPct: number };

export const cityPositions: CityPosition[] = [
  { id: 'Oradea', label: 'Oradea', xPct: 32.2, yPct: 16 },
  { id: 'Zerind', label: 'Zerind', xPct: 27.2, yPct: 26 },
  { id: 'Arad', label: 'Arad', xPct: 23.5, yPct: 38.2 },
  { id: 'Timisoara', label: 'Timisoara', xPct: 19, yPct: 49 },
  { id: 'Lugoj', label: 'Lugoj', xPct: 25.8, yPct: 56.8 },
  { id: 'Mehadia', label: 'Mehadia', xPct: 26, yPct: 71 },
  { id: 'Drobeta', label: 'Drobeta', xPct: 31, yPct: 75 },
  { id: 'Sibiu', label: 'Sibiu', xPct: 42.5, yPct: 39.5 },
  { id: 'Fagaras', label: 'Fagaras', xPct: 54, yPct: 40.8 },
  { id: 'Rimnicu Vilcea', label: 'Rimnicu Vilcea', xPct: 45.4, yPct: 61.3 },
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
