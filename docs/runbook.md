# Architecture, local setup and release runbook

This upgrade preserves the React 19/Vite UI and `ClinicDataService`. The server uses Node, SQLite and Better Auth 1.7.6. Better Auth owns password hashing, session signing, code generation/validation, verification and password recovery. A small same-origin JSON API owns data validation and authorization. No authentication database is stored in frontend JavaScript.

## Architecture and operating limits

- `server/migrations/001_initial.sql`: versioned relational schema, auth tables, private ownership foreign keys/cascades, shared clinic/provider/language/insurance/source records, reports, estimates/history, aggregate metrics, persistent rate limits, roles, checklist and audit records.
- `server/application.ts`: request origin checks, owner checks, verified-session checks, report validation and administration authorization. SQL uses bound parameters. Browsers have **no direct database access**. A supplied user ID cannot change ownership; private paths use the authenticated user's ID. `X-MediQ-Account` additionally rejects requests started under another account.
- `server/auth.ts`: Better Auth, hashed 6-digit codes (10-minute validity, 5 attempts), email delivery. Send requests have a 60-second cooldown; sender limits apply even when auth triggers email indirectly. Limits survive server restarts. Signup, verification and login are separate stages.
- `src/context/AppContext.tsx`: session restoration before rendering, identity generation guards, cross-tab invalidation, 30-second session revalidation, temporary guest state. Auth cookies last up to 30 days, are HttpOnly/SameSite=Lax, Secure on HTTPS, database-backed and revocable. The provider renews eligible sessions daily. No cookie-cache shortcut bypasses revocation.
- `server/jobs.ts`: recalculation, retention and authorized directory refresh. Retries three times with backoff; job runs record success/failure/unconfigured. `RUN_JOBS=true` runs every 5 minutes inside the API process without overlap. Alternatively, schedule `npm run jobs` on the **same machine and disk**. Never run both schedulers intentionally.
- `server/integrations.ts`: server-only authorized adapter registry for directory, ratings, travel, booking availability and consent-checked future notifications. There are no credentials or licensed sources in this checkout, so these return explicit `unavailable`. No actual booking or notification is implemented or claimed. Travel inputs remain manual; maps/distances remain illustrative/straight-line. Contact remains an explicitly labeled unsent demo.

SQLite on a persistent cloud disk is a real durable relational backend, not an in-memory stub. It is deliberately a **single-instance** architecture: no shared network filesystem, multiple API replicas, serverless ephemeral disk or horizontal scaling. This is suitable for a small pilot. A managed PostgreSQL migration and a separate private production operations deployment are future scaling/operations work, not claimed here. Production serves no admin routes; staging tools operate on staging records. A trusted server operator can inspect/repair production through a controlled database maintenance procedure, with a backup and separately recorded change log. Before operating a real multi-clinic production service, establish its private moderation/operations access path.

## Exact local startup

Use Node **24 LTS** (Node >=22.13 works; older supported runtimes may print an experimental SQLite warning). From the repository root:

```sh
npm ci
cp .env.example .env
cp server/.env.example server/.env
npm run db:migrate
npm run db:seed
npm run api
```

Keep that terminal open. In a second terminal:

```sh
npm run dev -- --force
```

Open **http://localhost:4173** (use this exact host, not 127.0.0.1, for the configured auth origin). API is on port 3001; Vite proxies `/api`. `--force` safely refreshes historical Vite dependency caches. Actual `.env` files and `.data` are ignored. Set a unique `AUTH_SECRET` in `server/.env` using a local random generator before sharing a development service. Never put secrets in a `VITE_` variable.

For a standalone frontend demonstration, set `VITE_DATA_MODE=demo` and restart Vite. That mode labels its fictional data, disables real accounts, and keeps guest plans/reports in memory. In backend mode a failed API read/write shows an error; it never substitutes demo data.

## Verify locally and grant the first administrator

1. Open `/signup`; provide first name, last name, email and a password of 12–128 characters. Optional profile fields are not collected here.
2. Local development writes verification messages to **`.data/development/mail/*.json`**, mode 0600 inside a private directory. Open the newest file for your test email and enter its six-digit `otp` at `/verify`. This is a local mailbox transport, **not delivered email**. It is forbidden for staging/production. Local message files expire via the retention job after an hour.
3. Sign in at `/login`; save a clinic/visit, reload, sign out and sign back in. Use another browser to verify persistence. Test a wrong/expired code and reset at `/reset-password`.
4. From the trusted server terminal, run `npm run admin:grant -- your-verified-test-email@example.com`. This CLI requires an already verified identity, grants a role in a separate server table, and never accepts role input from the browser. Local/staging top navigation then shows Administration after refresh. Regular accounts and guests remain denied by the API. There is no default admin/test password.
5. Use `/settings` to edit/clear optional profile values, change password or delete the account with password confirmation and the literal `DELETE`. No email editing is offered, avoiding an unverified-email replacement path.
6. Run `npm run jobs`, then inspect Activity. Refresh cadence for account directory, checklist, metrics and review lists is 30 seconds. New/updated accounts and deletions appear within that bound or on Refresh.

## Separate staging and production

### mediqu.com launch preparation (October 17, 2026)

The reviewed checkout is `v3.1.1`; the local `main` and cached `origin/main`
still point to the older `a3da3d4` release. Confirm the remote state and promote
the intended, tested application to `main` before deploying. Local security edits
are not deployed by editing this repository. Do not overwrite the working branch,
development environment files, or database when preparing the release.

The production Blueprint explicitly selects `main`, one instance and a persistent
disk. Automatic deployment stays off for the initial launch: deploy an approved
commit from `main` manually. A later switch to automatic deployment should require
passing CI checks and protected `main`. Developing locally does not change the
public website until changes are pushed and deployed.

Launch order:

1. Review the security changes, test the intended release, and decide what belongs
   on `main`. Check GitHub's existing deployment integrations before pushing: a
   push may trigger an older hosting configuration outside this Blueprint.
2. Protect GitHub, Render, Resend and the domain/DNS account with MFA or passkeys;
   review collaborators and connected apps. Enable GitHub secret scanning/push
   protection, dependency alerts, and a `main` ruleset requiring PRs and successful
   checks, blocking force pushes/deletion. Configure bypass deliberately so a sole
   maintainer is not locked out. These account settings have not been verified.
3. Approve hosting costs and create the separate production Render Web Service
   using `deploy/render.production.yaml`. Keep a single instance, no automatic PR
   previews and no autoscaling. Use a separate persistent disk and fresh secrets
   stored in the host's secret manager, never GitHub source or `VITE_*` variables.
4. Verify a sending domain through Namekeen DNS controls. Create a Resend key with
   sending access restricted to that domain. Set the service's exact HTTPS origin,
   `MAIL_FROM`, `RESEND_API_KEY`, and email limits. Use distinct staging secrets.
5. Deploy the tested `main` commit and verify the temporary HTTPS service URL,
   real email verification/recovery, account isolation, rate limits, persistence,
   backups and restore. Production intentionally excludes unapproved/fictional
   clinics; arrange authorized directory data rather than publishing old fixtures.
6. Add `www.mediqu.com` and `mediqu.com` to Render. Configure the exact DNS records
   Render provides through Namekeen, verify TLS, redirect the apex to the canonical
   `https://www.mediqu.com`, and set `APP_ORIGIN` to that canonical address. Redirect
   alternate hostnames before users enter account flows. Recheck location lookup,
   signup, login, password recovery and mobile use on the actual custom domain.
7. Enable external health/email/disk/backup monitoring. Review bandwidth and build
   usage alerts and provider limits, and rehearse pausing email or taking the site
   offline. No DNS, account, purchase, push or deployment change is implied here.

### Abuse and billing controls

`MAIL_DAILY_LIMIT` defaults to 100 attempts per 24-hour window;
`MAIL_MONTHLY_LIMIT` defaults to 1,000 per 30-day window. These are shared counters
in the persistent database, independent of recipient/IP. Each window starts when
its first attempt is reserved, not at a calendar boundary. Reservations happen
before Resend requests; failed/uncertain provider calls consume capacity too.
Existing recipient cooldowns and IP/auth rate limits remain in place. A rejection
at the monthly limit may also consume daily capacity. Local file mail does not
consume these provider budgets. Changing neither value clears existing counters.

Set either limit to `0` in the service environment and restart/redeploy to pause
outgoing email. At a cap, verification and recovery email stop, so monitor
`email_failures` and provider usage; this deliberately favors limiting cost over
unlimited availability. Never clear production `rate_limits` during an incident
or redeploy onto a fresh database as a workaround, because that resets budgets.

These controls cap this application's send attempts, not the provider account's
total bill. Other applications or a stolen key can bypass them. Use a dedicated,
domain-scoped sending key, MFA, provider quotas and the lowest suitable plan. No
paid map/AI/booking integrations are installed in the reviewed adapter registry.
The public reverse-geocoding client does not use a paid API key.

A fixed compute instance does not make all hosting usage fixed-cost. Render can
charge for excess outbound bandwidth and build minutes. Check actual account
limits, set the build spend limit and billing alerts, and agree on an incident
response. A build spend limit is not a universal bandwidth/billing hard cap. For
stronger traffic protection, review host edge controls or a compatible CDN/WAF
configuration before launch; application rate limits alone cannot stop all
distributed attacks or requests for static assets.

Source: [Render outbound bandwidth](https://render.com/docs/outbound-bandwidth),
[Render FAQ](https://render.com/docs/faq),
[custom domains](https://render.com/docs/custom-domains),
[Resend key permissions](https://resend.com/docs/api-reference/api-keys/create-api-key),
[GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection).

Keep independent repositories/services or release branches, databases/disks, auth secrets, mail API keys/senders, domains and monitors. The database stores an environment marker and rejects mismatched `APP_ENV`. Staging is never a replica of production containing private user data. Seed only the fictional directory in development/test/staging (`db:seed` refuses production), and create explicitly designated staging test accounts. Seed reports from the original UI are **not** counted as accepted backend reports.

Browser examples: `.env.staging.example`, `.env.production.example`. Server examples: `server/.env.staging.example`, `server/.env.production.example`. Deploy samples: `deploy/render.staging.yaml`, `deploy/render.production.yaml`. These files contain placeholders, never credentials. Both Blueprints disable automatic deployment. Merely committing or building does not deploy anything.

### Render and Resend setup (owner-controlled steps)

1. Create or sign into your own Render account. Create a **new** Node Web Service for staging; do not replace the existing public static site. Use the staging Blueprint as a template. A persistent disk is required and Render disks require a paid service; review its current plan before purchasing. A single Linux VM with persistent local storage/reverse proxy is an alternative using the same commands.
2. Choose Node 24, build `npm ci && VITE_DATA_MODE=backend VITE_APP_ENV=staging npm run build:staging`, start `npm run api`, health `/api/health`, disk `/var/data`, and set all server staging environment values in Render's secret/environment UI. Copying an example does **not** configure credentials.
3. Create a Resend account and verify a sender domain you own. Follow Resend's displayed DNS records with your DNS provider; no DNS changes have been performed by this implementation. Create a sending key scoped to the sender where supported. Store it as server-only `RESEND_API_KEY`; set `MAIL_FROM` to an approved address. Use a different key/sender for production. Review provider terms and retention before real users.
4. Set `APP_ORIGIN` to the exact HTTPS staging URL (Render-issued HTTPS URL is acceptable initially). Better Auth trusted origins derive from this value. This app uses email codes, so it has no OAuth dashboard or verification-link redirect list to configure. The supported pages are `/signup`, `/verify`, `/login`, `/reset-password`; codes are entered there. Email subject/body templates are in `server/auth.ts`, with all seven languages. No production verification bypass is available.
5. Migrations run on API startup, when the runtime disk exists. Render does not mount persistent disks during its build/pre-deploy command. From the service's runtime shell, run `npm run db:seed` **only on staging**, complete an actually delivered verification email and run `npm run admin:grant -- verified-address`. Check `/api/health` and validate every critical workflow.
6. Set `RUN_JOBS=true`. Render cron services cannot mount this service's disk: use the built-in scheduler or an operator command in the running service's shell. Add external monitoring for health, last successful estimates/retention run, email failures, disk usage and backup age.
7. Create a separate production service from the production Blueprint with a separate persistent disk and secret values. Build with `VITE_APP_ENV=production` and `VITE_DATA_MODE=backend`. The conditional admin import is eliminated from the public bundle; the server independently refuses admin endpoints in production even if the caller has an admin row. Do not seed fictional clinics/reports into this production database. An empty directory correctly displays an empty result until authorized directory data is imported.
8. Validate domain/TLS, cookies and email on staging first. Only the owner should deliberately promote the tested commit/build and point a public domain to the new service. No deployment, sender verification, purchase or domain change was performed here.

`TRUST_PROXY=true` is intended only behind the hosting provider's trusted reverse proxy, with direct backend access blocked. The API uses the nearest forwarded hop, not an attacker-controlled leftmost address. On a VM configure the proxy to overwrite `X-Forwarded-For` and deny direct access to the API port. Default local configuration ignores forwarded headers. Anti-abuse identifiers are HMACs; do not log raw search URLs, request bodies, emails or passwords in proxy/application analytics.

## Release, health, backup, rollback

Release path: local branch → complete tests → deploy the specific commit to staging → owner validates email/integrations and backs up → deliberate production promotion. Keep the existing public release online until the new service passes staging acceptance. Existing client routes remain compatible. Avoid destructive migrations during a rollout: add nullable columns/new tables first, support both old/new forms, backfill, and remove old structures only in a later reviewed migration. Migrations apply once transactionally; never rewrite an applied file after release.

`/api/health` checks the database and reports environment, email configuration and last job. This is liveness/basic readiness, **not proof of email delivery or external provider health**. Verify a real signup email, recovery, session restore, account isolation, report submission, and direct-route loading before promotion.

Before migration or release: `npm run db:backup -- /private-backup-path/mediq-pre-release.sqlite`. This uses SQLite's online backup API, producing a consistent snapshot including WAL content. Do not copy just the active `.sqlite` file. Encrypt backups, send them off-host, restrict access, and test restoration into a **different** development/staging environment (use a sanitized database or deliberately change the environment marker offline only after understanding its contents). Never expose a backup under `dist/` or any web root.

Policy to configure before real data: encrypted daily backups retained for no more than 30 days, documented hosting/provider backup policies, deletion request reconciliation after restoration, and deletion of expired backups. This policy is a launch task, not a promise about a cloud account we cannot access. Render disk snapshots have provider retention and are not a substitute for verified SQLite backups. Do not claim immediate deletion from provider backups. Store any deletion reconciliation ledger encrypted, access-restricted and only as long as needed for recovery, outside analytics.

Rollback: retain the prior application artifact/commit. For additive compatible migrations, redeploy the prior artifact against the current schema after a staging compatibility check. For an incompatible migration, stop writes, take a fresh backup, restore the last tested SQLite backup to a new disk/file, replay/reconcile post-backup activity and deletions as appropriate, then restart with the matching release. Clear/revoke restored sessions before admitting traffic. A restore loses changes since that snapshot; communicate this explicitly.

A disk-backed Render service cannot run multiple instances or perform a zero-downtime instance swap. Its deploy restart entails a brief outage; free/ephemeral hosting is not suitable for this database. This implementation preserves the old public release during development but does **not** promise literal zero downtime on promotion. Higher availability requires a managed network database and additional deployment engineering before scaling.

## Reproducible verification

```sh
npm run typecheck
npm test
npm run test:backend
npx playwright install chromium
npm run test:browser
```

`test:backend` creates new temporary databases and exercises the actual Better Auth handler and owner-scoped API, not an in-memory account stub. Browser tests create fresh `.data/e2e` only, start the real API/Vite, and verify cookies and interactions using independent browser contexts. Never point these tests at a cloud database. Browser screenshots/traces and all test credentials are ignored artifacts. Test scripts are not included in public assets.

## Source documentation reviewed for this implementation

- [Better Auth SQLite](https://better-auth.com/docs/adapters/sqlite), [email codes](https://better-auth.com/docs/plugins/email-otp), [sessions](https://better-auth.com/docs/concepts/session-management), [user/password operations](https://better-auth.com/docs/concepts/users-accounts).
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email).
- [Render persistent disks and limits](https://render.com/docs/disks), [Blueprint reference](https://render.com/docs/blueprint-spec).
