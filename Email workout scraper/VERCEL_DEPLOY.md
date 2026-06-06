# Vercel Deploy

## Project Settings

When importing the GitHub repo into Vercel, set:

```text
Root Directory: Email workout scraper
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Environment Variables

Add these Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use the Supabase anon/publishable key. Do not use the Supabase service-role key in Vercel for this frontend app.

Gmail OAuth files stay local-only. Do not upload `credentials.json`, `token.json`, or `public/imported-workouts.json`.

## Supabase Auth Redirects

After Vercel gives you a deployment URL, add it in Supabase:

```text
Authentication > URL Configuration > Site URL
```

Use your production URL, for example:

```text
https://your-project.vercel.app
```

Also add the same URL under redirect URLs. Keep localhost/127.0.0.1 URLs for local testing.

Password confirmation and reset links use these Supabase URL settings. If emails still point to `127.0.0.1`, replace the Site URL with your production URL, then wait for Supabase email rate limits to cool down before sending another link.

For daily phone use, enable email/password auth in:

```text
Authentication > Providers > Email
```

Keep magic links enabled only as a fallback if you want them.

## CLI Deploy Option

From this folder:

```bash
cd "/Users/robertdumagan/AthleticWorkoutTrainer/Email workout scraper"
npx vercel
```

For production:

```bash
npx vercel --prod
```
