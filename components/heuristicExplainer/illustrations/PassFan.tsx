import { useId } from 'react';
import type { CityBreakdown } from '../../../lib/xgtHeuristic';
import { ROLE, TERM, pct } from '../shared';
import { angleBetween, snap, spreadAngles, threatColor } from './geometry';

const WIDTH = 100;
const CENTER = { x: 50, y: 33 };
const RX = 27;
const RY = 20;
const NODE_R = 3.2;
const NAME_SIZE = 3.3;
const SUB_SIZE = 2.7;
const CHAR_WIDTH = 0.56;

function outside(point: { x: number; y: number }, angle: number, gap: number, textWidth: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let anchor: 'start' | 'end' | 'middle' = cos > 0.4 ? 'start' : cos < -0.4 ? 'end' : 'middle';
  let x = point.x + cos * gap;
  const overflows = (anchor === 'start' && x + textWidth > WIDTH - 1) || (anchor === 'end' && x - textWidth < 1);
  const below = sin > 0.4 || (overflows && sin >= -0.4);
  if (overflows) {
    anchor = 'middle';
    x = point.x;
  }
  const left = anchor === 'start' ? x : anchor === 'end' ? x - textWidth : x - textWidth / 2;
  if (left < 1) x += 1 - left;
  if (left + textWidth > WIDTH - 1) x -= left + textWidth - (WIDTH - 1);
  const y = sin < -0.4 && !below ? point.y - gap - SUB_SIZE - 1 : below ? point.y + gap + NAME_SIZE : point.y - 0.4;
  return { x: snap(x), y: snap(y), anchor } as const;
}

export default function PassFan({
  breakdown,
  start,
  goal,
  title,
}: {
  breakdown: CityBreakdown;
  start?: string;
  goal: string;
  title?: string;
}) {
  const { city, terms } = breakdown;
  const markerId = `fan-head-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const angles = spreadAngles(
    terms.map((term) => angleBetween(city, term.to)),
    terms.length > 3 ? Math.PI / 3.2 : Math.PI / 2.6,
  );

  const meanSin = angles.reduce((sum, angle) => sum + Math.sin(angle), 0);
  const centerLabelY = meanSin > 0 ? CENTER.y - 6 : CENTER.y + 8.6;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} 66`}
      className="w-full select-none"
      role="img"
      aria-label={title ?? `Passing options from ${city}`}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 6 6"
          refX="4"
          refY="3"
          markerWidth="3.4"
          markerHeight="3.4"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 z" fill={TERM.choice} />
        </marker>
      </defs>

      {terms.map((term, index) => {
        const angle = angles[index];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const end = { x: snap(CENTER.x + cos * RX), y: snap(CENTER.y + sin * RY) };
        const length = Math.hypot(end.x - CENTER.x, end.y - CENTER.y);
        const along = (distance: number) => ({
          x: snap(CENTER.x + ((end.x - CENTER.x) / length) * distance),
          y: snap(CENTER.y + ((end.y - CENTER.y) / length) * distance),
        });
        const from = along(4.6);
        const to = along(length - NODE_R - 1.6);
        const mid = along(length * 0.5);
        const normal = { x: -sin, y: cos };
        const flip = normal.y < 0 || (Math.abs(normal.y) < 0.2 && normal.x < 0) ? -1 : 1;
        const label = { x: snap(mid.x + normal.x * 3.4 * flip), y: snap(mid.y + normal.y * 3.4 * flip) };
        const sub = `road ${term.w} · xGT ${pct(term.receiverXgt)}`;
        const textWidth = Math.max(term.to.length * NAME_SIZE, sub.length * SUB_SIZE) * CHAR_WIDTH;
        const receiver = outside(end, angle, NODE_R + 1.6, textWidth);
        const receiverColor = term.to === goal ? ROLE.goal : term.to === start ? ROLE.start : '#cbe7f5';

        return (
          <g key={term.to}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={TERM.choice}
              strokeOpacity={snap(0.3 + term.choice * 0.7)}
              strokeWidth={snap(0.35 + term.choice * 2.6)}
              strokeLinecap="round"
              markerEnd={`url(#${markerId})`}
              className="transition-all duration-500"
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={3.4}
              fontWeight={700}
              fill={TERM.choice}
              stroke="#060a13"
              strokeWidth={0.8}
              paintOrder="stroke"
            >
              {pct(term.choice)}
            </text>

            <circle
              cx={end.x}
              cy={end.y}
              r={NODE_R}
              fill={threatColor(term.receiverXgt)}
              stroke={receiverColor}
              strokeWidth={0.4}
            />
            <text
              x={receiver.x}
              y={receiver.y}
              textAnchor={receiver.anchor}
              fontSize={NAME_SIZE}
              fontWeight={600}
              fill={receiverColor}
            >
              {term.to}
            </text>
            <text
              x={receiver.x}
              y={receiver.y + SUB_SIZE + 0.9}
              textAnchor={receiver.anchor}
              fontSize={SUB_SIZE}
              fill="#7a9bb3"
            >
              road {term.w} · <tspan fill={TERM.xgt}>xGT {pct(term.receiverXgt)}</tspan>
            </text>
          </g>
        );
      })}

      <circle cx={CENTER.x} cy={CENTER.y} r={4} fill="#0b1220" stroke="#67e8f9" strokeWidth={0.6} />
      <circle cx={CENTER.x} cy={CENTER.y} r={1.4} fill="#ecfeff" />
      <text
        x={CENTER.x}
        y={centerLabelY}
        textAnchor="middle"
        fontSize={3.4}
        fontWeight={700}
        fill="#ecfeff"
        stroke="#060a13"
        strokeWidth={0.8}
        paintOrder="stroke"
      >
        {city}
      </text>
    </svg>
  );
}
