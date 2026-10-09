import { routeEdges } from './routePath';

export type XgtParams = {
  beta: number;
  gamma: number;
  tau: number;
};

export const XGT_PARAMS: XgtParams = { beta: 0.02, gamma: 0.01, tau: 1.5 };

export const INITIAL_XGT = 1e-3;
const CLAMP = 1e-30;
const TOLERANCE = 1e-12;
const MAX_ROUNDS = 100_000;

export type Road = { to: string; w: number };

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
  rounds: XgtTable[];
  xgt: XgtTable;
  h: Record<string, number>;
};

export function hFromXgt(xgt: number, gamma = XGT_PARAMS.gamma): number {
  return Math.max(0, Math.floor(-Math.log(xgt) / gamma + 0.5));
}

export type PassTerm = {
  to: string;
  w: number;
  shortness: number;
  threat: number;
  preference: number;
  choice: number;
  completion: number;
  receiverXgt: number;
  contribution: number;
};

export type CityBreakdown = {
  city: string;
  terms: PassTerm[];
  preferenceSum: number;
  xgt: number;
};

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
