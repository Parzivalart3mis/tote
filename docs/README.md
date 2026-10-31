# Tote

Your grocery lists, one per store. A PWA that feels like a small, warm app on your phone.

## What it does

- One card per store with a cover photo (or generated initials tile)
- Items under each store — tap to check off, star favorites, flag as running low
- Check-off animates items to the bottom; bulk-clear when done shopping
- Global search with ⌘K
- Installs to home screen on iOS and Android — no URL bar, no browser chrome

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 3 + shadcn/ui + Framer Motion 11
- Turso (libSQL) + Drizzle ORM
- Clerk (magic link + Google)
- Vercel (hosting)
- Upstash Ratelimit (60 writes/min/user)

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/tote
cd tote
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
| `TURSO_DATABASE_URL` | `file:./local.db` locally, `libsql://…` in prod |
| `TURSO_AUTH_TOKEN` | Required for hosted Turso; blank for local |
| `UPSTASH_REDIS_REST_URL` | Upstash console (optional — rate limiting disabled if blank) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console (optional) |
| `GEMINI_API_KEY` | Google AI Studio. Powers "Sort with AI" in the pantry and stores (optional — those buttons return 503 without it) |
| `GEMINI_MODEL` | Optional. A Gemini model to try before the built-in fast fallback chain (`lib/gemini.ts`) |
| `PANTRY_SHARE_SECRET` | Optional. Long random string (`openssl rand -hex 32`) that The Cookbook sends as `Authorization: Bearer …` to read your pantry. Put the same value in the Cookbook's `TOTE_API_KEY`. |
| `PANTRY_SHARE_USER_ID` | Optional. The tote user whose pantry is shared: your Clerk user ID (`user_…`, Clerk dashboard → Users). |

### Pantry sharing with The Cookbook

`GET /api/integrations/pantry` returns your **In stock** and **Running low** food
(name, quantity, unit, category, status only) for The Cookbook's AI Kitchen. It is
off (503) until both `PANTRY_SHARE_*` variables are set, and it never exposes Out /
To buy items, notes or other users' data.

Household and Personal Care items are never shared. Items without a category are
sorted with Gemini first (capped at 6s); if that isn't possible, they're judged by
name, so things like toilet paper or detergent stay out either way.

### 3. Create local database and seed

```bash
npm run db:push
npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm run format` | Prettier |
| `npm test` | Vitest unit + integration tests |
| `npm run db:push` | Push schema to DB (dev) |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations (prod) |
| `npm run db:seed` | Seed sample data |

## Adding to home screen

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add** — done. The icon appears on your home screen and launches with no URL bar.

### Android (Chrome)
1. Open the app in Chrome
2. Chrome shows a banner or you can tap the three-dot menu → **Add to Home Screen**
3. Tap **Install**
4. The app appears in your app drawer and launches standalone.

## Production deployment

1. Create a Turso prod database:
   ```bash
   turso db create tote
   turso db show tote  # copy the URL
   turso db tokens create tote  # copy the auth token
   ```

2. Set environment variables in Vercel dashboard (or via `vercel env add`).

3. Set `TURSO_DATABASE_URL` to `libsql://<name>-<org>.turso.io` and set the auth token.

4. Migrations run automatically as a Vercel build step via `drizzle-kit migrate`.

5. Push to main — Vercel deploys.
