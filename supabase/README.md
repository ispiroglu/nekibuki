# Supabase setup for Nekibuki

Nekibuki works without Supabase (demo mode, everything on the device). Add Supabase when you
want real Google sign-in and a synced history.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates the `profiles` and
   `analyses` tables, row-level security, and the public `captures` storage bucket.

## 2. Google sign-in

1. In Google Cloud Console → **APIs & Services → Credentials**, create an **OAuth client ID**
   (Web application).
2. Authorised redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Authorised JavaScript origins:
   - `http://localhost:5173`
   - `https://<your-worker-domain>.workers.dev`
4. In Supabase → **Authentication → Providers → Google**, paste the client ID and secret.
5. In Supabase → **Authentication → URL configuration**, add the site URLs and redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://<your-worker-domain>.workers.dev/auth/callback`

## 3. Client environment

Create `.env` next to `package.json`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_AUTH_MODE=supabase
VITE_MOCK_ANALYSIS=false
```

## 4. Worker (edge) verification

The Worker only opens `/api/analyze` and `/api/chat` to signed-in users when Supabase is
configured. Add the same public values to `.dev.vars` (and to Worker secrets in production):

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
```

The Worker verifies the caller's bearer token against `GET /auth/v1/user`. Nothing else is
stored on the Worker.
