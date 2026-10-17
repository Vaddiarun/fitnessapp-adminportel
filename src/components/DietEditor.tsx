import { CheckCircle2, Copy, CopyPlus, Plus, RotateCcw, Save, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, type DietMealInput } from '../api';
import { DAYS, DAYS_LONG, DIET_NAMES, DIET_RANK, SLOT_NAMES, WEEK_ORDER, toHHMM } from '../format';
import type { Cuisine, DraftMeal, Food, MemberDetail, PlanMeal, Slot, Targets } from '../types';
import { Button, Card, ErrorBox, Eyebrow, Input, Pill, Select } from '../ui';

type TargetKey = keyof Targets;
/**
 * Targets the coach can set. Calories and protein aren't here on purpose: in the member's app those rings
 * follow the meals of each day, so eating the whole plan fills them exactly.
 */
const TARGET_FIELDS: [TargetKey, string, string][] = [
  ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g'], ['waterGlasses', 'Water', 'glasses'],
];

let nextKey = 0;
const key = () => `m${nextKey++}`;

function fromPlan(m: PlanMeal): DraftMeal {
  return {
    key: key(), name: m.name, time: toHHMM(m.minute), slot: m.slot, portion: m.portion,
    source: m.custom ? 'custom' : 'catalog',
    foodId: m.custom ? '' : m.foodId,
    custom: m.custom ?? { n: '', q: '', k: 0, p: 0 },
  };
}
const blankMeal = (slot: Slot = 'b'): DraftMeal => ({
  key: key(), name: SLOT_NAMES[slot], time: { b: '08:00', s: '16:00', l: '13:00', d: '20:00', x: '19:00' }[slot], slot,
  source: 'catalog', foodId: '', portion: 1, custom: { n: '', q: '', k: 0, p: 0 },
});

/** kcal and protein for one draft row, from the catalog dish or the coach's own numbers. */
function totalsOf(m: DraftMeal, byId: Map<string, Food>) {
  if (m.source === 'custom') return { kcal: Math.round(m.custom.k * m.portion), protein: Math.round(m.custom.p * m.portion) };
  const f = byId.get(m.foodId);
  return f ? { kcal: Math.round(f.k * m.portion), protein: Math.round(f.p * m.portion) } : { kcal: 0, protein: 0 };
}

export default function DietEditor({ detail, foods, cuisines, onSaved }: {
  detail: MemberDetail; foods: Food[]; cuisines: Cuisine[]; onSaved: () => void;
}) {
  const plan = detail.plan!, profile = detail.profile!, auto = detail.autoNutrition!;
  const initial = useMemo(() => ({
    days: plan.meals.map((day) => day.map(fromPlan)),
    targets: Object.fromEntries(TARGET_FIELDS.map(([k]) => [k, plan.nutritionOverride?.[k] != null ? String(plan.nutritionOverride[k]) : ''])) as Record<TargetKey, string>,
    note: plan.coach?.note ?? '',
  }), [plan]);

  const [days, setDays] = useState<DraftMeal[][]>(initial.days);
  const [targets, setTargets] = useState(initial.targets);
  const [note, setNote] = useState(initial.note);
  const [day, setDay] = useState(1);
  const [fitsOnly, setFitsOnly] = useState(true);
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const cuisineName = (id: string) => (id === 'all' ? 'Any cuisine' : cuisines.find((c) => c.id === id)?.name ?? id);
  const dirty = JSON.stringify({ days: days.map((d) => d.map(({ key: _k, ...m }) => m)), targets, note })
    !== JSON.stringify({ days: initial.days.map((d) => d.map(({ key: _k, ...m }) => m)), targets: initial.targets, note: initial.note });

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Dishes offered in the picker: by default only those that fit the member's diet and allergies. */
  const fits = (f: Food) => DIET_RANK[f.d] <= DIET_RANK[profile.diet] && !f.al.some((a) => profile.allergies.includes(a));
  /** Why a dish doesn't fit, in plain words. */
  const clashOf = (f: Food) => {
    const parts: string[] = [];
    if (DIET_RANK[f.d] > DIET_RANK[profile.diet]) parts.push(`it’s ${DIET_NAMES[f.d].toLowerCase()} but they’re ${DIET_NAMES[profile.diet].toLowerCase()}`);
    const hits = f.al.filter((a) => profile.allergies.includes(a));
    if (hits.length) parts.push(`it contains ${hits.join(', ')}, which they avoid`);
    return `Check this dish: ${parts.join(' and ')}.`;
  };
  const pickable = useMemo(() => {
    const list = foods.filter((f) => !fitsOnly || fits(f));
    // The member's own cuisine first, then everything else alphabetically.
    return list.sort((a, b) => Number(b.c === profile.cuisine) - Number(a.c === profile.cuisine) || a.n.localeCompare(b.n));
  }, [foods, fitsOnly, profile]);

  const dayTotals = (list: DraftMeal[]) => list.reduce((t, m) => { const x = totalsOf(m, byId); return { kcal: t.kcal + x.kcal, protein: t.protein + x.protein }; }, { kcal: 0, protein: 0 });
  const status = (list: DraftMeal[]) => {
    const t = dayTotals(list);
    return { ...t, proteinOk: t.protein >= auto.protein * 0.95, kcalOk: Math.abs(t.kcal - auto.kcal) <= auto.kcal * 0.1 };
  };

  const edit = (d: number, k: string, patch: Partial<DraftMeal>) =>
    setDays((all) => all.map((list, i) => (i === d ? list.map((m) => (m.key === k ? { ...m, ...patch } : m)) : list)));
  const editCustom = (d: number, k: string, patch: Partial<DraftMeal['custom']>) =>
    setDays((all) => all.map((list, i) => (i === d ? list.map((m) => (m.key === k ? { ...m, custom: { ...m.custom, ...patch } } : m)) : list)));
  const remove = (d: number, k: string) => setDays((all) => all.map((list, i) => (i === d ? list.filter((m) => m.key !== k) : list)));
  const duplicate = (d: number, m: DraftMeal) => setDays((all) => all.map((list, i) => (i === d ? [...list, { ...m, key: key() }] : list)));
  const add = (d: number) => setDays((all) => all.map((list, i) => (i === d ? [...list, blankMeal(list.length ? 's' : 'b')] : list)));
  const copyToAll = () => {
    if (!window.confirm(`Replace every other day with ${DAYS_LONG[day]}’s meals?`)) return;
    setDays((all) => all.map((_, i) => (i === day ? all[day] : all[day].map((m) => ({ ...m, key: key() })))));
  };
  const discard = () => { setDays(initial.days); setTargets(initial.targets); setNote(initial.note); setError(''); };

  /** First problem that would stop a save, phrased for the coach. */
  const problem = () => {
    for (const d of WEEK_ORDER) {
      if (!days[d].length) return `${DAYS_LONG[d]} has no meals.`;
      if (days[d].length > 8) return `${DAYS_LONG[d]} has more than 8 meals.`;
      for (const m of days[d]) {
        if (!m.name.trim()) return `${DAYS_LONG[d]}: every meal needs a name.`;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) return `${DAYS_LONG[d]}: “${m.name}” needs a time like 08:30.`;
        if (m.source === 'catalog' && !m.foodId) return `${DAYS_LONG[d]}: pick a dish for “${m.name}”.`;
        if (m.source === 'custom' && (!m.custom.n.trim() || !(m.custom.k > 0))) return `${DAYS_LONG[d]}: “${m.name}” needs a dish name and calories.`;
      }
    }
    return '';
  };

  const save = async () => {
    const p = problem();
    setError(p); setSaved('');
    if (p) return;
    const payload: DietMealInput[][] = days.map((list) => list.map((m) => ({
      name: m.name.trim(), time: m.time, slot: m.slot, portion: m.portion,
      ...(m.source === 'custom' ? { custom: { ...m.custom, n: m.custom.n.trim(), q: m.custom.q.trim() } } : { foodId: m.foodId }),
    })));
    const t = Object.fromEntries(TARGET_FIELDS.filter(([k]) => targets[k] !== '').map(([k]) => [k, Number(targets[k])])) as Targets;
    setBusy('save');
    try {
      await api.saveDiet(detail.user.id, payload, Object.keys(t).length ? t : undefined, note.trim());
      setSaved('Saved. The member sees this plan the next time their app refreshes.');
      onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const reset = async () => {
    if (!window.confirm('Go back to the automatic meal plan? Your meals, targets and note for this member will be removed.')) return;
    setBusy('reset'); setError(''); setSaved('');
    try { await api.resetDiet(detail.user.id); onSaved(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const list = days[day];
  const s = status(list);

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <Eyebrow>Diet plan</Eyebrow>
          <h2 className="font-display text-3xl uppercase leading-none">Set {detail.user.name.split(' ')[0]}’s meals</h2>
          <p className="max-w-2xl text-sm text-muted">Edit any day, then save. The member’s app shows exactly these meals and targets, and swapping is turned off for them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.coach ? <Button variant="danger" onClick={reset} loading={busy === 'reset'} icon={<RotateCcw className="h-4 w-4" />}>Back to automatic</Button> : null}
          {dirty ? <Button variant="ghost" onClick={discard}>Discard changes</Button> : null}
          <Button variant="accent" onClick={save} loading={busy === 'save'} disabled={!dirty && !!plan.coach} icon={<Save className="h-4 w-4" />}>
            {plan.coach ? 'Save changes' : 'Save as coach diet'}
          </Button>
        </div>
      </div>

      {/* Targets: empty means "use the automatic number" shown as the placeholder. */}
      <div className="grid gap-2">
        <Eyebrow>Other daily targets <span className="normal-case tracking-normal">· leave empty to use the calculated value</span></Eyebrow>
        <p className="text-xs text-muted">Calories and protein in the member’s app follow the meals you set for each day, so the rings fill exactly when they eat the whole plan.
          Recommended for them: <span className="font-bold text-ink">{auto.kcal.toLocaleString()} kcal · {auto.protein} g protein</span> a day.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TARGET_FIELDS.map(([k, label, unit]) => (
            <Input key={k} label={`${label} (${unit})`} type="number" inputMode="numeric" value={targets[k]} placeholder={`${auto[k]} auto`}
              onChange={(e) => setTargets((t) => ({ ...t, [k]: e.target.value }))} />
          ))}
        </div>
      </div>

      <label className="grid gap-1 text-xs font-bold text-muted">
        Note to the member (shown above their meals)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
          placeholder="e.g. Keep dinner light and finish eating by 8:30 PM. Add a protein shake after workouts."
          className="rounded-xl border border-line px-3 py-2 text-sm font-normal text-ink outline-none focus:border-ink" />
      </label>

      {/* Week overview: each day's totals against the targets. */}
      <div role="tablist" aria-label="Day" className="grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((d) => {
          const st = status(days[d]), on = d === day;
          return (
            <button key={d} role="tab" aria-selected={on} onClick={() => setDay(d)}
              className={`grid gap-0.5 rounded-xl px-1 py-2 text-center transition ${on ? 'bg-ink text-white' : 'bg-sunk hover:bg-line'}`}>
              <span className="text-sm font-bold">{DAYS[d]}</span>
              <span className={`text-[11px] font-semibold ${on ? 'text-white/75' : 'text-muted'}`}>{st.kcal} kcal</span>
              <span className={`text-[11px] font-bold ${st.proteinOk ? (on ? 'text-emerald-300' : 'text-good') : on ? 'text-orange-300' : 'text-accent'}`}>{st.protein} g P</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-display text-2xl uppercase">{DAYS_LONG[day]}</span>
          <Pill tone={s.kcalOk ? 'good' : 'warn'}>{s.kcal.toLocaleString()} kcal <span className="font-normal opacity-70">· rec. {auto.kcal.toLocaleString()}</span></Pill>
          <Pill tone={s.proteinOk ? 'good' : 'warn'}>{s.protein} g protein <span className="font-normal opacity-70">· rec. {auto.protein}</span></Pill>
          {s.kcalOk && s.proteinOk ? <span className="inline-flex items-center gap-1 text-xs font-bold text-good"><CheckCircle2 className="h-4 w-4" />Matches what’s recommended</span>
            : <span className="inline-flex items-center gap-1 text-xs font-bold text-warn"><TriangleAlert className="h-4 w-4" />{!s.proteinOk ? 'Less protein than recommended' : 'Calories differ from recommended by over 10%'}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-muted">
            <input type="checkbox" checked={fitsOnly} onChange={(e) => setFitsOnly(e.target.checked)} className="h-4 w-4 accent-[#FF4F00]" />
            Only dishes that fit their diet & allergies
          </label>
          <Button variant="ghost" onClick={copyToAll} icon={<CopyPlus className="h-4 w-4" />}>Copy to all days</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {list.map((m) => {
          const t = totalsOf(m, byId);
          const f = m.source === 'catalog' ? byId.get(m.foodId) : undefined;
          const unsafe = f && !fits(f);
          return (
            <div key={m.key} className="grid gap-3 rounded-2xl border border-line p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[110px_1fr_160px_auto]">
                <Input label="Time" type="time" value={m.time} onChange={(e) => edit(day, m.key, { time: e.target.value })} />
                <Input label="Meal name" value={m.name} maxLength={40} onChange={(e) => edit(day, m.key, { name: e.target.value })} />
                <Select label="Type" value={m.slot} onChange={(e) => edit(day, m.key, { slot: e.target.value as Slot })}>
                  {(Object.keys(SLOT_NAMES) as Slot[]).map((sl) => <option key={sl} value={sl}>{SLOT_NAMES[sl]}</option>)}
                </Select>
                <div className="col-span-2 flex items-end gap-1 md:col-span-1">
                  <button onClick={() => duplicate(day, m)} title="Duplicate meal" aria-label="Duplicate meal" className="rounded-full p-2.5 text-muted hover:bg-sunk hover:text-ink"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => remove(day, m.key)} title="Remove meal" aria-label="Remove meal" className="rounded-full p-2.5 text-muted hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex gap-1 rounded-full bg-sunk p-1 text-xs font-bold sm:w-fit" role="radiogroup" aria-label="Dish source">
                {(['catalog', 'custom'] as const).map((src) => (
                  <button key={src} role="radio" aria-checked={m.source === src} onClick={() => edit(day, m.key, { source: src })}
                    className={`flex-1 rounded-full px-3 py-1.5 sm:flex-none ${m.source === src ? 'bg-surface shadow-sm' : 'text-muted'}`}>
                    {src === 'catalog' ? 'Pick from catalog' : 'Write my own'}
                  </button>
                ))}
              </div>

              {m.source === 'catalog' ? (
                <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                  <Select label="Dish" value={m.foodId} onChange={(e) => edit(day, m.key, { foodId: e.target.value })}>
                    <option value="">Choose a dish…</option>
                    {f && !pickable.includes(f) ? <option value={f.id}>{f.n} (doesn’t fit their diet)</option> : null}
                    {(Object.keys(SLOT_NAMES) as Slot[]).map((sl) => (
                      <optgroup key={sl} label={SLOT_NAMES[sl]}>
                        {pickable.filter((x) => x.s === sl).map((x) => (
                          <option key={x.id} value={x.id}>{x.n} — {x.k} kcal · {x.p} g · {cuisineName(x.c)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                  <Input label="Portion (×)" type="number" step="0.25" min="0.25" max="5" value={m.portion}
                    onChange={(e) => edit(day, m.key, { portion: Number(e.target.value) || 1 })} />
                  <Totals {...t} />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-[1fr_150px_100px_100px_100px_auto]">
                  <Input label="Dish" value={m.custom.n} maxLength={120} placeholder="e.g. Paneer bhurji with 2 rotis" onChange={(e) => editCustom(day, m.key, { n: e.target.value })} />
                  <Input label="Quantity" value={m.custom.q} maxLength={80} placeholder="1 plate" onChange={(e) => editCustom(day, m.key, { q: e.target.value })} />
                  <Input label="kcal" type="number" min="0" value={m.custom.k || ''} onChange={(e) => editCustom(day, m.key, { k: Number(e.target.value) })} />
                  <Input label="Protein (g)" type="number" min="0" value={m.custom.p || ''} onChange={(e) => editCustom(day, m.key, { p: Number(e.target.value) })} />
                  <Input label="Portion (×)" type="number" step="0.25" min="0.25" max="5" value={m.portion} onChange={(e) => edit(day, m.key, { portion: Number(e.target.value) || 1 })} />
                  <Totals {...t} />
                </div>
              )}
              {unsafe ? <p className="flex items-center gap-1.5 text-xs font-bold text-warn"><TriangleAlert className="h-4 w-4" />{clashOf(f!)}</p> : null}
            </div>
          );
        })}
        <button onClick={() => add(day)} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-3 text-sm font-bold text-muted hover:border-ink hover:text-ink">
          <Plus className="h-4 w-4" /> Add a meal to {DAYS_LONG[day]}
        </button>
      </div>

      <ErrorBox>{error}</ErrorBox>
      {saved ? <p role="status" className="flex items-center gap-2 rounded-xl bg-good-soft px-3 py-2 text-sm font-bold text-good"><CheckCircle2 className="h-4 w-4" />{saved}</p> : null}
      {dirty ? <p className="text-xs font-bold text-warn">You have unsaved changes.</p> : null}
    </Card>
  );
}

const Totals = ({ kcal, protein }: { kcal: number; protein: number }) => (
  <div className="flex items-end gap-3 pb-2 text-sm">
    <span><span className="font-display text-2xl">{kcal}</span> <span className="text-muted">kcal</span></span>
    <span><span className="font-display text-2xl">{protein}</span> <span className="text-muted">g P</span></span>
  </div>
);
