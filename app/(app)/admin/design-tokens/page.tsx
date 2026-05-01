const COLORS_LIGHT = [
  {
    name: 'Navy / Primary',
    role: 'brand · CTAs · headers',
    hex: '#0B2447',
    swatchClass: 'bg-navy-primary',
  },
  { name: 'Navy 700', role: 'hover · pressed', hex: '#19376D', swatchClass: 'bg-navy-700' },
  { name: 'Navy 200', role: 'focus ring · selected', hex: '#cdd6e6', swatchClass: 'bg-navy-200' },
  { name: 'Gold / Accent', role: 'emphasis · highlights', hex: '#B88A3E', swatchClass: 'bg-gold' },
  {
    name: 'Paper',
    role: 'background',
    hex: '#FAFBF3',
    swatchClass: 'bg-paper border border-ink/10',
  },
  { name: 'Paper 2', role: 'surface · cards', hex: '#F3EFE6', swatchClass: 'bg-paper-2' },
  { name: 'Ink', role: 'body text', hex: '#1A1A1A', swatchClass: 'bg-ink' },
  { name: 'Ink Soft', role: 'secondary text', hex: '#3A3A3A', swatchClass: 'bg-ink-soft' },
  { name: 'Ink Faint', role: 'muted (AA on paper)', hex: '#6A6A6A', swatchClass: 'bg-ink-faint' },
  { name: 'Success', role: 'answered · published', hex: '#2D6A3A', swatchClass: 'bg-success' },
  {
    name: 'Rust / Warn',
    role: 'errors · destructive · primary CTA',
    hex: '#C14A2A',
    swatchClass: 'bg-rust',
  },
];

const COLORS_DARK = [
  { name: 'Bg', role: 'background', hex: '#0E1118', swatchClass: 'bg-[#0E1118]' },
  { name: 'Surface', role: 'cards · sidebar', hex: '#161922', swatchClass: 'bg-[#161922]' },
  { name: 'Navy Inv', role: 'primary on dark', hex: '#7DA0DC', swatchClass: 'bg-[#7DA0DC]' },
];

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64];

const RADII = [
  { name: 'sharp', val: '0px' },
  { name: 'sm', val: '4px' },
  { name: 'md', val: '8px' },
  { name: 'lg', val: '12px' },
  { name: 'pill', val: '24px' },
  { name: 'full', val: '99px' },
];

const SHADOWS = [
  { name: 'e0', label: 'flush', cls: '' },
  { name: 'e1', label: 'surface', cls: 'shadow-[0_1px_2px_rgba(0,0,0,0.08)]' },
  { name: 'e2', label: 'card', cls: 'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)]' },
  { name: 'e3', label: 'modal', cls: 'shadow-[0_12px_28px_-6px_rgba(0,0,0,0.18)]' },
];

export const metadata = { title: 'Design tokens' };

export default function DesignTokensPage() {
  return (
    <div>
      <header className="border-ink/15 mb-8 flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <div>
          <h1 className="text-ink font-script text-4xl">Design tokens</h1>
          <p className="text-ink-soft font-script mt-1 text-base italic">
            Color · type · spacing · radii · shadows · iconography. The atomic vocabulary.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* COLOR · LIGHT */}
        <article className="border-ink/20 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Color · light
          </p>
          <ul className="flex flex-col gap-2.5">
            {COLORS_LIGHT.map((c) => (
              <li key={c.name} className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
                <span className={`size-9 rounded-md ${c.swatchClass}`} aria-hidden="true" />
                <div>
                  <p className="text-ink font-script text-sm">{c.name}</p>
                  <p className="text-ink-faint font-mono text-[10px]">{c.role}</p>
                </div>
                <span className="text-ink-soft font-mono text-[11px]">{c.hex}</span>
              </li>
            ))}
          </ul>
          <p className="text-rust mt-6 mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Color · dark (v2)
          </p>
          <ul className="flex flex-col gap-2.5">
            {COLORS_DARK.map((c) => (
              <li key={c.name} className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
                <span className={`size-9 rounded-md ${c.swatchClass}`} aria-hidden="true" />
                <div>
                  <p className="text-ink font-script text-sm">{c.name}</p>
                  <p className="text-ink-faint font-mono text-[10px]">{c.role}</p>
                </div>
                <span className="text-ink-soft font-mono text-[11px]">{c.hex}</span>
              </li>
            ))}
          </ul>
          <p className="text-ink-faint mt-5 text-xs italic">
            All text/bg pairs ≥ 4.5:1 (AA). Status uses icon + text, never color alone.
          </p>
        </article>

        {/* TYPE */}
        <article className="border-ink/20 rounded-md border p-5">
          <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            Type
          </p>
          <p className="text-ink-faint mb-4 font-mono text-[11px]">
            UI · Inter (humanist sans, supports ñ + accents)
          </p>
          <p className="text-ink mb-1 text-3xl font-bold">Display 32 / 700</p>
          <p className="text-ink mb-1 text-2xl font-semibold">Heading 24 / 600</p>
          <p className="text-ink mb-1 text-lg font-semibold">Subhead 18 / 600</p>
          <p className="text-ink mb-1 text-base">Body 16 / 400 — Sangguniang Bayan ñoño José</p>
          <p className="text-ink-soft mb-1 text-sm">Caption 14 / 400</p>
          <p className="text-ink-soft mb-4 font-mono text-xs">Mono 12 — RES-2026-014</p>

          <hr className="border-ink/15 my-5 border-t border-dashed" />

          <p className="text-ink-faint mb-3 font-mono text-[11px]">
            Editorial (public site headlines) · Fraunces
          </p>
          <p className="text-ink font-display mb-1 text-2xl font-semibold">
            Tubtub kag malig-on nga pagserbisyo
          </p>
          <p className="text-ink-faint font-mono text-[11px]">
            [HIL] placeholder — Hiligaynon strings live here
          </p>

          <hr className="border-ink/15 my-5 border-t border-dashed" />

          <p className="text-ink-soft text-xs leading-relaxed">
            Line-height: 1.45 body, 1.15 display. Min size: 14px UI / 16px reading.
          </p>
        </article>

        {/* RIGHT COLUMN — spacing + radii + shadows + motion */}
        <div className="flex flex-col gap-5">
          <article className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Spacing scale
            </p>
            <ul className="flex flex-col gap-2">
              {SPACING.map((s) => (
                <li key={s} className="grid grid-cols-[40px_1fr] items-center gap-3">
                  <span className="text-ink-faint font-mono text-[11px] tabular-nums">{s}</span>
                  <span
                    className="bg-ink h-px"
                    style={{ width: `${s * 2}px` }}
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
            <p className="text-ink-faint mt-4 text-xs italic">
              Component padding uses 12/16/24. Section gutters 32/48. Touch ≥ 44.
            </p>
          </article>

          <article className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Radii
            </p>
            <ul className="grid grid-cols-6 gap-3">
              {RADII.map((r) => (
                <li key={r.name} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className="bg-paper-2 border-ink/20 size-12 border"
                    style={{ borderRadius: r.val }}
                    aria-hidden="true"
                  />
                  <span className="text-ink-soft text-[11px]">{r.name}</span>
                  <span className="text-ink-faint font-mono text-[10px]">{r.val}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Shadows / elevation
            </p>
            <ul className="grid grid-cols-4 gap-3">
              {SHADOWS.map((s) => (
                <li key={s.name} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={`bg-paper border-ink/15 size-12 rounded-md border ${s.cls}`}
                    aria-hidden="true"
                  />
                  <span className="text-ink-soft text-[11px]">{s.name}</span>
                  <span className="text-ink-faint font-mono text-[10px]">{s.label}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="border-ink/20 rounded-md border p-5">
            <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Motion
            </p>
            <ul className="text-ink-soft flex flex-col gap-1 font-mono text-xs">
              <li>duration-fast 120ms · hover, focus</li>
              <li>duration-base 180ms · toasts, dropdowns</li>
              <li>duration-slow 260ms · modal, sheet</li>
              <li>ease-out cubic-bezier(.2,.8,.2,1)</li>
              <li>ease-spring cubic-bezier(.34,1.56,.64,1)</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}
