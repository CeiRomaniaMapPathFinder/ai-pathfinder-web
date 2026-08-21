export const routeEdges = [
  ['Arad', 'Zerind', '75'], ['Zerind', 'Oradea', '71'], ['Oradea', 'Sibiu', '151'], ['Arad', 'Sibiu', '140'],
  ['Arad', 'Timisoara', '118'], ['Timisoara', 'Lugoj', '111'], ['Lugoj', 'Mehadia', '70'], ['Mehadia', 'Drobeta', '75'],
  ['Drobeta', 'Craiova', '120'], ['Craiova', 'Rimnicu Vilcea', '146'], ['Craiova', 'Pitesti', '138'], ['Rimnicu Vilcea', 'Sibiu', '80'],
  ['Rimnicu Vilcea', 'Pitesti', '97'], ['Sibiu', 'Fagaras', '99'], ['Fagaras', 'Bucharest', '211'], ['Pitesti', 'Bucharest', '101'],
  ['Bucharest', 'Giurgiu', '90'], ['Bucharest', 'Urziceni', '85'], ['Urziceni', 'Hirsova', '98'], ['Hirsova', 'Eforie', '86'],
  ['Urziceni', 'Vaslui', '142'], ['Vaslui', 'Iasi', '92'], ['Iasi', 'Neamt', '87']
].map(([from, to, label], id) => ({ id, from, to, label }));

export function findPathNodes(start: string, goal: string) {
  const adjacency = new Map<string, string[]>();
  const edgeIdByKey = new Map<string, number>();

  routeEdges.forEach((edge) => {
    edgeIdByKey.set(`${edge.from}|${edge.to}`, edge.id);
    edgeIdByKey.set(`${edge.to}|${edge.from}`, edge.id);
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  });

  const queue = [start];
  const visited = new Set([start]);
  const previous = new Map<string, string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === goal) break;
    for (const neighbor of adjacency.get(current ?? '') ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previous.set(neighbor, current ?? '');
      queue.push(neighbor);
    }
  }
  if (!visited.has(goal)) return [];

  const pathNodes = [goal];
  let current = goal;
  while (current !== start) {
    const parent = previous.get(current);
    if (!parent) return [];
    pathNodes.unshift(parent);
    current = parent;
  }
  return pathNodes;
}

export function findPathEdgeIds(start: string, goal: string) {
  const pathNodes = findPathNodes(start, goal);
  return pathNodes.slice(0, -1)
    .map((node, index) => routeEdges.find((edge) =>
      (edge.from === node && edge.to === pathNodes[index + 1]) ||
      (edge.to === node && edge.from === pathNodes[index + 1])
    )?.id)
    .filter((id): id is number => id !== undefined);
}
