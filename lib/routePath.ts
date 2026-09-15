// The Romania road graph as the frontend needs it FOR DRAWING only — the
// edges between cities and their costs, plus a lookup for turning a path
// into edge ids so the map can highlight it.
//
// No search algorithm lives here — or anywhere else in the frontend. The
// backend computes those and sends back animation frames (see lib/searchApi.ts
// for that contract, and lib/mockSearchResponse.json for a sample response
// served until the backend is live).
//
// Note this list must stay in agreement with whatever graph the backend
// searches — if the backend's costs differ from these, the map will label
// edges differently from the path costs shown in the stats panel.

export const routeEdges = [
  ['Arad', 'Zerind', '75'], ['Zerind', 'Oradea', '71'], ['Oradea', 'Sibiu', '151'], ['Arad', 'Sibiu', '140'],
  ['Arad', 'Timisoara', '118'], ['Timisoara', 'Lugoj', '111'], ['Lugoj', 'Mehadia', '70'], ['Mehadia', 'Drobeta', '75'],
  ['Drobeta', 'Craiova', '120'], ['Craiova', 'Rimnicu Vilcea', '146'], ['Craiova', 'Pitesti', '138'], ['Rimnicu Vilcea', 'Sibiu', '80'],
  ['Rimnicu Vilcea', 'Pitesti', '97'], ['Sibiu', 'Fagaras', '99'], ['Fagaras', 'Bucharest', '211'], ['Pitesti', 'Bucharest', '101'],
  ['Bucharest', 'Giurgiu', '90'], ['Bucharest', 'Urziceni', '85'], ['Urziceni', 'Hirsova', '98'], ['Hirsova', 'Eforie', '86'],
  ['Urziceni', 'Vaslui', '142'], ['Vaslui', 'Iasi', '92'], ['Iasi', 'Neamt', '87']
].map(([from, to, label], id) => ({ id, from, to, label }));

/**
 * Turns a list of path nodes (e.g. a step's `path` / `finalPath` from the
 * backend) into the ids of the edges connecting them, so RomaniaMap can
 * light those edges up.
 */
export function getPathEdgeIds(pathNodes: string[]) {
  return pathNodes
    .slice(0, -1)
    .map((node, index) =>
      routeEdges.find(
        (edge) =>
          (edge.from === node && edge.to === pathNodes[index + 1]) ||
          (edge.to === node && edge.from === pathNodes[index + 1]),
      )?.id,
    )
    .filter((id): id is number => id !== undefined);
}
