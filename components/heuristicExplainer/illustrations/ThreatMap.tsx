import { routeEdges } from '../../../lib/routePath';
import { hFromXgt, type XgtTable } from '../../../lib/xgtHeuristic';
import { MONO, ROLE, pct } from '../shared';
import { CITY_XY, THREAT_HIGH, THREAT_LOW, snap, threatColor, threatShade } from './geometry';

const VIEW = { x: 5, y: 10, width: 84, height: 49 };

type Side = 'above' | 'below' | 'left' | 'right';

const LABEL_SIDE: Record<string, Side> = {
  Timisoara: 'left',
  Arad: 'left',
  Zerind: 'left',
  Lugoj: 'right',
  Mehadia: 'left',
  Drobeta: 'below',
  Craiova: 'below',
  Giurgiu: 'below',
  Bucharest: 'below',
  Vaslui: 'right',
  Iasi: 'right',
  Hirsova: 'right',
  Eforie: 'right',
};

function labelAt(x: number, y: number, side: Side, line: 0 | 1) {
  const middle = 'middle' as const;
  switch (side) {
    case 'left':
      return { x: x - 2.8, y: y + 0.6 + 2.1 * line, anchor: 'end' as const };
    case 'right':
      return { x: x + 2.8, y: y + 0.6 + 2.1 * line, anchor: 'start' as const };
    case 'below':
      return line === 0 ? { x, y: y + 4.2, anchor: middle } : { x, y: y - 2.6, anchor: middle };
    default:
      return line === 0 ? { x, y: y - 2.6, anchor: middle } : { x, y: y + 4, anchor: middle };
  }
}

function CityLabel({
  x,
  y,
  city,
  color,
  bold,
  value,
}: {
  x: number;
  y: number;
  city: string;
  color: string;
  bold: boolean;
  value?: string;
}) {
  const side = LABEL_SIDE[city] ?? 'above';
  const name = labelAt(x, y, side, 0);
  const second = labelAt(x, y, side, 1);
  const halo = { stroke: '#060a13', strokeWidth: 0.5, paintOrder: 'stroke' as const };
  return (
    <>
      <text
        x={name.x}
        y={name.y}
        textAnchor={name.anchor}
        fontSize={1.75}
        fill={color}
        fontWeight={bold ? 700 : 400}
        {...halo}
      >
        {city}
      </text>
      {value && (
        <text
          x={second.x}
          y={second.y}
          textAnchor={second.anchor}
          fontSize={1.6}
          fontWeight={700}
          fill="#a7f3d0"
          style={MONO}
          {...halo}
        >
          {value}
        </text>
      )}
    </>
  );
}

export default function ThreatMap({
  table,
  start,
  goal,
  selected,
  onSelect,
}: {
  table: XgtTable;
  start: string;
  goal: string;
  selected: string;
  onSelect: (city: string) => void;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`}
        className="w-full select-none"
        role="img"
        aria-label="Map of Romania, each city coloured by its chance of reaching the goal in this round"
      >
        {routeEdges.map((edge) => {
          const a = CITY_XY[edge.from];
          const b = CITY_XY[edge.to];
          const lit = Math.min(threatShade(table[edge.from]), threatShade(table[edge.to]));
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lit > 0.3 ? 'rgba(52,211,153,0.45)' : 'rgba(103,232,249,0.16)'}
              strokeWidth={0.35}
              className="transition-[stroke] duration-500"
            />
          );
        })}

        {Object.entries(CITY_XY).map(([city, { x, y }]) => {
          const xgt = table[city];
          const level = threatShade(xgt);
          const isGoal = city === goal;
          const isStart = city === start;
          const isSelected = city === selected;
          const ring = isGoal ? ROLE.goal : isStart ? ROLE.start : isSelected ? '#67e8f9' : 'rgba(103,232,249,0.35)';
          const h = isGoal ? 0 : hFromXgt(xgt);
          return (
            <g
              key={city}
              role="button"
              tabIndex={0}
              aria-label={`${city}: chance ${pct(xgt)}, h ${h}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(city)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(city);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-cyan-200"
            >
              {level > 0.25 && (
                <circle
                  cx={x}
                  cy={y}
                  r={snap(1.6 + level * 2.4)}
                  fill={THREAT_HIGH}
                  opacity={snap(0.12 + level * 0.18)}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 1.9 : 1.6}
                fill={threatColor(xgt)}
                stroke={ring}
                strokeWidth={isGoal || isStart || isSelected ? 0.5 : 0.25}
                className="transition-[fill] duration-500"
              />
              <CityLabel
                x={x}
                y={y}
                city={city}
                color={isGoal ? ROLE.goal : isStart ? ROLE.start : isSelected ? '#ecfeff' : '#9cc3dc'}
                bold={isGoal || isStart || isSelected}
                value={isGoal || isStart || isSelected ? pct(xgt) : undefined}
              />
              <title>{`${city}: chance ${pct(xgt)}, h ${h}`}</title>
            </g>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#5b7a94]">
        <span className="flex items-center gap-2">
          chance to reach the goal
          <span
            aria-hidden
            className="inline-block h-2 w-24 rounded-sm"
            style={{ background: `linear-gradient(90deg, ${THREAT_LOW}, ${THREAT_HIGH})` }}
          />
          <span style={MONO}>low → high</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: ROLE.start }} /> start
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: ROLE.goal }} /> goal
        </span>
        <span>Tap a city to follow it.</span>
      </figcaption>
    </figure>
  );
}
