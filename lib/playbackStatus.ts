import type { SearchTraceStep } from './searchApi';

export type RunBothState = { canRunBoth: boolean; bothComplete: boolean };

export function getRunBothState(
  bfsTrace: SearchTraceStep[],
  astarTrace: SearchTraceStep[],
  bfsStep: SearchTraceStep | undefined,
  astarStep: SearchTraceStep | undefined,
): RunBothState {
  const bfsHasSteps = bfsTrace.length > 1;
  const astarHasSteps = astarTrace.length > 1;
  const canRunBoth = bfsHasSteps || astarHasSteps;
  const bothComplete =
    canRunBoth && Boolean((!bfsHasSteps || bfsStep?.done) && (!astarHasSteps || astarStep?.done));

  return { canRunBoth, bothComplete };
}

export type PlayerStatus = { statusLabel: string; pathText: string };

export function describePlayerStatus(
  trace: SearchTraceStep[],
  step: SearchTraceStep | undefined,
  start: string | undefined,
  goal: string | undefined,
): PlayerStatus {
  const hasTrace = trace.length > 0;
  const cityCount = step?.path.length ?? 0;
  const statusLabel = !hasTrace ? 'No Path Yet' : step?.done ? 'Path Found' : 'Current Path';
  const pathText = hasTrace
    ? `${cityCount} ${cityCount === 1 ? 'city' : 'cities'}${step?.done ? ` · cost ${step.pathCost}` : ' so far'}`
    : start && goal
      ? `${start} → ${goal}`
      : 'Select a start and goal city';

  return { statusLabel, pathText };
}
