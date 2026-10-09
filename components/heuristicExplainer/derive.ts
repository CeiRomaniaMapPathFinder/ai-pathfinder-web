import { ROADS, hFromXgt } from '../../lib/xgtHeuristic';
import type { Chain } from './illustrations/PassChain';

export type Option = { city: string; g: number; h: number; f: number };

export function firstMoves(start: string, h: Record<string, number>): Option[] {
  return ROADS[start]
    .map(({ to, w }) => ({ city: to, g: w, h: h[to], f: w + h[to] }))
    .sort((a, b) => a.f - b.f || a.city.localeCompare(b.city));
}

const shortestRoad = (city: string, except: string[]) =>
  ROADS[city].filter(({ to }) => !except.includes(to)).sort((a, b) => a.w - b.w)[0];

export function chainInto(goal: string): Chain {
  const near = shortestRoad(goal, []);
  const far = shortestRoad(near.to, [goal]) ?? { to: goal, w: near.w };
  return { far: far.to, near: near.to, goal, wFar: far.w, wNear: near.w };
}

export function roadsFromGoal(goal: string): Record<string, number> {
  const hops: Record<string, number> = { [goal]: 0 };
  const queue = [goal];
  while (queue.length > 0) {
    const city = queue.shift()!;
    for (const { to } of ROADS[city]) {
      if (hops[to] === undefined) {
        hops[to] = hops[city] + 1;
        queue.push(to);
      }
    }
  }
  return hops;
}

export function roundHSettles(
  rounds: Record<string, number>[],
  h: Record<string, number>,
  goal: string,
  gamma: number,
): number {
  for (let round = 0; round < rounds.length; round++) {
    const settled = Object.keys(h).every((city) => city === goal || hFromXgt(rounds[round][city], gamma) === h[city]);
    if (settled) return round;
  }
  return rounds.length - 1;
}
