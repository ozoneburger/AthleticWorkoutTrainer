# Vertical Jump Workout App

Local app for reconstructing workout emails into a 24-week vertical jump program.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Privacy

Keep Gmail credentials in `.env`. The file is ignored by git. Do not paste Gmail keys, OAuth secrets, personal emails, names, injury notes, or performance history into chat unless they are anonymized.

Use placeholders such as `[ATHLETE]`, `[COACH]`, `[EMAIL]`, `[DATE]`, `[LOCATION]`, and `[METRIC]` when exporting examples.

## Current Scope

The app can track a provisional vertical jump program, complete sets, edit exercises, save max lifts, and show upcoming workouts. Exact reconstruction requires the workout emails to be imported or pasted in anonymized form.

## Gmail Import

1. Place your Google OAuth desktop credentials at `credentials.json`.
2. Run `npm run gmail:import`.
3. Approve Gmail read-only access in the browser.
4. In the app, click `Load import`.

The importer searches for `subject:"TeamBuildr - Workout Reminder"` and writes ignored local output to `public/imported-workouts.json`.
