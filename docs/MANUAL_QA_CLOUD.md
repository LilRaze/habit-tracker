# Manual QA — cloud sync & auth (alpha)

Use with a real Supabase project and Google OAuth (see `docs/SUPABASE_SETUP.md`).

## Prereqs

- `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- SQL migration applied (`habit_user_state`, RLS, profile trigger)
- Google provider enabled; redirect URLs correct

---

## 1. First login — existing local data

1. While **signed out**, create real progress: completions, targets, a few active habits.
2. Sign in with Google (no row in `habit_user_state` yet).
3. **Expect**: No conflict modal; cloud uploads; AuthBar shows sync success.
4. **Verify** in Supabase Table Editor: one `habit_user_state` row for your user; `test_rank_override` is null, `time_offset_months` is 0.

## 2. First login — no local data

1. Clear site data / fresh profile, or use a browser profile with empty localStorage for this origin.
2. Sign in (new account or existing account with empty cloud row and empty local).
3. **Expect**: No crash; empty state; optional upload of defaults only if “meaningful local” logic triggers.

## 3. Returning login — cloud data

1. Sign in on device A with progress synced.
2. Sign out (or use another browser) with **empty** local.
3. Sign in again.
4. **Expect**: Data loads from cloud; matches account; no unnecessary conflict.

## 4. Local / cloud conflict

1. On device A: build progress, sign in, sync (cloud has data).
2. On device B (or private window): **before** signing in, build **different** progress locally (completions/targets differ from cloud).
3. Sign in with the **same** account.
4. **Expect**: Conflict modal; **Use account (recommended)** loads cloud and replaces local habit data; **Use this device** overwrites cloud.
5. Confirm choice matches data in app and in Supabase after action.

## 5. Sign out

1. While signed in with synced data, sign out.
2. **Expect**: App shows **local** snapshot (from `localStorage`); no crash; habit data is whatever was last written locally.

## 6. Reset while signed in

1. Sign in with data.
2. Settings → Reset app data (confirm).
3. **Expect**: Local cleared; cloud row updated to empty defaults; `test_rank_override` / time offset columns null/0 in DB.

## 7. Network interruption / pending save flush

1. Sign in, make a change, **do not** wait for the full debounce (~1.6s).
2. Switch tab or minimize (tab **hidden**) within that window, or close the tab.
3. **Expect**: If a debounced save was still pending, the app attempts an immediate upsert; check Network tab when possible. After a save has already completed, no extra flush runs on close.
4. Throttle or go **offline**: errors may show in AuthBar; fixing network and editing again should retry.

## Dev-only fields (not synced)

- Rank **test override** and **virtual time offset** stay on device; they are not stored from cloud and upserts always send `null` / `0` for those columns.
