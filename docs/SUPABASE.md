# Supabase setup

The backend is one Supabase project (free plan: two active projects per account). Everything
that defines it is in the repo: `supabase/migrations/` (tables, access rules, the private bucket)
and `tools/host/` (scripts the host runs with the secret key). This page is the one-time setup.

## Keys: what is safe where

| Value | Where it comes from | Who may see it |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | Project Settings → Data API | Anyone. It ships in the public site. |
| Publishable key `sb_publishable_...` | Project Settings → API Keys | Anyone. It ships in the public site; the access rules are what protect the data. |
| Secret key `sb_secret_...` | Project Settings → API Keys → Secret keys | Only you, only in a PowerShell window while running a host tool. Never in the repo, never in chat. |
| Database password | Set when creating the project | Only you. Keep it in a password manager. |

## 1. Create the project (dashboard)

1. <https://supabase.com/dashboard> → **New project**. Name `jones2`, a region near the family,
   generate a database password and save it.
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: on. Players sign in
   anonymously; redeeming an invite link is what gives the session a seat.

## 2. Apply the migrations (PowerShell, repo root)

```powershell
cd "C:\Users\Nautilus\Projects\Jones 2"
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

`login` opens the browser once. `link` and `db push` ask for the database password. `<ref>` is
the 20-letter id in the project URL. Re-run `db push` whenever a new migration lands.

## 3. Upload the original game's audio

Needs `assets/sierra/audio` on this machine (see `assets/README.md`).

```powershell
cd "C:\Users\Nautilus\Projects\Jones 2"
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SECRET_KEY="sb_secret_..."
npm run upload-assets -w @jones2/host -- --dry-run
npm run upload-assets -w @jones2/host
$env:SUPABASE_SECRET_KEY=$null
```

The dry run reports what would go up (about 570 files, 19 MB, the first time). The script
refuses to upload into a public bucket. Re-running only sends new or resized files, plus the
JSON label files. `-- --prune` also deletes bucket files no longer on disk.

Check in the dashboard: **Storage → sierra** lists `audio/`, and the bucket is not marked Public.

## Free plan notes

- A project with no activity for a week is **paused**. Restore it from the dashboard. A
  scheduled keep-alive comes with the deploy (Milestone 3, step 5).
- Limits that matter: 1 GB storage (we use ~20 MB), 5 GB egress a month (each device downloads the
  audio once, then keeps it in the browser), 500 MB database.

## Who can do what (enforced in the database, tested in `tools/host/test/schema.test.ts`)

- Signed out: nothing.
- Signed in anonymously without a seat: nothing either, including the audio bucket.
- Holding a seat (after redeeming its invite link): read that game, its seat names, its week
  snapshots and the audio; write only their own turn for the open week, until it is submitted;
  see rivals' turns only once the week has resolved.
- An invite is single-use: it binds to the first device that redeems it. The host re-issues a
  seat to move it to a new device, which locks the old one out.
- Games, seats, snapshots and submissions are written only with the secret key (host tools and
  the Edge Function), never from the public site. Any seat unlocks the audio, so the public site
  must never be able to mint one.
