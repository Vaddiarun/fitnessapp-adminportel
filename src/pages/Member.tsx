import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import DietEditor from '../components/DietEditor';
import { DAYS, DIET_NAMES, GOAL_NAMES, memberNo, shortDate } from '../format';
import type { Cuisine, Food, MemberDetail } from '../types';
import { Card, ErrorBox, Eyebrow, Pill, Spinner, Title } from '../ui';

export default function Member() {
  const id = Number(useParams().id);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setDetail(await api.member(id)); } catch (e) { setError((e as Error).message); }
  }, [id]);

  useEffect(() => {
    load();
    api.foods().then((r) => { setFoods(r.foods); setCuisines(r.cuisines); }).catch((e) => setError((e as Error).message));
  }, [load]);

  if (!detail) return error ? <div className="grid gap-4"><Back /><ErrorBox>{error}</ErrorBox></div> : <Spinner />;
  const { user, profile, plan } = detail;
  const cuisineName = (cid?: string) => cuisines.find((c) => c.id === cid)?.name ?? cid ?? '—';

  return (
    <div className="grid gap-5">
      <Back />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <Eyebrow>Member {memberNo(user.id)} · joined {shortDate(user.createdAt)}</Eyebrow>
          <Title>{user.name}</Title>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan ? (plan.coach ? <Pill tone="accent">Coach diet · updated {shortDate(plan.coach.updatedAt)}</Pill> : <Pill>Automatic meal plan</Pill>) : null}
        </div>
      </div>
      <ErrorBox>{error}</ErrorBox>

      {!profile || !plan ? (
        <Card><p className="text-sm">This member hasn’t finished onboarding yet, so there’s no plan to edit. Ask them to complete their profile in the app.</p></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="grid gap-3">
              <Eyebrow>Profile</Eyebrow>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted">Goal</dt><dd className="font-bold">{GOAL_NAMES[profile.goal] ?? profile.goal}</dd>
                <dt className="text-muted">Body</dt><dd className="font-bold">{profile.age} y · {profile.gender} · {profile.height} cm · {profile.weight} kg{profile.targetWeight ? ` → ${profile.targetWeight} kg` : ''}</dd>
                <dt className="text-muted">BMI</dt><dd className="font-bold">{plan.nutrition.bmi} ({plan.nutrition.bmiCategory})</dd>
                <dt className="text-muted">Food</dt><dd className="font-bold">{DIET_NAMES[profile.diet]} · {cuisineName(profile.cuisine)}</dd>
                <dt className="text-muted">Avoids</dt><dd className="font-bold">{profile.allergies.length ? profile.allergies.join(', ') : 'Nothing'}</dd>
                <dt className="text-muted">Health</dt><dd className="font-bold">{profile.conditions.length ? profile.conditions.join(', ') : 'None reported'}</dd>
                <dt className="text-muted">Day</dt><dd className="font-bold">Wakes {profile.wake} · trains {profile.workoutTime} · sleeps {profile.sleep}</dd>
              </dl>
            </Card>
            <Adherence detail={detail} />
            <Card className="grid content-start gap-3">
              <Eyebrow>Recent workouts</Eyebrow>
              {detail.logs.workouts.length ? detail.logs.workouts.slice(0, 6).map((w) => (
                <div key={w.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span><span className="font-bold">{w.name}</span> <span className="text-muted">· {shortDate(w.date)}</span></span>
                  <span className="text-muted">{w.mins} min{w.rpe ? ` · ${w.rpe}/10` : ''}</span>
                </div>
              )) : <p className="text-sm text-muted">No workouts logged yet.</p>}
              {detail.logs.weights.length ? (
                <p className="border-t border-line pt-2 text-sm">Weight: <span className="font-bold">{detail.logs.weights.at(-1)!.kg} kg</span>
                  <span className="text-muted"> on {shortDate(detail.logs.weights.at(-1)!.date)} · started {detail.logs.weights[0].kg} kg</span></p>
              ) : null}
            </Card>
          </div>

          <DietEditor key={plan.coach?.updatedAt ?? 'auto'} detail={detail} foods={foods} cuisines={cuisines} onSaved={load} />
        </>
      )}
    </div>
  );
}

const Back = () => (
  <Link to="/" className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-muted hover:bg-sunk hover:text-ink">
    <ArrowLeft className="h-4 w-4" /> All members
  </Link>
);

/** Last 14 days: how many planned meals they ticked each day. */
function Adherence({ detail }: { detail: MemberDetail }) {
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 13 + i);
    return { iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, weekday: d.getDay() };
  });
  const ticked = (iso: string) => detail.logs.meals.filter((m) => m.date === iso).length;
  const planned = (weekday: number) => detail.plan?.meals[weekday].length ?? 0;
  const rate = Math.round((dates.reduce((s, d) => s + Math.min(ticked(d.iso), planned(d.weekday)), 0) /
    Math.max(1, dates.reduce((s, d) => s + planned(d.weekday), 0))) * 100);

  return (
    <Card className="grid content-start gap-3">
      <div className="flex items-baseline justify-between"><Eyebrow>Meals ticked · 14 days</Eyebrow><span className="font-display text-3xl">{rate}%</span></div>
      <div className="grid grid-cols-7 gap-1.5">
        {dates.map((d) => {
          const t = ticked(d.iso), p = planned(d.weekday), full = p > 0 && t >= p;
          return (
            <div key={d.iso} title={`${d.iso}: ${t}/${p} meals`} className={`grid place-items-center rounded-lg py-1.5 text-[11px] font-bold ${full ? 'bg-good text-white' : t ? 'bg-good-soft text-good' : 'bg-sunk text-muted'}`}>
              <span>{DAYS[d.weekday][0]}</span><span>{t}/{p}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Members tick meals on their Today screen. Green means every planned meal was ticked.</p>
    </Card>
  );
}
