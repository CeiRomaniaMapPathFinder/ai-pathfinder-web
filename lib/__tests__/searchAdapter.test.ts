//guard to protect searchAdapter
import { describe, expect, it } from 'vitest';
import { describeFailure, mapAStarResponse, mapBfsResponse, type AStarResponse, type BfsResponse } from '../searchAdapter';
import { routeEdges } from '../routePath';
import type { SearchTraceStep } from '../searchApi';

import bfsAradBucharest from '../__fixtures__/bfs-Arad-Bucharest.json';
import astarAradBucharest from '../__fixtures__/astar-Arad-Bucharest.json';
import bfsZerindBucharest from '../__fixtures__/bfs-Zerind-Bucharest.json';
import astarZerindBucharest from '../__fixtures__/astar-Zerind-Bucharest.json';
import bfsAradArad from '../__fixtures__/bfs-Arad-Arad.json';
import astarAradArad from '../__fixtures__/astar-Arad-Arad.json';

const roadCost = new Map<string, number>();
for (const { from, to, label } of routeEdges) {
  roadCost.set(`${from}|${to}`, Number(label));
  roadCost.set(`${to}|${from}`, Number(label));
}

function sumFinalPath(steps: SearchTraceStep[]): number {
  const finalPath = steps.at(-1)?.finalPath ?? [];
  let total = 0;
  for (let i = 0; i < finalPath.length - 1; i++) {
    total += roadCost.get(`${finalPath[i]}|${finalPath[i + 1]}`) ?? NaN;
  }
  return total;
}

describe('map-drift guard', () => {
  it('sums to the backend distance for every recorded fixture', () => {
    const cases: Array<{ name: string; steps: SearchTraceStep[]; distance: number }> = [
      { name: 'bfs Arad->Bucharest', steps: mapBfsResponse(bfsAradBucharest as BfsResponse, 'Arad', 'Bucharest').steps, distance: bfsAradBucharest.distance },
      { name: 'astar Arad->Bucharest', steps: mapAStarResponse(astarAradBucharest as AStarResponse, 'Arad').steps, distance: astarAradBucharest.distance },
      { name: 'bfs Zerind->Bucharest', steps: mapBfsResponse(bfsZerindBucharest as BfsResponse, 'Zerind', 'Bucharest').steps, distance: bfsZerindBucharest.distance },
      { name: 'astar Zerind->Bucharest', steps: mapAStarResponse(astarZerindBucharest as AStarResponse, 'Zerind').steps, distance: astarZerindBucharest.distance },
      { name: 'bfs Arad->Arad', steps: mapBfsResponse(bfsAradArad as BfsResponse, 'Arad', 'Arad').steps, distance: bfsAradArad.distance },
      { name: 'astar Arad->Arad', steps: mapAStarResponse(astarAradArad as AStarResponse, 'Arad').steps, distance: astarAradArad.distance },
    ];

    for (const { name, steps, distance } of cases) {
      expect(sumFinalPath(steps), name).toBe(distance);
    }
  });
});

describe('BFS Arad -> Bucharest', () => {
  const { steps } = mapBfsResponse(bfsAradBucharest as BfsResponse, 'Arad', 'Bucharest');

  it('visits currentNode in order Arad, Sibiu, Timisoara, Zerind, Fagaras', () => {
    expect(steps.map((s) => s.currentNode)).toEqual(['Arad', 'Sibiu', 'Timisoara', 'Zerind', 'Fagaras']);
  });

  it('never makes Bucharest a currentNode, and finds it only on the last step', () => {
    expect(steps.some((s) => s.currentNode === 'Bucharest')).toBe(false);
    expect(steps.at(-1)?.finalPath).toContain('Bucharest');
  });

  it('has final pathCost 450', () => {
    expect(steps.at(-1)?.pathCost).toBe(450);
  });

  it('last step: currentNode Fagaras, finalPath, Bucharest excluded from explored/frontier', () => {
    const last = steps.at(-1)!;
    expect(last.currentNode).toBe('Fagaras');
    expect(last.pathCost).toBe(450);
    expect(last.finalPath).toEqual(['Arad', 'Sibiu', 'Fagaras', 'Bucharest']);
    expect(last.explored).not.toContain('Bucharest');
    expect(last.frontier).not.toContain('Bucharest');
  });
});

describe('A* Arad -> Bucharest', () => {
  it('has final pathCost 418, strictly less than BFS', () => {
    const astar = mapAStarResponse(astarAradBucharest as AStarResponse, 'Arad').steps;
    const bfs = mapBfsResponse(bfsAradBucharest as BfsResponse, 'Arad', 'Bucharest').steps;
    expect(astar.at(-1)?.pathCost).toBe(418);
    expect(astar.at(-1)!.pathCost).toBeLessThan(bfs.at(-1)!.pathCost);
  });
});

describe('A* Zerind -> Bucharest', () => {
  const { steps } = mapAStarResponse(astarZerindBucharest as AStarResponse, 'Zerind');

  it('expands in order Zerind, Arad, Sibiu, Rimnicu Vilcea, Pitesti', () => {
    expect(steps.map((s) => s.currentNode)).toEqual([
      'Zerind', 'Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti',
    ]);
  });

  // Same contract as BFS above: the goal is never a currentNode, so both algorithms
  // report the same thing — cities expanded, goal excluded.
  it('never makes Bucharest a currentNode, and finds it only on the last step', () => {
    expect(steps.some((s) => s.currentNode === 'Bucharest')).toBe(false);
    expect(steps.at(-1)?.finalPath).toContain('Bucharest');
  });

  it('last step: currentNode Pitesti, finalPath, Bucharest excluded from explored/frontier', () => {
    const last = steps.at(-1)!;
    expect(last.currentNode).toBe('Pitesti');
    expect(last.pathCost).toBe(493);
    expect(last.path).toEqual(last.finalPath);
    expect(last.finalPath).toEqual(['Zerind', 'Arad', 'Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest']);
    expect(last.explored).not.toContain('Bucharest');
    expect(last.frontier).not.toContain('Bucharest');
  });

  it('keeps Oradea in a frontier but never in explored', () => {
    expect(steps.some((s) => s.frontier.includes('Oradea'))).toBe(true);
    expect(steps.some((s) => s.explored.includes('Oradea'))).toBe(false);
  });

  it('drops Arad from the frontier after step 0', () => {
    expect(steps.slice(1).some((s) => s.frontier.includes('Arad'))).toBe(false);
  });
});

describe('start == end', () => {
  it('BFS emits one synthetic step', () => {
    const { steps } = mapBfsResponse(bfsAradArad as BfsResponse, 'Arad', 'Arad');
    expect(steps).toEqual([
      { currentNode: 'Arad', frontier: [], explored: ['Arad'], path: ['Arad'], finalPath: ['Arad'], pathCost: 0, nodesExplored: 1, done: true },
    ]);
  });

  it('A* emits one synthetic step', () => {
    const { steps } = mapAStarResponse(astarAradArad as AStarResponse, 'Arad');
    expect(steps).toEqual([
      { currentNode: 'Arad', frontier: [], explored: ['Arad'], path: ['Arad'], finalPath: ['Arad'], pathCost: 0, nodesExplored: 1, done: true },
    ]);
  });
});

describe('describeFailure', () => {
  it('gives a readable message for 400', () => {
    expect(describeFailure(400, { start: 'Start point is required' })).toBe(
      'A start and a goal city are both required.',
    );
  });

  it('gives a readable message for 404', () => {
    expect(describeFailure(404, { error: 'Start city not found: Atlantis' })).toBe(
      'Start city not found: Atlantis',
    );
  });

  it('gives a readable message when the body is unreadable (network/parse failure)', () => {
    expect(describeFailure(0, null)).toBe('The search backend returned 0.');
  });
});
