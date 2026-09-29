import { useState, type ReactNode } from 'react';
import { CITIES, ROADS, XGT_PARAMS, explainCity } from '../../../lib/xgtHeuristic';
import PassFan from '../illustrations/PassFan';
import { MONO, ROLE, TERM, dec, pct, type ExplainerModel, type TermKey } from '../shared';
import { Card, Chapter, City, Eq, M, PanelTitle, Prose, T } from '../ui';

function Th({ k, children, note }: { k?: TermKey; children: ReactNode; note?: string }) {
  return (
    <th scope="col" className="px-3 py-2 text-right align-bottom font-semibold first:text-left">
      <span style={k ? { ...MONO, color: TERM[k] } : MONO} className="whitespace-nowrap">
        {children}
      </span>
      {note && <span className="mt-0.5 block text-[10px] font-normal whitespace-nowrap text-[#5b7a94]">{note}</span>}
    </th>
  );
}

function Td({ k, children, strong }: { k?: TermKey; children: ReactNode; strong?: boolean }) {
  return (
    <td
      className={`px-3 py-2 text-right whitespace-nowrap first:text-left ${strong ? 'font-bold' : ''}`}
      style={{ ...MONO, color: k ? TERM[k] : '#cbe7f5' }}
    >
      {children}
    </td>
  );
}

export default function WorkedChapter({ model }: { model: ExplainerModel }) {
  const { start, goal, result } = model;
  const defaultCity = start !== goal ? start : ROADS[goal][0].to;
  const [city, setCity] = useState(defaultCity);
  const { beta, gamma, tau } = XGT_PARAMS;

  const breakdown = explainCity(city, result.xgt);
  const raw = -Math.log(breakdown.xgt) / gamma;
  const suggestions = [defaultCity, ...ROADS[defaultCity].map((road) => road.to).filter((c) => c !== goal)];

  return (
    <Chapter
      index={7}
      id="hiw-worked"
      kicker="PUTTING IT TOGETHER"
      title={`Worked example: h(${city})`}
      lead={
        <>
          Every number below comes from the finished table for goal <City name={goal} start={start} goal={goal} />. Pick
          any city to see its own calculation.
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {suggestions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCity(option)}
            aria-pressed={option === city}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
              option === city
                ? 'border-cyan-300/70 bg-cyan-500/20 text-[#ecfeff]'
                : 'border-cyan-500/25 bg-[#060a13] text-[#7dd3fc] hover:text-[#ecfeff]'
            }`}
          >
            {option === start && <span style={{ color: ROLE.start }}>● </span>}
            {option}
          </button>
        ))}
        <select
          aria-label="Any city"
          value={suggestions.includes(city) ? '' : city}
          onChange={(event) => event.target.value && setCity(event.target.value)}
          className="rounded-full border border-cyan-500/25 bg-[#060a13] px-3 py-1.5 text-[12px] text-[#7dd3fc]"
        >
          <option value="">other city…</option>
          {CITIES.filter((c) => c !== goal).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <PanelTitle aside={`${breakdown.terms.length} road${breakdown.terms.length === 1 ? '' : 's'}`}>
            The player on {city} and the options
          </PanelTitle>
          <PassFan breakdown={breakdown} start={start} goal={goal} />
          <p className="mt-2 text-[12px] leading-[1.6] text-[#5b7a94]">
            Arrow width is <T k="choice">P</T>, the chance each road is picked. Circles are coloured by the
            receiver&apos;s <T k="xgt">xGT</T>.
          </p>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Eq>
            <div className="text-[#5b7a94]">1. add up the roads</div>
            <div>
              <T k="xgt">xGT({city})</T> = {breakdown.terms.map((term) => dec(term.contribution, 5)).join(' + ')} ={' '}
              <T k="xgt">{dec(breakdown.xgt, 5)}</T> <span className="text-[#5b7a94]">({pct(breakdown.xgt)})</span>
            </div>
            <div className="mt-2 text-[#5b7a94]">2. turn it into road-cost units</div>
            <div>
              <T k="h">h({city})</T> = floor( −ln({dec(breakdown.xgt, 5)}) ÷ {gamma} + 0.5 )
            </div>
            <div className="pl-[7ch]">
              = floor( {raw.toFixed(2)} + 0.5 ) = <T k="h">{result.h[city]}</T>
            </div>
          </Eq>

          <Prose className="text-[14px]">
            <p>
              {breakdown.terms.length === 1 ? (
                <>
                  {city} has only one road, so the player always takes it (<T k="choice">P = 100%</T>) and its value is
                  just that pass&apos;s chance times the receiver&apos;s value.
                </>
              ) : (
                <>
                  Most of {city}&apos;s value comes from the road the player picks most,{' '}
                  <City
                    name={breakdown.terms.reduce((a, b) => (b.choice > a.choice ? b : a)).to}
                    start={start}
                    goal={goal}
                  />
                  . The other roads add a little value, but they also draw some of the choice away from the best road.
                  That is why <T k="h">h</T> usually lands a bit above the plain road length.
                </>
              )}{' '}
              The tree above shows <M className="text-[#fde68a]">h = {result.h[city]}</M> under every {city} node.
            </p>
          </Prose>
        </div>
      </div>

      <div className="mt-4">
        <Card className="!p-0">
          <div className="cyan-scrollbar overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="border-b border-cyan-500/15 text-[#9cc3dc]">
                <tr>
                  <Th note="receiver v">road to</Th>
                  <Th note="road cost">w</Th>
                  <Th k="shortness" note="short road?">
                    e^(−{beta}w)
                  </Th>
                  <Th k="xgt" note="receiver's threat">
                    xGT(v)^{tau}
                  </Th>
                  <Th note="multiply">preference</Th>
                  <Th k="choice" note="÷ sum">
                    P
                  </Th>
                  <Th k="completion" note="arrives?">
                    e^(−{gamma}w)
                  </Th>
                  <Th k="xgt" note="worth there">
                    xGT(v)
                  </Th>
                  <Th k="xgt" note="P · C · xGT(v)">
                    adds
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {breakdown.terms.map((term) => (
                  <tr key={term.to}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <City name={term.to} start={start} goal={goal} />
                    </td>
                    <Td>{term.w}</Td>
                    <Td k="shortness">{dec(term.shortness)}</Td>
                    <Td k="xgt">{dec(term.threat, 5)}</Td>
                    <Td>{dec(term.preference, 5)}</Td>
                    <Td k="choice" strong>
                      {pct(term.choice)}
                    </Td>
                    <Td k="completion">{pct(term.completion)}</Td>
                    <Td k="xgt">{pct(term.receiverXgt)}</Td>
                    <Td k="xgt" strong>
                      {dec(term.contribution, 5)}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-cyan-500/20">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-[12px] text-[#5b7a94]">
                    sum of preferences
                  </td>
                  <Td>{dec(breakdown.preferenceSum, 5)}</Td>
                  <Td k="choice">100%</Td>
                  <td colSpan={2} className="px-3 py-2 text-right text-[12px] text-[#5b7a94]">
                    xGT({city}) =
                  </td>
                  <Td k="xgt" strong>
                    {dec(breakdown.xgt, 5)}
                  </Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </Chapter>
  );
}
