/** Shapes returned by the AI Fitness backend's /api/admin routes. */

export type Slot = 'b' | 's' | 'l' | 'd' | 'x';
export type Diet = 'vegan' | 'veg' | 'egg' | 'nonveg';

export interface Food { id: string; c: string; s: Slot; n: string; q: string; k: number; p: number; d: Diet; al: string[] }
export interface Cuisine { id: string; name: string; regions?: string }

export interface MemberSummary {
  id: number; name: string; email: string; createdAt: string; lastWorkout: string | null;
  goal: string | null; diet: Diet | null; cuisine: string | null; weight: number | null; hasPlan: boolean; coachDiet: boolean;
}

export interface Stats { users: number; withPlan: number; coachDiets: number; workouts7d: number; activeUsers7d: number }

export interface Nutrition {
  bmr: number; tdee: number; kcal: number; protein: number; carbs: number; fat: number; waterGlasses: number;
  bmi: number; bmiCategory: string;
}
export type Targets = Partial<Pick<Nutrition, 'kcal' | 'protein' | 'carbs' | 'fat' | 'waterGlasses'>>;

export interface PlanMeal {
  slot: Slot; name: string; minute: number; foodId: string; portion: number;
  custom?: { n: string; q: string; k: number; p: number };
  food: Food; kcal: number; protein: number;
}

export interface Profile {
  name: string; age: number; gender: string; height: number; weight: number; targetWeight?: number | null; units: 'metric' | 'imperial';
  goal: string; activity: string; level: string; location: string; cuisine: string; diet: Diet; meals: number;
  allergies: string[]; conditions: string[]; workoutTime: string; wake: string; sleep: string;
}

export interface MemberDetail {
  user: { id: number; email: string; name: string; createdAt: string };
  profile: Profile | null;
  plan: { nutrition: Nutrition; meals: PlanMeal[][]; coach: { note: string; updatedAt: string } | null; nutritionOverride?: Targets } | null;
  autoNutrition: Nutrition | null;
  logs: {
    /** How each logged meal went; older rows have no status and count as eaten. */
    meals: { date: string; slot_index: number; status?: 'eaten' | 'skipped' | 'cheated'; note?: string | null; kcal?: number | null; protein?: number | null }[];
    water: { date: string; glasses: number }[];
    weights: { date: string; kg: number }[];
    workouts: { id: number; date: string; name: string; mins: number; volume: number; rpe: number | null }[];
  };
}

/** One meal row in the diet editor. `source` decides whether foodId or custom is sent. */
export interface DraftMeal {
  key: string;
  name: string;
  time: string; // HH:MM
  slot: Slot;
  source: 'catalog' | 'custom';
  foodId: string;
  portion: number;
  custom: { n: string; q: string; k: number; p: number };
}

/** Chart data for one member (GET /admin/users/:id/insights). */
export interface Insights {
  range: { from: string; to: string; days: number };
  strength: { id: string; name: string; metric: 'weight' | 'reps'; sessions: number; points: { date: string; weight: number; reps: number; sets: number }[] }[];
  load: { month: string; volume: number; sessions: number; mins: number }[];
  nutrition: { date: string; kcal: number; protein: number; kcalTarget: number; proteinTarget: number; logged: boolean }[];
  adherence: { week: string; planned: number; eaten: number; cheated: number; skipped: number; notLogged: number }[];
  training: { week: string; planned: number; done: number; mins: number }[];
  bodyWeight: { date: string; kg: number }[];
  water: { date: string; glasses: number; target: number }[];
}
