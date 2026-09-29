import { describe, expect, it } from 'vitest';
import referenceTable from '../__fixtures__/xgt-h-table.json';
import { CITIES, computeXgt, explainCity, hFromXgt } from '../xgtHeuristic';

// referenceTable[goal][city] is the backend's h (the research code's export,
// which XgtHeuristic.java is tested against).
const reference = referenceTable as Record<string, Record<string, number>>;

describe('computeXgt', () => {
  it('reproduces the backend h table for every goal', () => {
    for (const goal of CITIES) {
      expect(computeXgt(goal).h, `goal = ${goal}`).toEqual(reference[goal]);
    }
  });

  it('converges in 34–40 rounds for every goal', () => {
    for (const goal of CITIES) {
      const updates = computeXgt(goal).rounds.length - 1;
      expect(updates).toBeGreaterThanOrEqual(34);
      expect(updates).toBeLessThanOrEqual(40);
    }
  });

  it('starts every non-goal city at 0.001 and keeps the goal at 1', () => {
    const { rounds } = computeXgt('Bucharest');
    expect(rounds[0].Bucharest).toBe(1);
    expect(rounds[0].Arad).toBe(0.001);
    expect(rounds.every((table) => table.Bucharest === 1)).toBe(true);
  });
});

describe('explainCity', () => {
  it('matches the hand-checked Pitesti example (goal = Bucharest)', () => {
    const { xgt } = computeXgt('Bucharest');
    const pitesti = explainCity('Pitesti', xgt);
    const byReceiver = Object.fromEntries(pitesti.terms.map((term) => [term.to, term]));

    expect(pitesti.preferenceSum).toBeCloseTo(0.14001, 5);
    expect(byReceiver.Bucharest.choice).toBeCloseTo(0.9475, 4);
    expect(byReceiver['Rimnicu Vilcea'].choice).toBeCloseTo(0.0428, 4);
    expect(byReceiver.Craiova.choice).toBeCloseTo(0.0097, 4);
    expect(byReceiver.Bucharest.contribution).toBeCloseTo(0.3451, 4);
    expect(pitesti.xgt).toBeCloseTo(0.3472, 4);
    expect(hFromXgt(pitesti.xgt)).toBe(106);
  });

  it('gives a one-road city the whole choice', () => {
    const { xgt } = computeXgt('Bucharest');
    const giurgiu = explainCity('Giurgiu', xgt);
    expect(giurgiu.terms).toHaveLength(1);
    expect(giurgiu.terms[0].choice).toBe(1);
    expect(giurgiu.xgt).toBeCloseTo(Math.exp(-0.9), 12);
  });

  it('reproduces the length-only model ranking Arad behind Oradea (τ = 0)', () => {
    const { h } = computeXgt('Bucharest', { beta: 0.01, gamma: 0.01, tau: 0 });
    expect(h.Arad).toBe(770);
    expect(h.Oradea).toBe(753);
  });
});
