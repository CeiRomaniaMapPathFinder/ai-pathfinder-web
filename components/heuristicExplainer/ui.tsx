import type { ReactNode } from 'react';
import { TbAlertTriangle, TbArrowUp, TbBulb, TbInfoCircle } from 'react-icons/tb';
import { GLASS_CARD } from '../../lib/uiTheme';
import { GLOW, MONO, PIXEL, ROLE, TERM, type TermKey } from './shared';

export function GlowDivider() {
  const line = 'absolute inset-x-0 top-0 bg-gradient-to-r from-cyan-300 via-cyan-400/50 to-transparent';
  return (
    <div aria-hidden className="pointer-events-none">
      <div className={`${line} h-[3px] -translate-y-px opacity-80 blur-[3px]`} />
      <div className={`${line} h-px`} />
      <span className="absolute top-0 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_10px_3px_rgba(34,211,238,0.8)]" />
    </div>
  );
}

export function Chapter({
  index,
  id,
  kicker,
  title,
  lead,
  children,
}: {
  index: number;
  id: string;
  kicker?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-8 py-12 first:pt-0 sm:py-14">
      {index > 1 && <GlowDivider />}
      <header className="mb-7 flex items-start gap-4 sm:gap-5">
        <span className={`text-[20px] leading-none text-cyan-400/35 sm:text-[26px] ${PIXEL}`} aria-hidden>
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0 pt-0.5">
          {kicker && <p className={`mb-2 text-[8px] tracking-widest text-[#5b7a94] ${PIXEL}`}>{kicker}</p>}
          <h3 className={`text-[13px] leading-[1.6] text-[#a5f3fc] sm:text-[15px] ${PIXEL}`} style={GLOW}>
            {title}
          </h3>
          {lead && <div className="mt-3 max-w-[70ch] text-[15px] leading-[1.8] text-[#7dd3fc]">{lead}</div>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex max-w-[64ch] flex-col gap-4 text-[15px] leading-[1.85] ${className}`}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${GLASS_CARD} min-w-0 p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-[13px] font-semibold text-[#e2f8ff]">{children}</p>
      {aside && <span className="text-[12px] text-[#5b7a94]">{aside}</span>}
    </div>
  );
}

export function T({ k, children }: { k: TermKey; children: ReactNode }) {
  return (
    <span className="font-semibold whitespace-nowrap" style={{ ...MONO, color: TERM[k] }}>
      {children}
    </span>
  );
}

export function M({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`} style={MONO}>
      {children}
    </span>
  );
}

export function City({ name, start, goal }: { name: string; start?: string; goal?: string }) {
  const color = name === goal ? ROLE.goal : name === start ? ROLE.start : undefined;
  return (
    <span className="font-semibold whitespace-nowrap text-[#e2f8ff]" style={color ? { color } : undefined}>
      {name}
    </span>
  );
}

export function Eq({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div
        className="cyan-scrollbar overflow-x-auto rounded-[12px] border border-cyan-500/20 bg-[#050912] px-4 py-4 text-[13px] leading-[2] whitespace-nowrap text-[#cbe7f5] shadow-[inset_0_0_24px_rgba(34,211,238,0.05)] sm:px-5 sm:text-[14px]"
        style={MONO}
      >
        {children}
      </div>
      {caption && <figcaption className="text-[12px] leading-[1.6] text-[#5b7a94]">{caption}</figcaption>}
    </figure>
  );
}

export function Bar({
  ratio,
  color,
  glow,
  className = 'w-full',
}: {
  ratio: number;
  color: string;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={`h-2.5 overflow-hidden rounded-sm border border-cyan-500/15 bg-[#060a13] ${className}`}>
      <div
        className="h-full rounded-sm transition-[width] duration-300"
        style={{
          width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
          background: color,
          boxShadow: glow ? `0 0 8px ${color}` : undefined,
        }}
      />
    </div>
  );
}

const CALLOUT_TONES = {
  info: {
    box: 'border-cyan-400/25 bg-cyan-400/[0.05]',
    title: 'text-[#a5f3fc]',
    icon: TbInfoCircle,
    iconColor: '#67e8f9',
  },
  warn: {
    box: 'border-amber-400/30 bg-amber-400/[0.06]',
    title: 'text-[#fde68a]',
    icon: TbAlertTriangle,
    iconColor: '#fbbf24',
  },
  idea: {
    box: 'border-emerald-400/25 bg-emerald-400/[0.05]',
    title: 'text-[#a7f3d0]',
    icon: TbBulb,
    iconColor: '#34d399',
  },
} as const;

export function Callout({
  tone,
  title,
  children,
}: {
  tone: keyof typeof CALLOUT_TONES;
  title: string;
  children: ReactNode;
}) {
  const style = CALLOUT_TONES[tone];
  const Icon = style.icon;
  return (
    <div className={`flex gap-3 rounded-[12px] border px-4 py-4 sm:gap-4 sm:px-5 ${style.box}`}>
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: style.iconColor }} />
      <div className="min-w-0 text-[14px] leading-[1.75]">
        <p className={`font-semibold ${style.title}`}>{title}</p>
        <div className="mt-1 text-[#cbe7f5]">{children}</div>
      </div>
    </div>
  );
}

export function Toggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap rounded-[12px] border border-cyan-500/25 bg-[#060a13] p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition ${
              active
                ? 'bg-cyan-500/20 text-[#ecfeff] shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'text-[#5b7a94] hover:text-[#a5f3fc]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function BackToTree() {
  // Plain anchor, and never id="top": next/link resolves that to document.body.
  return (
    <a
      href="#search-tree"
      className="inline-flex items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[12px] font-semibold text-[#67e8f9] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
    >
      <TbArrowUp size={14} />
      Back to the tree
    </a>
  );
}
