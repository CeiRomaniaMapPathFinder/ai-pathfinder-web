'use client';

import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  TbArrowsSplit2,
  TbBallFootball,
  TbCalculator,
  TbHelpHexagon,
  TbAdjustmentsHorizontal,
  TbMathFunction,
  TbRipple,
  TbRoute,
  TbShoe,
} from 'react-icons/tb';
import { MONO, PIXEL } from './shared';
import { BackToTree } from './ui';

export const CHAPTERS = [
  { id: 'hiw-guess', title: 'A* needs a guess', icon: TbHelpHexagon },
  { id: 'hiw-football', title: 'The football idea', icon: TbBallFootball },
  { id: 'hiw-fail', title: 'Passes can fail', icon: TbShoe },
  { id: 'hiw-choose', title: 'Choosing a pass', icon: TbArrowsSplit2 },
  { id: 'hiw-spread', title: 'Letting threat spread', icon: TbRipple },
  { id: 'hiw-distance', title: 'From chance to h', icon: TbMathFunction },
  { id: 'hiw-worked', title: 'Worked example', icon: TbCalculator },
  { id: 'hiw-first', title: "A*'s first move", icon: TbRoute },
  { id: 'hiw-knobs', title: 'The three knobs', icon: TbAdjustmentsHorizontal },
] as const satisfies readonly { id: string; title: string; icon: IconType }[];

export type ChapterId = (typeof CHAPTERS)[number]['id'];

/**
 * Which chapter is under the reading line (a thin band ~40% down the
 * viewport). The observer's implicit root is the viewport, which still works
 * though the page scrolls inside its own container rather than the document.
 */
function useActiveChapter(): ChapterId {
  const [active, setActive] = useState<ChapterId>(CHAPTERS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as ChapterId);
        }
      },
      { rootMargin: '-38% 0px -58% 0px' },
    );
    for (const { id } of CHAPTERS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function ContentsRail() {
  const active = useActiveChapter();

  return (
    // Sticky inside the page's own scroll container; self-start keeps the
    // grid from stretching it to the full column height, which would leave
    // it nothing to stick within.
    <nav aria-label="How it works — contents" className="sticky top-8 hidden self-start lg:block">
      <p className={`mb-4 text-[8px] tracking-widest text-[#5b7a94] ${PIXEL}`}>CONTENTS</p>
      <ol className="flex flex-col border-l border-cyan-500/15">
        {CHAPTERS.map(({ id, title, icon: Icon }, index) => {
          const isActive = id === active;
          return (
            <li key={id}>
              {/* Plain anchors: native hash scrolling follows this page's own
                  scroll container, next/link's does not. */}
              <a
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`-ml-px flex items-center gap-3 border-l-2 py-2 pl-4 text-[13px] transition ${
                  isActive
                    ? 'border-[#22d3ee] text-[#ecfeff]'
                    : 'border-transparent text-[#5b7a94] hover:border-cyan-500/40 hover:text-[#a5f3fc]'
                }`}
              >
                <span className="w-5 text-[11px] text-cyan-400/60" style={MONO}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon size={14} className={isActive ? 'text-[#22d3ee]' : ''} />
                {title}
              </a>
            </li>
          );
        })}
      </ol>
      <div className="mt-8">
        <BackToTree />
      </div>
    </nav>
  );
}

/** Compact chapter links for narrow screens, where the rail is hidden. */
export function ContentsChips() {
  return (
    <nav aria-label="How it works — contents" className="cyan-scrollbar -mx-4 overflow-x-auto px-4 pb-2 lg:hidden">
      <ol className="flex w-max gap-2">
        {CHAPTERS.map(({ id, title }, index) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="flex items-center gap-2 rounded-full border border-cyan-500/25 bg-[#060a13] px-3 py-1.5 text-[12px] whitespace-nowrap text-[#7dd3fc] transition hover:text-[#ecfeff]"
            >
              <span className="text-[10px] text-cyan-400/60" style={MONO}>
                {String(index + 1).padStart(2, '0')}
              </span>
              {title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
