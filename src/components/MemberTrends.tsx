import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Insights } from '../types';
import { Card, ErrorBox, Eyebrow, Spinner } from '../ui';
import { Bars, LineTrend, OUTCOME, StackedBars } from './Charts';

type Range = '30' | '90' | '365';
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const monthLabel = (ym: string) => new Date(ym + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short' });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** The member's charts: strength, monthly load, calories, protein, meals, workouts, water, body weight. */
export default function MemberTrends({ memberId, unit, goalKg }: { memberId: number; unit: string; goalKg: number | null }) {
  const [range, setRange] = useState<Range>('30');
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [exercise, setExercise] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null); setError('');
    api.insights(memberId, today(), range).then((d) => live && setData(d)).catch((e) => live && setError((e as Error).message));
    return () => { live = false; };
  }, [memberId, range]);

  const tabs = (
    <div role="tablist" className="flex rounded-full bg-sunk p-1 text-sm font-bold">
      {([['30', '30 days'], ['90', '3 months'], ['365', '12 months']] as [Range, string][]).map(([v, l]) => (
        <button key={v} role="tab" aria-selected={range === v} onClick={() => setRange(v)}
          className={`rounded-full px-4 py-1.5 ${range === v ? 'bg-surface shadow-sm' : 'text-muted'}`}>{l}</button>
      ))}
    </div>
  );

  const head = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1"><Eyebrow>Trends</Eyebrow><h2 className="font-display text-3xl uppercase leading-none">Progress over time</h2></div>
      {tabs}
    </div>
  );
  if (error) return <Card className="grid gap-4">{head}<ErrorBox>{error}</ErrorBox></Card>;
  if (!data) return <Card className="grid gap-4">{head}<Spinner label="Loading charts…" /></Card>;

  const ex = data.strength.find((s) => s.id === exercise) ?? data.strength[0];
  const logged = data.nutrition.filter((n) => n.logged);
  const meals = data.adherence.reduce((t, a) => ({ eaten: t.eaten + a.eaten, planned: t.planned + a.planned }), { eaten: 0, planned: 0 });

  return (
    <Card className="grid gap-5">
      {head}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Body weight" note={bodyNote(data.bodyWeight, goalKg)}>
          <LineTrend fitRange data={data.bodyWeight.map((b) => ({ label: dayLabel(b.date), value: b.kg, target: goalKg }))} color="#0B0B0C" unit="kg"
            targetLabel={goalKg != null ? 'Goal' : undefined} empty="Needs two or more weigh-ins." />
        </Panel>

        <Panel title="Strength" note={ex ? (ex.metric === 'weight' ? `heaviest set, ${unit}` : 'most reps in a set') : ''}>
          {data.strength.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {data.strength.slice(0, 10).map((s) => (
                  <button key={s.id} onClick={() => setExercise(s.id)} aria-pressed={s.id === ex?.id}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${s.id === ex?.id ? 'bg-ink text-white' : 'bg-sunk'}`}>{s.name}</button>
                ))}
              </div>
              <LineTrend data={ex.points.map((p) => ({ label: dayLabel(p.date), value: ex.metric === 'weight' ? p.weight : p.reps }))}
                color="#FF4F00" unit={ex.metric === 'weight' ? unit : 'reps'} empty="Needs two or more sessions of this exercise." />
            </>
          ) : <p className="text-sm text-muted">No sets logged yet.</p>}
        </Panel>

        <Panel title="Training load by month" note={`${unit} lifted · last 12 months`}>
          <Bars data={data.load.map((m) => ({ label: monthLabel(m.month), value: m.volume }))} unit={unit}
            detail={(k) => `${data.load[k].sessions} sessions · ${data.load[k].mins} min`} empty="No workouts logged yet." />
        </Panel>

        <Panel title="Calories" note={`avg ${Math.round(avg(logged.map((n) => n.kcal))).toLocaleString()} kcal on logged days`}>
          <LineTrend data={logged.map((n) => ({ label: dayLabel(n.date), value: n.kcal, target: n.kcalTarget }))} color="#FF4F00" unit="kcal" targetLabel="Target"
            empty="Not enough logged days yet." />
        </Panel>

        <Panel title="Protein" note={`avg ${Math.round(avg(logged.map((n) => n.protein)))} g on logged days`}>
          <LineTrend data={logged.map((n) => ({ label: dayLabel(n.date), value: n.protein, target: n.proteinTarget }))} color="#00A36C" unit="g" targetLabel="Target"
            empty="Not enough logged days yet." />
        </Panel>

        <Panel title="Meals" note={meals.planned ? `${Math.round((meals.eaten / meals.planned) * 100)}% eaten as planned` : ''}>
          <StackedBars data={data.adherence.map((a) => ({ label: dayLabel(a.week), parts: [a.eaten, a.cheated, a.skipped], total: a.planned }))}
            series={[{ label: 'Eaten', color: OUTCOME.eaten }, { label: 'Cheated', color: OUTCOME.cheated }, { label: 'Skipped', color: OUTCOME.skipped }]}
            empty="No meals logged yet." />
        </Panel>

        <Panel title="Workouts" note={`${data.training.reduce((s, t) => s + t.done, 0)} of ${data.training.reduce((s, t) => s + t.planned, 0)} planned sessions`}>
          <Bars integer data={data.training.map((t) => ({ label: dayLabel(t.week), value: t.done, track: t.planned }))} unit="sessions"
            detail={(k) => `${data.training[k].mins} min`} empty="No sessions yet." />
        </Panel>


        <Panel title="Water" note={`avg ${avg(data.water.map((d) => d.glasses)).toFixed(1)} glasses a day`}>
          <Bars integer data={data.water.map((d) => ({ label: dayLabel(d.date), value: d.glasses }))} color="#0A7CFF" unit="glasses"
            targetLine={data.water.at(-1)?.target} empty="No water logged yet." />
        </Panel>
      </div>
    </Card>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-2 rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-2"><h3 className="font-bold">{title}</h3><span className="text-xs text-muted">{note}</span></div>
      {children}
    </section>
  );
}

/** "82.4 kg · ▼ 1.6 kg this period · 4.4 kg to goal" */
function bodyNote(points: { kg: number }[], goal: number | null) {
  if (!points.length) return 'kg';
  const last = points.at(-1)!.kg, change = Math.round((last - points[0].kg) * 10) / 10;
  const parts = [`${last} kg`];
  if (points.length > 1) parts.push(change === 0 ? 'no change' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)} kg this period`);
  if (goal != null) parts.push(`${Math.abs(Math.round((last - goal) * 10) / 10)} kg to goal`);
  return parts.join(' · ');
}
