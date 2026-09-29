// xGT = e^(−γ·h), drawn: chance to score on the vertical axis, h along the
// bottom. Every city of the selected goal's table sits on the curve.

import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { MONO, ROLE, TERM, pct } from '../shared';
import { snap } from './geometry';

const BOX = { left: 12, right: 96, top: 6, bottom: 50 };

export default function ChanceCurve({
  xgt,
  h,
  start,
  goal,
}: {
  xgt: Record<string, number>;
  h: Record<string, number>;
  start: string;
  goal: string;
}) {
  const hMax = Math.max(100, Math.ceil(Math.max(...Object.values(h)) / 100) * 100);
  const sx = (value: number) => snap(BOX.left + (value / hMax) * (BOX.right - BOX.left));
  const sy = (p: number) => snap(BOX.bottom - p * (BOX.bottom - BOX.top));

  const curve = Array.from({ length: 81 }, (_, i) => {
    const value = (i / 80) * hMax;
    return `${i === 0 ? 'M' : 'L'}${sx(value).toFixed(2)},${sy(Math.exp(-XGT_PARAMS.gamma * value)).toFixed(2)}`;
  }).join(' ');

  const ticks = Array.from({ length: hMax / 100 + 1 }, (_, i) => i * 100).filter((t) => hMax <= 600 || t % 200 === 0);
  const startPoint = start !== goal ? { x: sx(h[start]), y: sy(xgt[start]) } : null;

  return (
    <svg viewBox="0 0 100 60" className="w-full" role="img" aria-label="Curve turning a city's chance into its h">
      {/* Axes. */}
      <line
        x1={BOX.left}
        y1={BOX.bottom}
        x2={BOX.right}
        y2={BOX.bottom}
        stroke="rgba(103,232,249,0.3)"
        strokeWidth={0.3}
      />
      <line x1={BOX.left} y1={BOX.top} x2={BOX.left} y2={BOX.bottom} stroke="rgba(103,232,249,0.3)" strokeWidth={0.3} />
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line
            x1={BOX.left - 0.8}
            y1={sy(p)}
            x2={BOX.left}
            y2={sy(p)}
            stroke="rgba(103,232,249,0.3)"
            strokeWidth={0.3}
          />
          <text x={BOX.left - 1.6} y={sy(p) + 0.9} textAnchor="end" fontSize={2.4} fill="#5b7a94" style={MONO}>
            {p * 100}%
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={sx(t)} y={BOX.bottom + 3.6} textAnchor="middle" fontSize={2.4} fill="#5b7a94" style={MONO}>
          {t}
        </text>
      ))}
      <text x={(BOX.left + BOX.right) / 2} y={58.6} textAnchor="middle" fontSize={2.6} fill={TERM.h}>
        h (road-cost units)
      </text>
      <text
        x={3}
        y={(BOX.top + BOX.bottom) / 2}
        fontSize={2.6}
        fill={TERM.xgt}
        textAnchor="middle"
        transform={`rotate(-90 3 ${(BOX.top + BOX.bottom) / 2})`}
      >
        xGT
      </text>

      <path d={curve} fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth={0.5} />

      {/* Read-off guides for the start city: across from its chance, down to its h. */}
      {startPoint && (
        <g stroke={ROLE.start} strokeWidth={0.3} strokeDasharray="1 0.8" opacity={0.8}>
          <line x1={BOX.left} y1={startPoint.y} x2={startPoint.x} y2={startPoint.y} />
          <line x1={startPoint.x} y1={startPoint.y} x2={startPoint.x} y2={BOX.bottom} />
        </g>
      )}

      {Object.keys(h).map((city) => {
        const isStart = city === start;
        const isGoal = city === goal;
        return (
          <circle
            key={city}
            cx={sx(h[city])}
            cy={sy(xgt[city])}
            r={isStart || isGoal ? 1.3 : 0.8}
            fill={isGoal ? ROLE.goal : isStart ? ROLE.start : TERM.h}
            opacity={isStart || isGoal ? 1 : 0.7}
          >
            <title>{`${city}: xGT ${pct(xgt[city])} → h ${h[city]}`}</title>
          </circle>
        );
      })}

      <text x={sx(0) + 2} y={sy(1) + 1} fontSize={2.6} fontWeight={700} fill={ROLE.goal}>
        {goal} (100% → 0)
      </text>
      {startPoint && (
        <text
          x={Math.min(startPoint.x + 1.6, BOX.right - 1)}
          y={startPoint.y - 2}
          textAnchor={startPoint.x > 70 ? 'end' : 'start'}
          fontSize={2.6}
          fontWeight={700}
          fill={ROLE.start}
        >
          {start}: {pct(xgt[start])} → {h[start]}
        </text>
      )}
    </svg>
  );
}
