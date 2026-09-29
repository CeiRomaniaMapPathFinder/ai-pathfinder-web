// The xGT-v2b heuristic, recomputed in the browser FOR EXPLAINING ONLY.
//
// The search itself never uses this file — the backend computes h
// (pathfinder-api services/XgtHeuristic.java) and sends it inside the tree.
// The "How it works" section on /page3 needs more than the final h, though:
// every round of the iteration and every term of every city's sum, for
// whichever goal the user picked. Those are cheap (20 cities, ~40 rounds),
// so they are rebuilt here from the same road list the map draws.
//
// lib/__tests__/xgtHeuristic.test.ts pins the output to the backend's full
// 20 × 20 h table, so the explanation can't drift from the real heuristic.

import { routeEdges } from './routePath';

export type XgtParams = {
  /** How strongly the passer prefers short roads. */
  beta: number;
  /** How fast pass completion drops with road cost — also the unit of h. */
  gamma: number;
  /** How strongly the passer prefers receivers that are themselves threatening. */
  tau: number;
};

/** The shipped parameters. */
export const XGT_PARAMS: XgtParams = { beta: 0.02, gamma: 0.01, tau: 1.5 };

/** Every non-goal city starts here; must be > 0 because it is raised to τ. */
export const INITIAL_XGT = 1e-3;
const CLAMP = 1e-30;
const TOLERANCE = 1e-12;
const MAX_ROUNDS = 100_000;

export type Road = { to: string; w: number };

/** Undirected adjacency built from the drawn road list, in its order. */
export const ROADS: Record<string, Road[]> = (() => {
  const roads: Record<string, Road[]> = {};
  for (const { from, to, label } of routeEdges) {
    const w = Number(label);
    (roads[from] ??= []).push({ to, w });
    (roads[to] ??= []).push({ to: from, w });
  }
  return roads;
})();

export const CITIES = Object.keys(ROADS).sort();

export type XgtTable = Record<string, number>;

export type XgtResult = {
  goal: string;
  params: XgtParams;
  /** rounds[0] is the starting table, rounds[k] the table after k updates. */
  rounds: XgtTable[];
  /** The converged table (= the last round). */
  xgt: XgtTable;
  /** The integer heuristic in road-cost units, h[goal] = 0. */
  h: Record<string, number>;
};

/** Converts a probability into road-cost units. */
export function hFromXgt(xgt: number, gamma = XGT_PARAMS.gamma): number {
  return Math.max(0, Math.floor(-Math.log(xgt) / gamma + 0.5));
}

/** One term of a city's sum: what one road contributes to its xGT. */
export type PassTerm = {
  to: string;
  w: number;
  /** e^(−βw): how attractive the road is by length alone. */
  shortness: number;
  /** xGT(v)^τ: how attractive the receiver is by its own threat. */
  threat: number;
  /** shortness × threat, before normalising. */
  preference: number;
  /** preference / Σ preference — the chance the passer picks this road. */
  choice: number;
  /** e^(−γw): the chance the pass arrives. */
  completion: number;
  /** xGT of the receiver. */
  receiverXgt: number;
  /** choice × completion × receiverXgt. */
  contribution: number;
};

export type CityBreakdown = {
  city: string;
  terms: PassTerm[];
  preferenceSum: number;
  /** Σ contribution — the city's new xGT. */
  xgt: number;
};

/**
 * The update for one city, term by term, from the given table. At the
 * converged table this reproduces the city's own value.
 */
export function explainCity(city: string, table: XgtTable, params: XgtParams = XGT_PARAMS): CityBreakdown {
  const partial = ROADS[city].map(({ to, w }) => {
    const shortness = Math.exp(-params.beta * w);
    const threat = Math.pow(Math.max(table[to], CLAMP), params.tau);
    return { to, w, shortness, threat, preference: shortness * threat };
  });
  const preferenceSum = partial.reduce((sum, term) => sum + term.preference, 0);

  let xgt = 0;
  const terms = partial.map((term) => {
    const choice = term.preference / preferenceSum;
    const completion = Math.exp(-params.gamma * term.w);
    const receiverXgt = table[term.to];
    const contribution = choice * completion * receiverXgt;
    xgt += contribution;
    return { ...term, choice, completion, receiverXgt, contribution };
  });

  return { city, terms, preferenceSum, xgt };
}

/** Runs the passing model to convergence for one goal. */
export function computeXgt(goal: string, params: XgtParams = XGT_PARAMS): XgtResult {
  let current: XgtTable = {};
  for (const city of CITIES) current[city] = city === goal ? 1 : INITIAL_XGT;
  const rounds = [current];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    // Synchronous update: every city reads the previous round only.
    const next: XgtTable = {};
    let delta = 0;
    for (const city of CITIES) {
      next[city] = city === goal ? 1 : explainCity(city, current, params).xgt;
      delta = Math.max(delta, Math.abs(next[city] - current[city]));
    }
    current = next;
    rounds.push(current);
    if (delta < TOLERANCE) break;
  }

  const h: Record<string, number> = {};
  for (const city of CITIES) h[city] = city === goal ? 0 : hFromXgt(current[city], params.gamma);

  return { goal, params, rounds, xgt: current, h };
}
