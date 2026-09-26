import { describe, expect, it } from 'vitest';
import { describePlayerStatus, getRunBothState } from '../playbackStatus';
import type { SearchTraceStep } from '../searchApi';

function step(overrides: Partial<SearchTraceStep> = {}): SearchTraceStep {
  return {
    currentNode: 'Arad',
    frontier: [],
    explored: ['Arad'],
    path: ['Arad'],
    finalPath: [],
    pathCost: 0,
    nodesExplored: 1,
    done: false,
    ...overrides,
  };
}

describe('getRunBothState', () => {
  it('is not complete and not runnable before any data has loaded (empty traces)', () => {
    expect(getRunBothState([], [], undefined, undefined)).toEqual({ canRunBoth: false, bothComplete: false });
  });

  it('is runnable but not complete once multi-step traces have loaded but not been played', () => {
    const trace = [step({ done: false }), step({ done: true })];
    expect(getRunBothState(trace, trace, trace[0], trace[0])).toEqual({ canRunBoth: true, bothComplete: false });
  });

  it('is complete once both multi-step traces have been played to their final step', () => {
    const trace = [step({ done: false }), step({ done: true })];
    expect(getRunBothState(trace, trace, trace[1], trace[1])).toEqual({ canRunBoth: true, bothComplete: true });
  });

  // Regression: a 1-hop route's single step is already `done: true` the
  // moment it loads — that used to make bothComplete true (and the header
  // permanently show "Reset Both") before the user had done anything.
  it('is neither runnable nor complete when both traces are a single, trivially-done step', () => {
    const trivial = [step({ done: true })];
    expect(getRunBothState(trivial, trivial, trivial[0], trivial[0])).toEqual({
      canRunBoth: false,
      bothComplete: false,
    });
  });

  it('is complete when one side is a trivial 1-step trace and the other has been played through', () => {
    const trivial = [step({ done: true })];
    const multi = [step({ done: false }), step({ done: true })];
    expect(getRunBothState(trivial, multi, trivial[0], multi[1])).toEqual({ canRunBoth: true, bothComplete: true });
  });

  it('is not complete when the multi-step side has not finished, even if the trivial side is done', () => {
    const trivial = [step({ done: true })];
    const multi = [step({ done: false }), step({ done: true })];
    expect(getRunBothState(trivial, multi, trivial[0], multi[0])).toEqual({ canRunBoth: true, bothComplete: false });
  });
});

describe('describePlayerStatus', () => {
  it('reads "No Path Yet" with the route endpoints before any trace has loaded', () => {
    expect(describePlayerStatus([], undefined, 'Arad', 'Bucharest')).toEqual({
      statusLabel: 'No Path Yet',
      pathText: 'Arad → Bucharest',
    });
  });

  it('prompts for a route when neither trace nor start/goal are set', () => {
    expect(describePlayerStatus([], undefined, undefined, undefined)).toEqual({
      statusLabel: 'No Path Yet',
      pathText: 'Select a start and goal city',
    });
  });

  it('reads "Current Path" mid-run, singular "city" for a length-1 path', () => {
    const trace = [step({ path: ['Arad'], done: false })];
    expect(describePlayerStatus(trace, trace[0], 'Arad', 'Bucharest')).toEqual({
      statusLabel: 'Current Path',
      pathText: '1 city so far',
    });
  });

  it('reads "Current Path" mid-run, plural "cities" for a longer path, no cost yet', () => {
    const trace = [step({ path: ['Arad', 'Sibiu', 'Fagaras'], done: false })];
    expect(describePlayerStatus(trace, trace[0], 'Arad', 'Bucharest')).toEqual({
      statusLabel: 'Current Path',
      pathText: '3 cities so far',
    });
  });

  it('reads "Path Found" with the final cost on the done step, never the full city list', () => {
    const trace = [step({ path: ['Arad', 'Sibiu', 'Fagaras', 'Bucharest'], pathCost: 450, done: true })];
    expect(describePlayerStatus(trace, trace[0], 'Arad', 'Bucharest')).toEqual({
      statusLabel: 'Path Found',
      pathText: '4 cities · cost 450',
    });
  });
});
