# Supabase Sync Setup

This app can run local-only without Supabase. To enable account sync across phone and laptop:

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. Copy `.env.example` to `.env`.
5. Set:

```text
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Use the anon/publishable key only. Do not put the service-role key in this app.

6. Restart the dev server:

```bash
npm run dev
```

## Auth Settings

In Supabase, open `Authentication > Providers > Email` and enable email/password sign-in. Magic links can stay enabled as a fallback, but password login is the normal daily phone flow.

Recommended security settings:

- Keep email confirmation enabled for new accounts.
- Set a minimum password length of at least 8 characters.
- Enable leaked password protection if it is available in your Supabase project.
- Use the anon/publishable key only. Never put the service-role key in this frontend app or in Vercel.

In `Authentication > URL Configuration`, set the production Site URL and redirect URLs to your deployed app, for example:

```text
https://jumptrainer.vercel.app
```

Keep local URLs like `http://127.0.0.1:5174` only for local testing. If the Site URL is left as localhost, confirmation and password reset emails will open a phone-unreachable address.

When Supabase is configured, the app shows password sign-in, account creation, password reset, and a magic-link fallback. On first login, it offers to import the current browser's local profile, program, readiness data, skipped notes, and logged working weights into the account.

Gmail import remains a local dev-only tool. `credentials.json`, `token.json`, and `public/imported-workouts.json` should stay uncommitted.
