export const routeEdges = [
  ['Arad', 'Zerind', '75'], ['Zerind', 'Oradea', '71'], ['Oradea', 'Sibiu', '151'], ['Arad', 'Sibiu', '140'],
  ['Arad', 'Timisoara', '118'], ['Timisoara', 'Lugoj', '111'], ['Lugoj', 'Mehadia', '70'], ['Mehadia', 'Drobeta', '75'],
  ['Drobeta', 'Craiova', '120'], ['Craiova', 'Rimnicu Vilcea', '146'], ['Craiova', 'Pitesti', '138'], ['Rimnicu Vilcea', 'Sibiu', '80'],
  ['Rimnicu Vilcea', 'Pitesti', '97'], ['Sibiu', 'Fagaras', '99'], ['Fagaras', 'Bucharest', '211'], ['Pitesti', 'Bucharest', '101'],
  ['Bucharest', 'Giurgiu', '90'], ['Bucharest', 'Urziceni', '85'], ['Urziceni', 'Hirsova', '98'], ['Hirsova', 'Eforie', '86'],
  ['Urziceni', 'Vaslui', '142'], ['Vaslui', 'Iasi', '92'], ['Iasi', 'Neamt', '87']
].map(([from, to, label], id) => ({ id, from, to, label }));

export type SearchTraceStep = {
  currentNode: string | null;
  frontier: string[];
  explored: string[];
  path: string[];
  finalPath: string[];
  pathCost: number;
  nodesExplored: number;
  done: boolean;
};

const adjacency = new Map<string, { node: string; cost: number }[]>();

for (const edge of routeEdges) {
  const cost = Number(edge.label);
  adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), { node: edge.to, cost }]);
  adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), { node: edge.from, cost }]);
}

function reconstructPath(previous: Map<string, string>, start: string, node: string) {
  if (node === start) return [start];
  const path = [node];
  let current = node;

  while (current !== start) {
    const parent = previous.get(current);
    if (!parent) return [];
    path.unshift(parent);
    current = parent;
  }

  return path;
}

export function getPathCost(pathNodes: string[]) {
  let totalCost = 0;

  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    const edge = routeEdges.find(
      (candidate) =>
        (candidate.from === from && candidate.to === to) ||
        (candidate.from === to && candidate.to === from),
    );
    if (edge) totalCost += Number(edge.label);
  }

  return totalCost;
}

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

export function buildBfsTrace(start: string, goal: string): SearchTraceStep[] {
  if (!start || !goal) return [];

  if (start === goal) {
    return [{
      currentNode: start,
      frontier: [],
      explored: [start],
      path: [start],
      finalPath: [start],
      pathCost: 0,
      nodesExplored: 1,
      done: true,
    }];
  }

  const queue = [start];
  const discovered = new Set([start]);
  const explored: string[] = [];
  const previous = new Map<string, string>();
  const trace: SearchTraceStep[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    explored.push(current);

    if (current === goal) {
      const finalPath = reconstructPath(previous, start, goal);
      trace.push({
        currentNode: current,
        frontier: [...queue],
        explored: [...explored],
        path: finalPath,
        finalPath,
        pathCost: getPathCost(finalPath),
        nodesExplored: explored.length,
        done: true,
      });
      return trace;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (discovered.has(neighbor.node)) continue;
      discovered.add(neighbor.node);
      previous.set(neighbor.node, current);
      queue.push(neighbor.node);
    }

    const currentPath = reconstructPath(previous, start, current);
    trace.push({
      currentNode: current,
      frontier: [...queue],
      explored: [...explored],
      path: currentPath,
      finalPath: [],
      pathCost: getPathCost(currentPath),
      nodesExplored: explored.length,
      done: false,
    });
  }

  return trace;
}

// A* is implemented with h(n) = 0 because the supplied project has no
// heuristic table. This is still valid A* and behaves like uniform-cost search.
// Replace getHeuristic() later with your custom heuristic if you already have one.
function getHeuristic(_node: string, _goal: string) {
  return 0;
}

export function buildAStarTrace(start: string, goal: string): SearchTraceStep[] {
  if (!start || !goal) return [];

  if (start === goal) {
    return [{
      currentNode: start,
      frontier: [],
      explored: [start],
      path: [start],
      finalPath: [start],
      pathCost: 0,
      nodesExplored: 1,
      done: true,
    }];
  }

  const open = new Set([start]);
  const closed = new Set<string>();
  const previous = new Map<string, string>();
  const gScore = new Map<string, number>([[start, 0]]);
  const fScore = new Map<string, number>([[start, getHeuristic(start, goal)]]);
  const trace: SearchTraceStep[] = [];

  while (open.size > 0) {
    const current = [...open].reduce((best, node) =>
      (fScore.get(node) ?? Infinity) < (fScore.get(best) ?? Infinity) ? node : best,
    );

    open.delete(current);
    closed.add(current);

    if (current === goal) {
      const finalPath = reconstructPath(previous, start, goal);
      trace.push({
        currentNode: current,
        frontier: [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity)),
        explored: [...closed],
        path: finalPath,
        finalPath,
        pathCost: gScore.get(goal) ?? getPathCost(finalPath),
        nodesExplored: closed.size,
        done: true,
      });
      return trace;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (closed.has(neighbor.node)) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + neighbor.cost;
      if (tentativeG >= (gScore.get(neighbor.node) ?? Infinity)) continue;

      previous.set(neighbor.node, current);
      gScore.set(neighbor.node, tentativeG);
      fScore.set(neighbor.node, tentativeG + getHeuristic(neighbor.node, goal));
      open.add(neighbor.node);
    }

    const currentPath = reconstructPath(previous, start, current);
    trace.push({
      currentNode: current,
      frontier: [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity)),
      explored: [...closed],
      path: currentPath,
      finalPath: [],
      pathCost: gScore.get(current) ?? getPathCost(currentPath),
      nodesExplored: closed.size,
      done: false,
    });
  }

  return trace;
}

export function findPathNodes(start: string, goal: string) {
  const trace = buildBfsTrace(start, goal);
  return trace.at(-1)?.finalPath ?? [];
}

export function findPathEdgeIds(start: string, goal: string) {
  return getPathEdgeIds(findPathNodes(start, goal));
}

export function findPathCost(start: string, goal: string) {
  return getPathCost(findPathNodes(start, goal));
}