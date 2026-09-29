import type { ReactNode } from 'react';
import PitchAnalogy from '../illustrations/PitchAnalogy';
import { MONO, type ExplainerModel } from '../shared';
import { Callout, Card, Chapter, City, Prose, T } from '../ui';

export default function FootballChapter({ model }: { model: ExplainerModel }) {
  const { start, goal } = model;
  const rows: [number, string, ReactNode][] = [
    [1, 'Player with the ball', <>a city, where the ball is right now</>],
    [2, 'Passing lane', <>a road to a neighbouring city</>],
    [3, 'How hard the pass is', <>the road cost — a longer road is a riskier pass</>],
    [
      4,
      "Opponent's goal",
      <>
        your goal city, <City name={goal} start={start} goal={goal} />
      </>,
    ],
  ];

  return (
    <Chapter index={2} id="hiw-football" kicker="THE INSPIRATION" title="The football idea: expected threat">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Prose>
          <p>
            Football analysts rate every spot on the pitch with one question:{' '}
            <em>&ldquo;if our team has the ball here, how likely is it that this attack ends in a goal?&rdquo;</em> The
            answer is called <strong className="text-[#e2f8ff]">expected threat (xT)</strong>.
          </p>
          <p>
            A spot is not threatening just because it is close to the goal. It is threatening because of the passes you
            can play from it. A winger with an easy pass to a free striker is more dangerous than a player nearer the
            goal who is surrounded, because only the winger&apos;s next pass leads somewhere good.
          </p>
          <p>
            A road map looks a lot like that. Cities are places the ball can be, roads are passes, and one city is the
            goal. So we asked the xT question about every city. We call the answer <T k="xgt">xGT(city)</T>,
            <em> expected goal threat</em>:
          </p>
          <p className="rounded-[12px] border border-emerald-400/25 bg-emerald-400/[0.05] px-4 py-3 text-[#d1fae5]">
            <T k="xgt">xGT(city)</T> = the chance that an attack starting with the ball in that city eventually reaches{' '}
            {goal}.
          </p>
          <p>
            A city from which reaching {goal} is likely should get a small <T k="h">h</T>, and an unlikely one a large{' '}
            <T k="h">h</T>. The next four steps build <T k="xgt">xGT</T> one idea at a time and then turn it into{' '}
            <T k="h">h</T>.
          </p>
        </Prose>

        <Card className="self-start !p-0">
          <ul className="divide-y divide-cyan-500/10">
            {rows.map(([n, pitch, map]) => (
              <li
                key={n}
                className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-4 py-3 text-[13px]"
              >
                <span
                  className="row-span-2 flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/60 text-[11px] font-bold text-[#67e8f9]"
                  style={MONO}
                >
                  {n}
                </span>
                <span className="font-semibold text-[#e2f8ff]">{pitch}</span>
                <span className="text-[#9cc3dc]">→ {map}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <PitchAnalogy goal={goal} />
      </Card>

      <div className="mt-6">
        <Callout tone="info" title="Only the road list goes in">
          No map coordinates, no straight-line distance and no shortest-path search are used. Every number below comes
          from the 23 roads and their costs, run through the passing model.
        </Callout>
      </div>
    </Chapter>
  );
}
