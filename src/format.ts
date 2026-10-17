export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Monday-first display order; values are JS weekdays, which is how plans store days. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SLOT_NAMES = { b: 'Breakfast', s: 'Snack', l: 'Lunch', d: 'Dinner', x: 'Protein top-up' } as const;
export const GOAL_NAMES: Record<string, string> = {
  lose: 'Lose fat', muscle: 'Build muscle', strength: 'Get stronger', fit: 'Get fit', maintain: 'Maintain',
};
export const DIET_NAMES: Record<string, string> = { vegan: 'Vegan', veg: 'Vegetarian', egg: 'Eggetarian', nonveg: 'Non-veg' };
export const DIET_RANK: Record<string, number> = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };

/** Minutes after midnight (may exceed 24h for late meals) → "HH:MM". */
export const toHHMM = (minute: number) => {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const memberNo = (id: number) => `#${id}`;
export const shortDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
