# AI Fitness — Admin portal

Web portal for coaches. Find a member by their member number (shown in the app under Profile), see their profile and how well they're sticking to the plan, and write their diet. Saved diets appear in the member's app straight away and replace the automatic meal plan until you switch them back.

## Run it

```bash
npm install
cp .env.example .env      # VITE_API_URL points at the backend, default http://localhost:4000/api
npm run dev               # http://localhost:5174
```

The backend (`ai-fitness-backend-node`) must be running with an admin account configured in its `.env`:

```
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-long-random-password
```

The portal refuses to sign anyone in until both are set.

## What a coach can do

- **Members:** search by member number (`4` or `#4`), name or email. Typing an exact number opens that member.
- **Member page:** profile (goal, body, diet, allergies, health conditions, daily routine), meals ticked over the last 14 days, recent workouts and weight.
- **Diet editor:**
  - Set any day's meals: time, name, type, and either a dish from the catalog (with a portion multiplier) or your own dish with calories and protein.
  - Optionally override the daily targets (calories, protein, carbs, fat, water). Leave a field empty to keep the calculated value.
  - Add a note that the member sees above their meals.
  - Each day shows live calorie and protein totals against the targets. "Copy to all days" repeats one day across the week.
  - By default the dish picker only offers dishes that fit the member's diet and allergies. Turning that off shows everything and flags clashes.
  - **Back to automatic** removes your diet and rebuilds the automatic plan.

While a coach diet is active, the member can't swap meals or change cuisine in the app, and editing their profile keeps your meals.

## Backend API used

All routes are under `/api/admin` and need the token from `POST /api/admin/login`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/admin/login` | `{ email, password }` → `{ token }` (12 h) |
| GET | `/admin/stats` | Member counts and 7-day activity |
| GET | `/admin/users?q=` | Search by number, name or email |
| GET | `/admin/users/:id` | Profile, expanded plan, calculated targets, last 14 days of logs |
| GET | `/admin/foods` | Dish catalog and cuisines |
| PUT | `/admin/users/:id/diet` | `{ days: Meal[7][], targets?, note? }` sets the coach diet |
| DELETE | `/admin/users/:id/diet` | Back to the automatic meal plan |
