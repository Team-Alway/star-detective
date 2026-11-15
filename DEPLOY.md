# Deploying Star Detective

- **Backend + database:** Render free plan, defined in `render.yaml`. It sets up a FastAPI web service and a PostgreSQL database.
- **Frontend:** Vercel, using the `frontend/` folder.

Deploy the backend first, because the frontend needs its URL.

## 1. Backend and database on Render

1. Push this repo to GitHub.
2. In Render, choose **New → Blueprint**, pick the repo, and keep `render.yaml`. Render creates two things:
   - `star-detective-db`: free PostgreSQL. User accounts and progress are stored here.
   - `star-detective-api`: the FastAPI app, built from `backend/`.
3. Render asks for `CORS_ORIGINS`. Enter your Vercel URL, for example `https://star-detective.vercel.app`. You can come back and set this after step 2 below.
4. Wait for the deploy to finish, then open `https://<your-service>.onrender.com/api/v1/health`. It should show `"status": "ok"`.

`SD_JWT_SECRET` is generated automatically. `DATABASE_URL` is wired to the database automatically.

## 2. Frontend on Vercel

1. In Vercel, choose **Add New → Project** and import the same repo.
2. Set **Root Directory** to `frontend`. The framework is detected as Next.js.
3. Add these environment variables, replacing the URL with your Render service URL:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com` |
| `BACKEND_URL` | `https://<your-service>.onrender.com` |
| `NEXT_PUBLIC_AUTH_VIA_PROXY` | `1` |

4. Deploy. Then put the final Vercel URL into `CORS_ORIGINS` on Render. If you use more than one Vercel URL, separate them with commas.

### Why two URLs

- **Sky images and data** load straight from Render (`NEXT_PUBLIC_API_URL`). Building a brand-new patch of sky can take a few minutes.
- **Login, progress and leaderboard** go through the Vercel site's own `/api/...` path, which `next.config.ts` forwards to `BACKEND_URL`. This keeps the session cookie on your own domain. Safari and iPhones block cookies from a different site, so without this, logging in would silently fail on phones.

## 3. Create the demo account

The demo account from local development is not copied over. Create it on the live site:

```sh
curl -X POST https://<your-service>.onrender.com/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"demo@stardetective.app","password":"StarDemo2026","display_name":"Demo Detective"}'
```

## Free-plan limits

- **Sleep after idle:** the backend goes to sleep after about 15 minutes without traffic. The first visit after that waits about a minute. Before a demo or judging, open `/api/v1/health` to wake it.
- **The disk resets on every restart:**
  - Accounts are safe, because they live in Postgres.
  - The five preset targets are safe. Their frames are committed in `backend/sky_cache/` (about 5 MB).
  - Raw image cutouts are re-downloaded from NASA's IRSA archive when needed. This affects the spectrum, the flags list, a single detector the cache doesn't have, and new coordinates.
- **The free Postgres database expires 30 days after creation** unless you upgrade it. Export anything you want to keep before then.
- **Memory is 512 MB.** That is enough for normal use. Many people searching brand-new positions at the same moment could hit the limit.

## New SPHEREx data releases

Change `SD_SPHEREX_COLLECTIONS` on Render, putting the newest release first, for example `spherex_dr2,spherex_dr1`. No code change is needed.

## Local development

```sh
npm install             # root: installs concurrently
npm run dev             # backend on :8000 + frontend on :3000
```

- The backend uses a local SQLite file when `DATABASE_URL` is not set.
- Test-only packages are in `backend/requirements-dev.txt`.
