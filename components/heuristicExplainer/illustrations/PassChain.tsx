// Two passes in a row ending at the goal: the chances multiply, which is
// the same as adding the road costs inside one exponent — the fact the
// −ln step later relies on.

import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { MONO, ROLE, TERM, pct } from '../shared';

export type Chain = { far: string; near: string; goal: string; wFar: number; wNear: number };

const NODES = [10, 50, 90];

export default function PassChain({ chain }: { chain: Chain }) {
  const { far, near, goal, wFar, wNear } = chain;
  const cNear = Math.exp(-XGT_PARAMS.gamma * wNear);
  const cFar = Math.exp(-XGT_PARAMS.gamma * wFar);
  const names = [far, near, goal];
  const roads = [
    { w: wFar, c: cFar },
    { w: wNear, c: cNear },
  ];

  return (
    <svg viewBox="0 0 100 30" className="w-full" role="img" aria-label={`${far} to ${near} to ${goal}`}>
      {roads.map((road, index) => {
        const x1 = NODES[index] + 4;
        const x2 = NODES[index + 1] - 4;
        const mid = (x1 + x2) / 2;
        return (
          <g key={index}>
            <line x1={x1} y1={12} x2={x2} y2={12} stroke={TERM.completion} strokeWidth={0.6} strokeDasharray="2 1" />
            <path
              d={`M${x2 - 1.8},10.6 L${x2},12 L${x2 - 1.8},13.4`}
              fill="none"
              stroke={TERM.completion}
              strokeWidth={0.6}
            />
            <text x={mid} y={9} textAnchor="middle" fontSize={2.8} fill="#9cc3dc" style={MONO}>
              w = {road.w}
            </text>
            <text
              x={mid}
              y={17.4}
              textAnchor="middle"
              fontSize={3}
              fontWeight={700}
              fill={TERM.completion}
              style={MONO}
            >
              {pct(road.c)}
            </text>
          </g>
        );
      })}
      {names.map((name, index) => {
        const isGoal = index === 2;
        return (
          <g key={name}>
            <circle
              cx={NODES[index]}
              cy={12}
              r={3.4}
              fill="#0b1220"
              stroke={isGoal ? ROLE.goal : '#67e8f9'}
              strokeWidth={0.6}
            />
            {index === 0 && <circle cx={NODES[0]} cy={12} r={1.3} fill="#ecfeff" />}
            <text
              x={NODES[index]}
              y={23.5}
              textAnchor="middle"
              fontSize={3}
              fontWeight={600}
              fill={isGoal ? ROLE.goal : '#e2f8ff'}
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
