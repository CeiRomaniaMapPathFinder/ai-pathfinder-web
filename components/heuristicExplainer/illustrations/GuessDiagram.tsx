import { MONO, ROLE, TERM } from '../shared';

export default function GuessDiagram({
  start,
  via,
  goal,
  g,
  h,
}: {
  start: string;
  via: string;
  goal: string;
  g: number;
  h: number;
}) {
  return (
    <svg viewBox="0 0 100 34" className="w-full" role="img" aria-label={`f(${via}) = g ${g} + h ${h}`}>
      <line x1={12} y1={14} x2={46} y2={14} stroke={TERM.g} strokeWidth={0.9} />
      <line x1={54} y1={14} x2={88} y2={14} stroke={TERM.h} strokeWidth={0.9} strokeDasharray="2.2 1.6" />

      <text x={29} y={10} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={TERM.g} style={MONO}>
        g = {g}
      </text>
      <text x={29} y={20.5} textAnchor="middle" fontSize={2.5} fill="#5b7a94">
        already driven — known
      </text>
      <text x={71} y={10} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={TERM.h} style={MONO}>
        h = {h}
      </text>
      <text x={71} y={20.5} textAnchor="middle" fontSize={2.5} fill="#5b7a94">
        still to go — a guess
      </text>

      {[
        [8, start, ROLE.start],
        [50, via, '#67e8f9'],
        [92, goal, ROLE.goal],
      ].map(([x, name, color]) => (
        <g key={`${x}`}>
          <circle cx={x as number} cy={14} r={3.4} fill="#0b1220" stroke={color as string} strokeWidth={0.7} />
          <text x={x as number} y={27} textAnchor="middle" fontSize={3} fontWeight={600} fill={color as string}>
            {name}
          </text>
        </g>
      ))}
      <text x={50} y={32.6} textAnchor="middle" fontSize={2.8} fill={TERM.f} style={MONO}>
        f = {g} + {h} = {g + h}
      </text>
    </svg>
  );
}
