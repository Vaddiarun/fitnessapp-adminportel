import { useState, type ReactNode } from 'react';

/**
 * Small single-measure SVG charts for the member page. One y-axis per chart, thin marks, dashed target lines,
 * and a hover readout (nearest point / bar) above each plot. Colours mirror the app; the meal-outcome trio passed
 * the dataviz colour-blind validator.
 */
export const OUTCOME = { eaten: '#00A36C', cheated: '#FF4F00', skipped: '#5B5FC7' };
const INK = '#0B0B0C', MUTED = '#68686F', LINE = '#E1E1E5', SUNK = '#EBEBED';
const PAD = { l: 40, r: 10, t: 10, b: 24 };
const H = 170;

function niceMax(max: number, integer = false) {
  if (max <= 0) return integer ? 2 : 1;
  if (integer && max <= 10) return Math.max(2, Math.ceil((max * 1.1) / 2) * 2);
  const raw = max * 1.1, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag;
  return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) ?? 10) * mag;
}
const fmt = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v * 10) / 10));

function Frame({ readout, hint, children }: { readout: ReactNode; hint: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <p className="min-h-[20px] text-sm">{readout ?? <span className="text-muted">{hint}</span>}</p>
      {children}
    </div>
  );
}

function Grid({ width, max, min = 0 }: { width: number; max: number; min?: number }) {
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - min) / (max - min));
  return (
    <>
      {[min, (min + max) / 2, max].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={width - PAD.r} y1={y(v)} y2={y(v)} stroke={LINE} />
          <text x={PAD.l - 6} y={y(v) + 3} fontSize={10} fill={MUTED} textAnchor="end">{fmt(v)}</text>
        </g>
      ))}
    </>
  );
}

const useWidth = () => {
  const [w, setW] = useState(0);
  return { w, ref: (el: HTMLDivElement | null) => { if (el && el.clientWidth !== w) setW(el.clientWidth); } };
};

export function LineTrend({ data, color, unit = '', targetLabel, empty, fitRange }: {
  data: { label: string; value: number; target?: number | null }[]; color: string; unit?: string; targetLabel?: string; empty: string;
  /** Zoom the y-axis to the data (body weight) instead of starting at zero. */
  fitRange?: boolean;
}) {
  const { w, ref } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  if (data.length < 2) return <p className="py-4 text-sm text-muted">{empty}</p>;
  const all = data.flatMap((d) => (d.target != null ? [d.value, d.target] : [d.value]));
  const lo = fitRange ? Math.floor(Math.min(...all) - 1) : 0;
  const max = fitRange ? Math.ceil(Math.max(...all) + 1) : niceMax(Math.max(...all));
  const x = (i: number) => PAD.l + ((w - PAD.l - PAD.r) * i) / (data.length - 1);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - (v - lo) / (max - lo));
  const path = (get: (d: (typeof data)[number]) => number) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(get(d))}`).join(' ');
  const hasTarget = data.some((d) => d.target != null);
  const s = sel === null ? null : data[sel];
  return (
    <Frame hint="Hover the chart to see each value." readout={s ? <><b>{s.label}</b> · {fmt(s.value)} {unit}{s.target != null ? <span className="text-muted"> (target {fmt(s.target)})</span> : null}</> : null}>
      <div ref={ref}>
        {w ? (
          <svg width={w} height={H} role="img" aria-label={`${data[0].label} to ${data.at(-1)!.label}`}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * (data.length - 1))))); }}
            onMouseLeave={() => setSel(null)}>
            <Grid width={w} max={max} min={lo} />
            {hasTarget ? <path d={path((d) => d.target ?? 0)} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" fill="none" /> : null}
            <path d={path((d) => d.value)} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {data.length <= 60 ? data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r={2.5} fill={color} />) : null}
            {sel !== null ? <>
              <line x1={x(sel)} x2={x(sel)} y1={PAD.t} y2={H - PAD.b} stroke={MUTED} />
              <circle cx={x(sel)} cy={y(data[sel].value)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            </> : null}
            <text x={PAD.l} y={H - 6} fontSize={10} fill={MUTED}>{data[0].label}</text>
            <text x={w - PAD.r} y={H - 6} fontSize={10} fill={MUTED} textAnchor="end">{data.at(-1)!.label}</text>
          </svg>
        ) : null}
      </div>
      {hasTarget && targetLabel ? <Legend items={[{ color, label: 'Actual' }, { color: MUTED, label: targetLabel, dashed: true }]} /> : null}
    </Frame>
  );
}

export function Bars({ data, color = INK, unit = '', targetLine, empty, detail, integer }: {
  data: { label: string; value: number; track?: number }[]; color?: string; unit?: string; targetLine?: number; empty: string; detail?: (i: number) => string;
  integer?: boolean;
}) {
  const { w, ref } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  if (!data.length || data.every((d) => !d.value && !d.track)) return <p className="py-4 text-sm text-muted">{empty}</p>;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.value, d.track ?? 0)), targetLine ?? 0), integer);
  const slot = (w - PAD.l - PAD.r) / data.length, bw = Math.max(3, Math.min(26, slot - 2)), base = H - PAD.b;
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  const bar = (i: number, v: number, fill: string, opacity = 1) => {
    const h = Math.max(0, base - y(v)), bx = PAD.l + slot * i + (slot - bw) / 2, r = Math.min(4, bw / 2, h);
    return h > 0 ? <path key={`${fill}${i}`} opacity={opacity} fill={fill}
      d={`M${bx},${base} L${bx},${base - h + r} Q${bx},${base - h} ${bx + r},${base - h} L${bx + bw - r},${base - h} Q${bx + bw},${base - h} ${bx + bw},${base - h + r} L${bx + bw},${base} Z`} /> : null;
  };
  const every = Math.ceil(data.length / 8);
  const s = sel === null ? null : data[sel];
  return (
    <Frame hint="Hover a bar to see its value." readout={s ? <><b>{s.label}</b> · {fmt(s.value)} {unit}{s.track != null ? ` of ${fmt(s.track)}` : ''}{detail ? <span className="text-muted"> · {detail(sel!)}</span> : null}</> : null}>
      <div ref={ref}>
        {w ? (
          <svg width={w} height={H} role="img" aria-label={data.map((d) => `${d.label} ${fmt(d.value)}`).join(', ')}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(data.length - 1, Math.floor((e.clientX - r.left - PAD.l) / slot)))); }}
            onMouseLeave={() => setSel(null)}>
            <Grid width={w} max={max} />
            {data.map((d, i) => (d.track ? bar(i, d.track, SUNK) : null))}
            {data.map((d, i) => bar(i, d.value, color, sel === null || sel === i ? 1 : 0.45))}
            {targetLine ? <line x1={PAD.l} x2={w - PAD.r} y1={y(targetLine)} y2={y(targetLine)} stroke={MUTED} strokeWidth={1.5} strokeDasharray="4 4" /> : null}
            {data.map((d, i) => (i % every === 0 || i === data.length - 1)
              ? <text key={i} x={PAD.l + slot * i + slot / 2} y={H - 6} fontSize={10} fill={MUTED} textAnchor="middle">{d.label}</text> : null)}
          </svg>
        ) : null}
      </div>
    </Frame>
  );
}

export function StackedBars({ data, series, empty }: {
  data: { label: string; parts: number[]; total?: number }[]; series: { label: string; color: string }[]; empty: string;
}) {
  const { w, ref } = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const totals = data.map((d) => Math.max(d.total ?? 0, d.parts.reduce((a, b) => a + b, 0)));
  if (!data.length || totals.every((t) => !t)) return <p className="py-4 text-sm text-muted">{empty}</p>;
  const max = niceMax(Math.max(...totals), true);
  const slot = (w - PAD.l - PAD.r) / data.length, bw = Math.max(4, Math.min(28, slot - 4)), base = H - PAD.b;
  const scale = (v: number) => (H - PAD.t - PAD.b) * (v / max);
  const every = Math.ceil(data.length / 8);
  const s = sel === null ? null : data[sel];
  return (
    <Frame hint="Hover a week to see the breakdown."
      readout={s ? <><b>{s.label}</b> · {series.map((se, i) => `${s.parts[i]} ${se.label.toLowerCase()}`).join(' · ')}{s.total ? <span className="text-muted"> of {s.total} planned</span> : null}</> : null}>
      <div ref={ref}>
        {w ? (
          <svg width={w} height={H} role="img" aria-label="Meals per week"
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(data.length - 1, Math.floor((e.clientX - r.left - PAD.l) / slot)))); }}
            onMouseLeave={() => setSel(null)}>
            <Grid width={w} max={max} />
            {data.map((d, i) => {
              const bx = PAD.l + slot * i + (slot - bw) / 2;
              let top = base;
              return (
                <g key={i} opacity={sel === null || sel === i ? 1 : 0.45}>
                  {d.total ? <rect x={bx} y={base - scale(d.total)} width={bw} height={scale(d.total)} rx={3} fill={SUNK} /> : null}
                  {d.parts.map((v, k) => {
                    if (!v) return null;
                    const h = scale(v), gap = top === base ? 0 : 2;
                    const el = <rect key={k} x={bx} y={top - h + gap} width={bw} height={Math.max(1, h - gap)} rx={2} fill={series[k].color} />;
                    top -= h;
                    return el;
                  })}
                </g>
              );
            })}
            {data.map((d, i) => (i % every === 0 || i === data.length - 1)
              ? <text key={i} x={PAD.l + slot * i + slot / 2} y={H - 6} fontSize={10} fill={MUTED} textAnchor="middle">{d.label}</text> : null)}
          </svg>
        ) : null}
      </div>
      <Legend items={[...series.map((se) => ({ color: se.color, label: se.label })), { color: SUNK, label: 'Not logged' }]} />
    </Frame>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.dashed ? <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />
            : <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}
