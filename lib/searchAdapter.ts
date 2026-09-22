import { routeEdges } from './routePath';
import type { AlgorithmResult, SearchTraceStep } from './searchApi';

export type AStarNode = { town: string; gn: number; hn: number; fn: number; expandedAt: number };

type BackendRun = {
  totalNodes: number;
  distance: number;
  path: string[];
  runtime: number;
  memoryUsageKb: number;
};

export type BfsResponse = BackendRun & {
  routes: Record<string, string[]>;
  expanded: string[];
};

export type AStarResponse = BackendRun & {
  routes: Record<string, AStarNode[]>;
};

const UNEXPECTED_RESPONSE = 'The search backend returned an unexpected response.';

const roadCost = new Map<string, number>();
for (const { from, to, label } of routeEdges) {
  roadCost.set(`${from}|${to}`, Number(label));
  roadCost.set(`${to}|${from}`, Number(label));
}

function pathCost(path: string[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const cost = roadCost.get(`${path[i]}|${path[i + 1]}`);
    if (cost === undefined) {
      throw new Error(`No road between ${path[i]} and ${path[i + 1]} in the map data.`);
    }
    total += cost;
  }
  return total;
}

function makeStep(
  currentNode: string,
  frontier: string[],
  explored: string[],
  path: string[],
  finalPath: string[],
  cost: number,
  done: boolean,
): SearchTraceStep {
  return {
    currentNode,
    frontier,
    explored,
    path,
    finalPath,
    pathCost: cost,
    nodesExplored: explored.length,
    done,
  };
}

function syntheticStep(start: string): SearchTraceStep {
  return makeStep(start, [], [start], [start], [start], 0, true);
}

function bfsSteps(res: BfsResponse, start: string, goal: string): SearchTraceStep[] {
  const { expanded, routes } = res;
  if (expanded.length === 0) return [syntheticStep(start)];

  const parent = new Map<string, string>();
  expanded.forEach((city, k) => {
    for (const child of routes[k] ?? []) parent.set(child, city);
  });

  const pathTo = (city: string) => {
    const path = [city];
    while (path[0] !== start) {
      const from = parent.get(path[0]);
      if (from === undefined) break;
      path.unshift(from);
    }
    return path;
  };

  // BFS catches the goal on generation, so it never actually expands it — A* does. That's
  // why A*'s node count runs one higher on the same pair. Not a bug, just how they differ.
  const explored = new Set<string>();
  const enqueued = [start];
  const last = expanded.length - 1;
  const steps: SearchTraceStep[] = [];

  for (let k = 0; k <= last; k++) {
    explored.add(expanded[k]);
    enqueued.push(...(routes[k] ?? []));
    const frontier = enqueued.filter((city) => !explored.has(city) && city !== goal);

    if (k === last) {
      steps.push(makeStep(expanded[k], frontier, [...explored], res.path, res.path, res.distance, true));
    } else {
      const path = pathTo(expanded[k]);
      steps.push(makeStep(expanded[k], frontier, [...explored], path, [], pathCost(path), false));
    }
  }

  return steps;
}

function aStarSteps(res: AStarResponse, start: string): SearchTraceStep[] {
  const routes = res.routes;
  const count = Object.keys(routes).length;
  if (count === 0) return [syntheticStep(start)];

  const parentStep = new Map<number, number>();
  for (let j = 0; j < count; j++) {
    for (const child of routes[j].slice(1)) {
      if (child.expandedAt >= 0 && !parentStep.has(child.expandedAt)) parentStep.set(child.expandedAt, j);
    }
  }

  const pathAt = (k: number) => {
    const towns: string[] = [];
    for (let s: number | undefined = k; s !== undefined; s = parentStep.get(s)) {
      towns.push(routes[s][0].town);
    }
    return towns.reverse();
  };

  const explored = new Set<string>();
  const steps: SearchTraceStep[] = [];

  for (let k = 0; k < count; k++) {
    const current = routes[k][0];
    explored.add(current.town);

    const frontier = new Set<string>();
    for (let j = 0; j <= k; j++) {
      for (const child of routes[j].slice(1)) {
        if ((child.expandedAt === -1 || child.expandedAt > k) && !explored.has(child.town)) {
          frontier.add(child.town);
        }
      }
    }

    const isLast = k === count - 1;
    steps.push(
      makeStep(
        current.town,
        [...frontier],
        [...explored],
        pathAt(k),
        isLast ? res.path : [],
        isLast ? res.distance : current.gn,
        isLast,
      ),
    );
  }

  return steps;
}

export function mapBfsResponse(res: BfsResponse, start: string, goal: string): AlgorithmResult {
  if (!res || !res.routes || !Array.isArray(res.expanded) || !Array.isArray(res.path)) {
    throw new Error(UNEXPECTED_RESPONSE);
  }
  return {
    steps: bfsSteps(res, start, goal),
    executionTimeMs: res.runtime,
    memoryUsageKb: res.memoryUsageKb,
  };
}

export function mapAStarResponse(res: AStarResponse, start: string): AlgorithmResult {
  if (!res || !res.routes || !Array.isArray(res.path)) {
    throw new Error(UNEXPECTED_RESPONSE);
  }
  return {
    steps: aStarSteps(res, start),
    executionTimeMs: res.runtime,
    memoryUsageKb: res.memoryUsageKb,
  };
}

export function describeFailure(status: number, body: unknown): string {
  const fields = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (status === 404 && typeof fields.error === 'string' && !('path' in fields)) return fields.error;
  if (status === 404) return 'The search backend does not have this endpoint.';
  if (status === 400) return 'A start and a goal city are both required.';
  return `The search backend returned ${status}.`;
}
