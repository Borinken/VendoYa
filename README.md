# VendoYa

A lead-acquisition and CRM platform for small real estate agencies in Spain.

Agencies in the Antequera region were losing listings because owner enquiries
arrived across three disconnected channels — a web form, WhatsApp, and a Gmail
inbox — and nobody followed up past the first day. VendoYa unifies capture,
scores the lead, and runs the follow-up sequence automatically.

Built for a working agency and deployed on Vercel.

---

## What it does

**Lead capture.** A multi-step funnel collects property details and gives the
owner an instant valuation before asking for a phone number. Asking for contact
details last, after the visitor has received something of value, cut abandonment
sharply — the original design gated the funnel behind a welcome screen and lost
most visitors there.

**Automated follow-up.** Leads enter a scheduled sequence (day 1, 3, 7) delivered
over WhatsApp and email. A cron endpoint drains the queue every 15 minutes.

**Inbox ingestion.** Connects to the agency's Gmail over OAuth, parses incoming
enquiries from listing portals, and creates leads without manual entry.

**Property management.** CRUD for listings, contacts, contracts and rentals, plus
3D tour hosting via Polycam webhooks and a Three.js viewer.

**Investment analysis.** Scores a property against configurable criteria using an
LLM, with a deterministic per-city fallback so the feature degrades instead of
failing when the API is unavailable.

---

## Architecture

```
Browser ──► Next.js App Router (Vercel)
              │
              ├─ /api/leads          lead CRUD + interaction log
              ├─ /api/email/*        Gmail OAuth, sync, parse
              ├─ /api/scraping/*     portal ingestion (Puppeteer)
              ├─ /api/investment     LLM scoring + city fallback
              ├─ /api/stripe/*       checkout + webhook
              └─ /api/cron/*         queue drain, property sync
              │
              ▼
          Supabase (Postgres + RLS)
              ▲
              │
   GitHub Actions ── 15-min schedule ──┘
```

### Decisions worth explaining

**Scheduling runs on GitHub Actions, not Vercel Cron.** The Vercel Hobby plan
caps cron jobs at one per day, which is useless for a follow-up queue. A
scheduled workflow hitting an authenticated endpoint gives 15-minute granularity
at no cost. The endpoint is guarded by a shared secret rather than left open.

**Third-party credentials are encrypted at rest.** Agencies connect their own
Gmail and Twilio accounts, so the database holds tokens belonging to someone
else's business. `lib/encryption.ts` wraps them before they reach Postgres;
Supabase RLS scopes every row to its owning agency.

**Portal ingestion is isolated and degradable.** `/api/scraping` has `scrape`,
`scrape-real` and `scrape-mock` variants so the rest of the system can be
developed and demoed without depending on a live portal session or getting the
IP blocked. `lib/anti-detection.ts` handles pacing and fingerprinting.

**The valuation model fails soft.** If the LLM call errors or times out, the
funnel falls back to a per-city price table rather than showing an error. A lead
mid-funnel is worth more than a precise number.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Database | Supabase (Postgres, RLS, Storage) |
| Styling | Tailwind CSS |
| Payments | Stripe (checkout + webhooks) |
| Messaging | Twilio WhatsApp Business API, Gmail API |
| Scraping | Puppeteer, Cheerio |
| 3D | Three.js, React Three Fiber, Polycam |
| Validation | Zod, React Hook Form |
| Scheduling | GitHub Actions |
| Hosting | Vercel |

---

## Running locally

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your own credentials, then apply the schema:

```bash
supabase db push
```

`supabase/migrations/` holds the full schema. Start the dev server:

```bash
npm run dev
```

Required environment variables are documented in `.env.example`. The app starts
without the optional integrations (Twilio, Gmail, Stripe) — those features
report as unconfigured rather than crashing.

---

## Project structure

```
app/
  api/            31 route handlers
  (pages)/        dashboard, funnel, lead views
components/       shared UI
lib/              integrations: supabase, stripe, gmail, whatsapp,
                  encryption, investment-analyzer, anti-detection
supabase/
  migrations/     schema
scripts/
  db/             one-off migration and inspection helpers
  dev/            local verification scripts
docs/             architecture and feature notes
```

---

## Status

Deployed and in use by one agency. Multi-tenant support and Supabase Auth are
in place; billing is wired but the pricing model is still being validated with
real customers before the self-service tier opens.

## License

MIT — see [LICENSE](LICENSE).
