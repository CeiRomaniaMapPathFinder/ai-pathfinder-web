// A football attack and the same situation read as roads between cities,
// side by side. Numbered markers tie each part of the pitch to its meaning
// on the map (the list next to it uses the same numbers).

import { ROLE, TERM } from '../shared';

const LINE = 'rgba(165,243,252,0.35)';

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.2} fill="#0b1220" stroke="#67e8f9" strokeWidth={0.5} />
      <text x={x} y={y + 1.2} textAnchor="middle" fontSize={3.4} fontWeight={700} fill="#67e8f9">
        {n}
      </text>
    </g>
  );
}

function Player({ x, y, carrier }: { x: number; y: number; carrier?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={2.8} fill={carrier ? '#22d3ee' : '#0e7490'} stroke="#ecfeff" strokeWidth={0.4} />
      {carrier && <circle cx={x + 3.2} cy={y + 2.2} r={1.3} fill="#ecfeff" />}
    </g>
  );
}

/** Left: the pitch. Right: the same shape as cities and roads. */
export default function PitchAnalogy({ goal }: { goal: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <svg
        viewBox="0 0 100 64"
        className="w-full"
        role="img"
        aria-label="A football attack: a player with the ball and three passing options"
      >
        <rect x={2} y={2} width={96} height={60} rx={2} fill="rgba(16,185,129,0.06)" stroke={LINE} strokeWidth={0.5} />
        {/* Mowing stripes. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={2 + i * 16} y={2} width={8} height={60} fill="rgba(52,211,153,0.03)" />
        ))}
        <line x1={20} y1={2} x2={20} y2={62} stroke={LINE} strokeWidth={0.4} />
        <circle cx={20} cy={32} r={8} fill="none" stroke={LINE} strokeWidth={0.4} />
        <rect x={80} y={16} width={18} height={32} fill="none" stroke={LINE} strokeWidth={0.4} />
        <rect x={91} y={25} width={7} height={14} fill="none" stroke={LINE} strokeWidth={0.4} />
        {/* The goal mouth. */}
        <rect x={97.5} y={27} width={2.2} height={10} fill={ROLE.goal} opacity={0.85} />

        {/* Passing lanes: short safe ones solid, a long risky one fading out. */}
        <line x1={36} y1={34} x2={55} y2={16} stroke={TERM.choice} strokeWidth={0.8} strokeDasharray="2 1.2" />
        <line x1={36} y1={34} x2={60} y2={50} stroke={TERM.choice} strokeWidth={0.8} strokeDasharray="2 1.2" />
        <line
          x1={36}
          y1={34}
          x2={84}
          y2={30}
          stroke={TERM.completion}
          strokeWidth={0.8}
          strokeDasharray="1 1.6"
          opacity={0.8}
        />
        <line
          x1={55}
          y1={16}
          x2={84}
          y2={30}
          stroke={TERM.choice}
          strokeWidth={0.5}
          strokeDasharray="2 1.2"
          opacity={0.6}
        />
        <line x1={84} y1={30} x2={97} y2={32} stroke={ROLE.goal} strokeWidth={0.8} />

        <Player x={36} y={34} carrier />
        <Player x={55} y={16} />
        <Player x={60} y={50} />
        <Player x={84} y={30} />

        <Marker x={31} y={24} n={1} />
        <Marker x={46} y={46} n={2} />
        <Marker x={62} y={36} n={3} />
        <Marker x={92} y={52} n={4} />
        <text x={50} y={60} textAnchor="middle" fontSize={3} fill="#5b7a94">
          on the pitch
        </text>
      </svg>

      <svg viewBox="0 0 100 64" className="w-full" role="img" aria-label="The same situation as cities joined by roads">
        <rect
          x={2}
          y={2}
          width={96}
          height={60}
          rx={2}
          fill="rgba(34,211,238,0.03)"
          stroke="rgba(103,232,249,0.2)"
          strokeWidth={0.5}
        />
        <line x1={20} y1={34} x2={42} y2={14} stroke="rgba(103,232,249,0.45)" strokeWidth={0.7} />
        <line x1={20} y1={34} x2={46} y2={50} stroke="rgba(103,232,249,0.45)" strokeWidth={0.7} />
        <line x1={20} y1={34} x2={72} y2={30} stroke="rgba(103,232,249,0.45)" strokeWidth={0.7} />
        <line x1={42} y1={14} x2={72} y2={30} stroke="rgba(103,232,249,0.3)" strokeWidth={0.5} />
        <line x1={72} y1={30} x2={88} y2={42} stroke="rgba(103,232,249,0.45)" strokeWidth={0.7} />

        <text x={28} y={21} fontSize={2.8} fill={TERM.completion} textAnchor="middle">
          80
        </text>
        <text x={31} y={46} fontSize={2.8} fill={TERM.completion} textAnchor="middle">
          97
        </text>
        <text x={50} y={36} fontSize={2.8} fill={TERM.completion} textAnchor="middle">
          211
        </text>
        <text x={83} y={34} fontSize={2.8} fill={TERM.completion} textAnchor="middle">
          90
        </text>

        {[
          [20, 34, '#22d3ee'],
          [42, 14, '#0e7490'],
          [46, 50, '#0e7490'],
          [72, 30, '#0e7490'],
        ].map(([x, y, fill]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.8} fill={fill as string} stroke="#ecfeff" strokeWidth={0.4} />
        ))}
        <circle cx={23.2} cy={36.2} r={1.3} fill="#ecfeff" />
        <circle cx={88} cy={42} r={3.4} fill="#0b1220" stroke={ROLE.goal} strokeWidth={0.8} />
        <text x={88} y={50} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={ROLE.goal}>
          {goal}
        </text>

        <Marker x={12} y={26} n={1} />
        <Marker x={28} y={52} n={2} />
        <Marker x={58} y={40} n={3} />
        <Marker x={92} y={24} n={4} />
        <text x={50} y={60} textAnchor="middle" fontSize={3} fill="#5b7a94">
          on the map
        </text>
      </svg>
    </div>
  );
}
