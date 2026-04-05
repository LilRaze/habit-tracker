# Supabase + Google sign-in (alpha)

This app uses **Supabase Auth (Google OAuth)** and a **single-row-per-user** table `habit_user_state` for cloud saves. **Row Level Security (RLS)** ensures each user only reads/writes their own rows.

## 1. Create a Supabase project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **New project**.
2. Note **Project URL** and **anon public** key: **Project Settings → API**.

## 2. Run the database migration

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of `supabase/migrations/001_initial.sql` and run it.
3. Confirm tables `profiles` and `habit_user_state` exist under **Table Editor**.

## 3. Configure Google OAuth

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials**.
2. **Create credentials → OAuth client ID** (if needed, configure OAuth consent screen first).
3. Application type: **Web application**.
4. **Authorized JavaScript origins**:
   - `http://localhost:5173` (Vite dev)
   - Your production origin, e.g. `https://yourdomain.com`
5. **Authorized redirect URIs** — add **both**:
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - (Optional for local testing) same as above is enough; Supabase handles the callback.

Copy the **Client ID** and **Client Secret**.

### Supabase Dashboard

1. **Authentication → Providers → Google**.
2. Enable **Google**, paste **Client ID** and **Client Secret**.
3. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` for dev, or your production URL.
   - **Redirect URLs**: add `http://localhost:5173/**` and your production URL with `/**` if needed.

## 4. App environment variables

1. Copy `.env.example` to `.env.local` in the project root.
2. Set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...anon...key
```

3. Restart `npm run dev` after changes.

Without these variables, the app runs **local-only** (AuthBar shows “Sign-in unavailable”).

## 5. Verify

1. `npm run dev` → **Continue with Google** → complete OAuth → return to the app.
2. Data should show **Saved to cloud** when sync succeeds.
3. Change a habit on one browser; open another (or incognito after sign-in) to confirm persistence.

## Future: friends & rank comparison

Suggested next tables (not created yet):

- `friendships` — `(user_id, friend_id, status, created_at)` with RLS so users only see rows they participate in.
- Optional `public_profiles` or `profiles.is_public` + policy to expose display name / avatar for accepted friends only.
- Rank is **derived** from `habit_user_state.completions` (same as local app); for leaderboards you can either compute in the client or add a **materialized** `rank_snapshot` updated on write (still no change to rank **math**).

## Risks / notes

- **Conflict**: If both device and cloud have real progress, the app shows a one-time choice: **Use account (recommended)** vs **Use this device** (overwrites cloud).
- **Dev-only fields**: `test_rank_override` and `time_offset_months` are **not** synced from the cloud to the device; every upsert sends `null` and `0` for those columns so internal test tools stay **device-local**. Legacy values in old rows are ignored on read.

## Reliability

- Debounced cloud saves (~1.6s). If a save is **still pending** (within the debounce window), it is **flushed immediately** when the tab becomes hidden (`visibilitychange`), on `pagehide`, or on `beforeunload` (best-effort; browsers may still abort in-flight requests when closing).
- **RLS**: Never use the **service role** key in the browser; only `anon` + logged-in user JWT.
