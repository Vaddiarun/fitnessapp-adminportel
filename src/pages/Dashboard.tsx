import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { DIET_NAMES, GOAL_NAMES, memberNo, shortDate } from '../format';
import type { MemberSummary, Stats } from '../types';
import { Button, Card, ErrorBox, Eyebrow, Pill, Spinner, Title } from '../ui';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [members, setMembers] = useState<MemberSummary[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = async (query: string) => {
    setError('');
    try {
      const r = await api.members(query);
      setMembers(r.users);
      // A member number that matches exactly opens straight away.
      const n = query.trim().replace(/^#/, '');
      if (/^\d+$/.test(n) && r.users.length === 1 && String(r.users[0].id) === n) navigate(`/members/${n}`);
    } catch (e) { setError((e as Error).message); }
  };

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError((e as Error).message));
    api.members().then((r) => setMembers(r.users)).catch((e) => setError((e as Error).message));
  }, []);

  const submit = (e: FormEvent) => { e.preventDefault(); load(q); };

  const tiles: [string, number | undefined][] = [
    ['Members', stats?.users], ['With a plan', stats?.withPlan], ['Coach diets', stats?.coachDiets],
    ['Active (7 days)', stats?.activeUsers7d], ['Workouts (7 days)', stats?.workouts7d],
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-1"><Eyebrow>Overview</Eyebrow><Title>Members</Title></div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="font-display text-4xl leading-none">{value ?? '–'}</p>
            <Eyebrow className="pt-1">{label}</Eyebrow>
          </Card>
        ))}
      </div>

      <Card className="grid gap-4">
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-line px-4 focus-within:border-ink">
            <Search className="h-4 w-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Member number (e.g. 4), name or email"
              aria-label="Search members" className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <Button type="submit">Search</Button>
          {q ? <Button type="button" variant="ghost" onClick={() => { setQ(''); load(''); }}>Clear</Button> : null}
        </form>
        <ErrorBox>{error}</ErrorBox>

        {!members ? <Spinner /> : members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No members match “{q}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
                  <th className="py-2 pr-3">No.</th><th className="py-2 pr-3">Member</th><th className="py-2 pr-3">Goal</th>
                  <th className="py-2 pr-3">Diet</th><th className="py-2 pr-3">Meal plan</th><th className="py-2 pr-3">Last workout</th><th />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0 hover:bg-bg">
                    <td className="py-3 pr-3 font-display text-xl">{memberNo(m.id)}</td>
                    <td className="py-3 pr-3"><div className="font-bold">{m.name}</div><div className="text-xs text-muted">{m.email}</div></td>
                    <td className="py-3 pr-3">{m.goal ? GOAL_NAMES[m.goal] : '—'}</td>
                    <td className="py-3 pr-3">{m.diet ? DIET_NAMES[m.diet] : '—'}</td>
                    <td className="py-3 pr-3">{!m.hasPlan ? <Pill tone="warn">No profile yet</Pill> : m.coachDiet ? <Pill tone="accent">Coach diet</Pill> : <Pill>Automatic</Pill>}</td>
                    <td className="py-3 pr-3">{shortDate(m.lastWorkout)}</td>
                    <td className="py-3 text-right">
                      <Link to={`/members/${m.id}`} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-bold hover:bg-sunk" aria-label={`Open member ${m.id}`}>
                        Open <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
