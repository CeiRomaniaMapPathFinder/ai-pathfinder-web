import { firstMoves } from '../derive';
import { MONO, TERM, type ExplainerModel } from '../shared';
import { Card, Chapter, City, PanelTitle, Prose, T } from '../ui';

export default function FirstMoveChapter({ model }: { model: ExplainerModel }) {
  const { start, goal, result } = model;
  const options = start === goal ? [] : firstMoves(start, result.h);
  const maxF = Math.max(1, ...options.map((option) => option.f));

  return (
    <Chapter index={8} id="hiw-first" kicker="BACK TO THE SEARCH" title="A*'s first move">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <Prose>
          <p>
            The table is built once, before the search starts. After that, A* only looks numbers up. From{' '}
            <City name={start} start={start} goal={goal} /> it looks at every neighbour, adds the road it would drive (
            <T k="g">g</T>) to that neighbour&apos;s <T k="h">h</T>, and puts them in its queue by <T k="f">f</T>.
          </p>
          <p>
            The lowest <T k="f">f</T> is opened next. That is step 1 of the tree above. It keeps going like this, always
            opening the lowest <T k="f">f</T> in the whole queue, until {goal} itself is the lowest.
          </p>
        </Prose>

        <Card>
          <PanelTitle aside="lowest f is opened next">Neighbours of {start}</PanelTitle>
          {options.length === 0 ? (
            <p className="text-[14px] text-[#9cc3dc]">The start is the goal, so there is nothing to open.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {options.map((option, index) => {
                const best = index === 0;
                return (
                  <li key={option.city} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
                      <span className="flex items-center gap-2">
                        <City name={option.city} start={start} goal={goal} />
                        {best && (
                          <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-[#67e8f9]">
                            OPENED NEXT
                          </span>
                        )}
                      </span>
                      <span style={MONO} className="text-[12px]">
                        <span style={{ color: TERM.g }}>{option.g}</span>
                        <span className="text-[#5b7a94]"> + </span>
                        <span style={{ color: TERM.h }}>{option.h}</span>
                        <span className="text-[#5b7a94]"> = </span>
                        <span className="font-bold" style={{ color: TERM.f }}>
                          {option.f}
                        </span>
                      </span>
                    </div>
                    <div
                      className="flex h-3 overflow-hidden rounded-sm border border-cyan-500/15 bg-[#060a13]"
                      role="img"
                      aria-label={`g ${option.g} plus h ${option.h}`}
                    >
                      <div style={{ width: `${(option.g / maxF) * 100}%`, background: 'rgba(147,197,253,0.7)' }} />
                      <div style={{ width: `${(option.h / maxF) * 100}%`, background: 'rgba(251,191,36,0.7)' }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#5b7a94]">
            <span>
              <span className="mr-1.5 inline-block h-2 w-3 rounded-sm bg-[rgba(147,197,253,0.7)]" />g = road just driven
            </span>
            <span>
              <span className="mr-1.5 inline-block h-2 w-3 rounded-sm bg-[rgba(251,191,36,0.7)]" />h = our guess
            </span>
          </p>
        </Card>
      </div>
    </Chapter>
  );
}
