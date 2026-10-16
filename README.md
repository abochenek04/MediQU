# MediQU

**Know before you go.** MediQU helps people compare total visit times and plan around care. It retains the React 19 / TypeScript / Vite interface and six clearly fictional Durham clinics. The upgrade adds a durable Node/SQLite API, Better Auth accounts, private settings and saved plans, shared validated reports, conservative estimates, seven languages and staging-only administration.

No live clinic directory, ratings source, travel routing, booking or notification provider is connected. Fictional data is not medical advice. **Saved visit plans are not clinic reservations.**

## Run locally

Use Node 24 LTS (minimum 22.13):

```sh
npm ci
cp .env.example .env
cp server/.env.example server/.env
npm run db:migrate
npm run db:seed
npm run api
```

In another terminal:

```sh
npm run dev -- --force
```

Open **http://localhost:4173**. Development verification codes go to private files in `.data/development/mail`; they are not emailed. Sign up → enter the code at `/verify` → sign in. Account data persists in `.data/development/mediq.sqlite`. See the [complete setup/release runbook](docs/runbook.md) for secrets, real email, cloud hosting, administrator bootstrap and rollback. The requested personal `README-LOCAL-SETUP.md` is deliberately Git-ignored; all reproducible instructions are also tracked.

To browse without an API, set `VITE_DATA_MODE=demo` and restart Vite. This explicitly labeled fictional mode uses temporary memory and disables account actions. Configured backend mode reports service failures and never silently falls back to demo data.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite on 4173, proxying `/api` to 3001 |
| `npm run api` | API; applies pending transactional migrations at startup |
| `npm run db:migrate` / `npm run db:seed` | Migrations / fictional development seed (seed refuses production) |
| `npm run admin:grant -- verified-email` | Trusted terminal-only role grant in development/staging |
| `npm run jobs` | Estimate recalculation, retention and configured external refresh |
| `npm run db:backup -- /private/path/snapshot.sqlite` | Consistent SQLite online backup |
| `npm run typecheck` | Frontend and backend/test TypeScript |
| `npm test` | Translation and palette audits, build, and original care/route/asset regression suite |
| `npm run test:backend` | Fresh-database auth, ownership, reports, search and estimator integration tests |
| `npm run test:browser` | Real API + Chromium interaction tests; first install `npx playwright install chromium` |
| `npm run build` / `npm run preview` | Build / local static preview (API still needed in backend mode) |
| `npm run build:staging` / `npm run build:production` | Separate deployment modes; use matching `.env.*.example` values |
| `npm run serve:dist` | Original static route-fallback preview |

## Preserved product features and routes

Guest-first entry; clinic/provider/symptom search; insurance, specialty, spoken-language, rating, visit-mode, distance and timing filters; synchronized list/map; geolocation with manual fallback; clinic profiles, providers, fictional reviews, historical charts and confidence explanations; quick/full reports; saved clinics and visit planning; leave-by/arrival/finish arithmetic; product tour; About, Contact and footer anchors; responsive navigation, native dialogs, keyboard focus and Arabic RTL.

| Route | Purpose |
| --- | --- |
| `/` | Guest/account onboarding |
| `/find` | Search, filters, list/map |
| `/clinic/:id` | Clinic detail, evidence, historical patterns and planning |
| `/saved` | Saved visit plans and clinics |
| `/report` | Full timing report |
| `/know` | About, privacy, limitations, safety and future Plus concept |
| `/contact` | Explicitly unsent demo contact form |
| `/signup`, `/login`, `/verify`, `/reset-password` | Real account flows when backend is configured |
| `/settings` | Authenticated private profile and account controls |
| `/admin` | Development/staging administrator tools; excluded from public builds |

Direct routes work through the Node server's SPA fallback. Original Netlify/Vercel rewrite files remain for frontend-only demos. A static Vite deployment alone cannot provide authentication or persistence.

## Intentional behavior changes

- **Guest state is temporary memory.** It survives client-side navigation, then resets on reload/new tab/closure. Only named legacy `mediq-*` personal-storage keys are removed; unrelated storage is untouched. The fictional sample plan remains clearly labeled. No guest-to-account merge happens implicitly.
- **Accounts are real.** A normalized unique email/password identity remains pending until its one-time code verifies. Only verified sessions can access private data. Optional sex, gender, kg/cm measurements and age start empty. Passwords are never readable profile fields. Logout, switching, revocation and deletion invalidate private UI state.
- **Shared reports persist independently.** Guest interface reset does not delete an accepted backend report. Public reports contain operational summaries, never names, email, free-text notes or raw timing entries. Account deletion deletes that account's submitted reports and private records; nonidentifying aggregate event counts remain.
- **Search uses deterministic concepts and typo tolerance.** `head pain` matches explicitly supported `headache` capabilities; `Brightwel urgent car` matches Brightwell. Exact names outrank strong concepts and weaker fuzzy names. Selected filters are always enforced. Recommended order preserves relevance; nearest/shortest/confidence remain explicit sorts. No search is sent to an AI provider.
- **Seven interface languages:** English, Spanish, Chinese, Arabic, Polish, Gujarati and Hindi. Interface choice and clinic spoken-language filtering are separate. Named locale catalogs extend the original three-locale catalog safely. Translation drafts require native-speaker review; directory proper names and original review prose remain source content.
- **Brand:** primary `#2e9fe5`, secondary `#d1601a`, with darker text and accessible variants.

## Repository guide

| Location | Responsibility |
| --- | --- |
| `src/pages`, `src/components` | Existing care UI plus account/settings/internal screens |
| `src/context/AppContext.tsx` | Session restoration, isolated state, saves and reports |
| `src/context/translate.ts`, `locales/*.json` | Safe lookup, interpolation and seven languages |
| `src/services/clinicService.ts` | Compatible demo/backend adapters |
| `src/services/search.ts` | Shared intent, fuzzy name matching, strict filtering |
| `src/services/locationService.ts`, `src/utils/time.ts`, `src/utils/report.ts` | Preserved location, visit arithmetic and report validation |
| `src/data/mockData.ts`, `src/types.ts` | Fictional fixtures and shared contracts |
| `server/` | Auth, API authorization/validation, schema, estimation, jobs, seed and CLI |
| `tests/`, `scripts/smoke-test.mjs` | API/browser/regression checks |
| `deploy/`, `.env*.example`, `server/.env*.example` | Independent staging/production deployment templates |
| `docs/runbook.md` | Cloud/email/local setup, migrations, backup/restore/release |
| `docs/data-and-estimates.md` | Data handling, estimator, search and metric definitions |
| `docs/upgrade-checklist.md`, `docs/verification.md` | Acceptance evidence and external blockers |

## Deployment and safety boundaries

Local → staging validation → deliberate production promotion. Nothing here deploys automatically or modifies the existing public site. Separate services/disks/secrets/senders prevent test data crossing into production. Disk-backed single-instance hosting has brief restart outages and is not horizontally scalable; see the runbook. Real clinic data/source permissions, external integrations, sender/domain configuration, monitoring, backups and outside reviews remain explicit launch tasks.

MediQU does not diagnose, guarantee visit times, or claim HIPAA/security certification. Contact emergency services for a suspected emergency. Complete privacy, security, clinical-safety, accessibility and translation review before collecting real pilot data.
