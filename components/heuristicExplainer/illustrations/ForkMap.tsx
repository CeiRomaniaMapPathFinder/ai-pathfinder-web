import { MONO, ROLE } from '../shared';

export type ForkSide = { first: number; second: number; f: number };

const NODE = {
  Zerind: { x: 12, y: 32 },
  Oradea: { x: 44, y: 12 },
  Arad: { x: 44, y: 52 },
  Timisoara: { x: 26, y: 62 },
  Sibiu: { x: 78, y: 32 },
  Bucharest: { x: 110, y: 32 },
};

const SHORT = '#4ade80';
const LONG = '#f472b6';

function Road({
  from,
  to,
  color,
  width = 0.7,
  dashed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dashed ? '1.8 1.4' : undefined}
      strokeLinecap="round"
      className="transition-all duration-500"
    />
  );
}

function Cost({ x, y, children, color = '#9cc3dc' }: { x: number; y: number; children: string; color?: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={3.1}
      fontWeight={700}
      fill={color}
      stroke="#060a13"
      strokeWidth={0.9}
      paintOrder="stroke"
      style={MONO}
    >
      {children}
    </text>
  );
}

function Node({ x, y, name, color, below }: { x: number; y: number; name: string; color: string; below?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.2} fill="#0b1220" stroke={color} strokeWidth={0.7} />
      <text x={x} y={below ? y + 7.4 : y - 5} textAnchor="middle" fontSize={3.3} fontWeight={700} fill={color}>
        {name}
      </text>
    </g>
  );
}

export const FORK_COLORS = { short: SHORT, long: LONG };

export default function ForkMap({ arad, oradea, rest }: { arad: ForkSide; oradea: ForkSide; rest: number }) {
  const chosen = arad.f <= oradea.f ? 'Arad' : 'Oradea';
  return (
    <svg viewBox="0 0 122 66" className="w-full select-none" role="img" aria-label="Two ways from Zerind to Sibiu">
      <Road
        from={NODE.Zerind}
        to={chosen === 'Arad' ? NODE.Arad : NODE.Oradea}
        color="rgba(103,232,249,0.35)"
        width={3.4}
      />

      <Road from={NODE.Zerind} to={NODE.Oradea} color={LONG} />
      <Road from={NODE.Oradea} to={NODE.Sibiu} color={LONG} />
      <Road from={NODE.Zerind} to={NODE.Arad} color={SHORT} />
      <Road from={NODE.Arad} to={NODE.Sibiu} color={SHORT} />
      <Road from={NODE.Arad} to={NODE.Timisoara} color="rgba(103,232,249,0.25)" width={0.5} dashed />
      <Road from={NODE.Sibiu} to={NODE.Bucharest} color="rgba(203,231,245,0.55)" dashed />

      <Cost x={24} y={20} color={LONG}>
        {String(oradea.first)}
      </Cost>
      <Cost x={63} y={19} color={LONG}>
        {String(oradea.second)}
      </Cost>
      <Cost x={24} y={46.5} color={SHORT}>
        {String(arad.first)}
      </Cost>
      <Cost x={63} y={47} color={SHORT}>
        {String(arad.second)}
      </Cost>
      <Cost x={94} y={30}>
        {String(rest)}
      </Cost>
      <text x={94} y={37} textAnchor="middle" fontSize={2.4} fill="#5b7a94">
        same for both
      </text>

      <Node {...NODE.Zerind} name="Zerind" color={ROLE.start} />
      <Node {...NODE.Oradea} name="Oradea" color="#e2f8ff" />
      <Node {...NODE.Arad} name="Arad" color="#e2f8ff" below />
      <Node {...NODE.Sibiu} name="Sibiu" color="#e2f8ff" />
      <Node {...NODE.Bucharest} name="Bucharest" color={ROLE.goal} />
      <circle
        cx={NODE.Timisoara.x}
        cy={NODE.Timisoara.y}
        r={1.8}
        fill="#0b1220"
        stroke="rgba(103,232,249,0.35)"
        strokeWidth={0.4}
      />
      <text x={NODE.Timisoara.x - 3} y={NODE.Timisoara.y + 1} textAnchor="end" fontSize={2.6} fill="#5b7a94">
        Timisoara
      </text>

      <text x={NODE.Zerind.x - 5.5} y={NODE.Zerind.y + 1} textAnchor="end" fontSize={2.5} fill="#67e8f9">
        A* →
      </text>
    </svg>
  );
}
