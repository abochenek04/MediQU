# MediQU implementation prompt

Copy everything below this line into a new MediQU coding task. This is a request to implement the changes, not just propose a plan.

---

Implement the following MediQU upgrade in the existing repository. Complete all feasible implementation, integration, testing, and documentation work. Preserve existing working features except for the explicitly requested replacements below. Do not stop after planning, scaffolding, or completing only the easy frontend changes.

## 1. Working rules and repository context

First inspect the current repository, its instructions, Git status, README, `docs/backend-backlog.md`, `docs/verification.md`, and relevant source. Recheck everything because this prompt describes a snapshot and the project may have changed. Preserve any existing uncommitted work. Use a separate development branch or isolated checkout as appropriate; do not publish to production or modify production data as part of this implementation.

At the time this prompt was prepared, MediQU was a React 19 / TypeScript / Vite frontend with fictional Durham clinics, simulated accounts/integrations, and browser-local persistence. There was no real backend. Important integration points:

- `src/context/AppContext.tsx`: shared state, localStorage persistence, and translation lookup.
- `src/context/interfaceTranslations.ts`: currently positional Spanish/Chinese/Arabic translations; expand safely or refactor without breaking existing locales.
- `src/services/clinicService.ts`: `ClinicDataService`, mock adapter, literal substring search, filters, and report operations.
- `src/data/mockData.ts` and `src/types.ts`: fictional fixtures, language options, and shared contracts.
- `src/pages/FindCarePage.tsx`: search/filter UI and additional client-side sorting, which must not accidentally override new relevance ranking.
- `src/pages/OnboardingPage.tsx`, `src/components/Layout.tsx`, and `src/App.tsx`: onboarding, navigation, and routing.
- `src/styles.css`, `src/components/Brand.tsx`, and `public/favicon.svg`: visual identity.
- `src/utils/report.ts`, `src/utils/time.ts`, and `src/services/locationService.ts`: reporting, visit arithmetic, and location behavior to preserve.
- `scripts/smoke-test.mjs`: existing automated coverage. `npm test` currently builds and runs smoke checks; `npm run typecheck` and `npm run build` also exist.

Before editing, establish the baseline with appropriate existing checks and a feature inventory. Record pre-existing failures separately. Maintain a requirement checklist with implementation locations, verification evidence, and remaining blockers. Plan the sequence, then execute it; routine reversible engineering decisions do not require repeated permission. Ask only when an unresolved decision materially changes scope, cost, ownership, privacy, or an irreversible action. Continue independent work while waiting.

### Preservation is a primary acceptance requirement

Extend the current application instead of rebuilding it. Do not remove a feature, weaken a test, disable a flow, or replace working behavior with a placeholder merely to simplify implementation. Refactor when needed, but retain behavior and compatible routes/contracts or provide a deliberate migration. If an unrequested breaking change is truly unavoidable, explain the exact feature affected and obtain my decision before making it.

Preserve guest care browsing; search and all existing filters; list/map synchronization; geolocation and manual fallback; clinic profiles; scheduled/walk-in/urgent distinctions; historical charts; confidence explanations; provider/review displays; quick and full reporting; saved clinics and visit planning; leave-by/arrival/finish calculations; product tour; About, Contact, footer anchors, and integration feedback; accessibility, Arabic RTL, responsive layouts, direct-route loading, and useful loading/error/empty states.

Preserve existing routes `/`, `/find`, `/clinic/:id`, `/saved`, `/report`, `/know`, and `/contact`. Keep saved visit plans distinct from actual confirmed clinic bookings.

Explicitly authorized behavior changes are: real authentication replaces account preview; account data moves to private persistent backend storage; guest personal state becomes temporary and resets on reload/tab closure; the brand palette changes; languages and search expand; and protected settings/administration are added. Update old explanatory copy and tests to reflect these intentional changes without weakening unrelated coverage.

## 2. Expand languages and recolor the site

Add Polish (`pl`), Gujarati (`gu`), and Hindi (`hi`) to page-language selection and clinic spoken-language filtering, retaining English, Spanish, Chinese, and Arabic. These are separate concepts: choosing an interface language must not silently apply a clinic-language filter.

Translate the existing interface and all new account/settings/dashboard flows, including forms, errors, dialogs, toasts, accessibility labels, and navigation. Use native-language labels, appropriate fonts, correct interpolation and locale formatting. Preserve Arabic RTL and safe translation fallbacks. Keep machine values independent of translated labels so filters and quick picks work in every locale. Add appropriate fictional language coverage for demonstrable filter tests without claiming real clinics support those languages. Do not pretend fictional proper names or externally sourced prose have been professionally translated. Identify any translations still needing native-speaker review.

Make `#2e9fe5` the primary brand color and dominant visual tone, with `#d1601a` secondary. Apply a coherent palette to backgrounds, buttons, selected states, navigation, cards, logo/favicon where appropriate, and visualizations. Use suitable tints, neutral surfaces, and darker accessible text variants; do not blindly apply white text to these colors. Preserve legibility, focus visibility, meaningful status distinctions, chart clarity, and responsive layouts.

## 3. Separate development/staging from public production

Implement a clear environment/deployment configuration so a stable public release can remain available while new work is tested separately. A Vite development server versus a production build alone does not satisfy this requirement. Provide separate development/staging and production configuration, backend resources, secrets, and deployment instructions. Keep test accounts, seeded reports, and analytics separate from production.

The public UI must not expose internal activity dashboards, account directories, moderation, or founder to-dos. In the development/staging UI, add an administrator-only top navigation entry for these tools. Require actual server/database authorization for every protected endpoint and record; a hidden tab or frontend environment flag is insufficient. Normal users on staging must not gain administrator access. Do not ship privileged data or credentials in public assets.

Document the release path: local work → staging validation → deliberate production promotion, including compatible database migrations, backup/restore, health checks, and rollback. Avoid promising literal zero downtime; design releases to preserve availability and explain real hosting limitations. Prepare configuration and deploy instructions without silently publishing or altering the existing public site.

## 4. Real signup, login, verification, and session handling

After “Continue as guest,” do not put a large repeated login/signup panel in the main care dashboard. Keep a compact login/sign-up entry at the top right beside the language selector, with a usable mobile equivalent. Once authenticated, show account/settings/logout controls instead.

Build an actual signup page collecting first name, last name, email, and password, and a separate usable login flow. Normalize email consistently and enforce uniqueness on the server. Existing accounts must not be duplicated; provide helpful sign-in/recovery guidance with responses that do not unnecessarily expose whether arbitrary email addresses are registered.

Send an email verification code, accept and validate the code, and activate the usable account only after successful verification. If the authentication provider creates a pending identity first, clearly distinguish it from an active verified account: no authenticated user-data access or active-account dashboard count before verification. Include expiry, bounded verification attempts, one-time use, resend cooldown/rate limits, pending-signup cleanup, and retry/failure states. Do not bypass verification in production.

Include password reset, password change, email-change verification if email editing is provided, logout, expired/revoked-session handling, accessible password visibility controls, validation, submission progress, and duplicate-click protection. Use established authentication/security mechanisms; never store plaintext passwords or build a frontend dictionary as the account database. Passwords are change/reset controls in settings, never readable account fields.

Authenticated users must remain signed in through ordinary reloads and return visits while their session is valid. Restore the correct account state after session restoration without flashing another user's data. Logout, account switching, deletion, session expiry, and multi-tab changes must clear private UI/cache state. Use appropriate provider-supported session protection and authorization; do not place privileged secrets in frontend environment variables.

## 5. Backend, database, and account-specific persistence

Choose and implement a coherent maintainable backend/database/auth architecture suitable for this repository. Review current official documentation before choosing new integration APIs. A managed auth provider and relational cloud database are acceptable; the earlier backlog's vendor suggestions were provisional. Explain your choice briefly, and avoid unnecessary paid services or architectural rewrites.

Deliver actual schema/migrations, access policies, APIs/server functions, frontend adapters, local/test configuration, fictional seed data, and meaningful integration tests. Keep `ClinicDataService` compatible where practical, extending typed contracts when required. Do not label in-memory stubs as a completed backend.

The backend must support:

- Shared clinics, providers, supported languages, insurance, source metadata, reports, historical estimates, and current estimate results.
- Private profiles, preferences, saved clinics, and saved visit plans tied to authenticated ownership.
- Server-validated current-wait and completed-visit reports; clinic/mode checks, sensible time validation, idempotency/deduplication, rate limits, and suspicious-report review.
- A documented, tested estimation method that accounts for recency, sample size, visit mode, and outliers, with ranges, confidence, and insufficient/stale-evidence states. Ongoing reports use elapsed time and must never be interpreted as completed visits of zero minutes. Keep Check in → Wait → Care → Check out semantics.
- Runnable background jobs for relevant estimate recalculation and external-data refresh, with retry/error handling and documented scheduling. Provide a consent-aware extension point for future requested notifications without claiming actual notification delivery if unconfigured.
- Authorized external-service adapters for clinic information, ratings, travel estimates, and booking availability where credentials and permitted sources exist. Use explicit unavailable/demo behavior for missing integrations, preserving useful existing flows. Never invent real ratings, travel routes, availability, or successful reservations.
- Authorized administration to correct clinic records and review suspicious reports, with an audit trail of administrative changes.

Account A's saved data must survive logout, login, refresh, and access from another browser/device. Account B and guests must not access it, even by directly changing IDs or calling APIs. Enforce this at the database/server boundary. Avoid stale requests or race conditions repopulating a previous account's data.

Guests must retain functional browsing, saving/planning, and reporting within the current page session, but guest-specific saved items, preferences, drafts, and customizations must return to defaults on reload or tab closure. In-memory state fits this requirement; sessionStorage alone does not, because it survives reloads. Remove or safely ignore legacy guest localStorage keys without clearing unrelated storage. Keep guest state isolated from signed-in accounts; any offered transfer into an account must be explicit and ownership-safe.

A guest's accepted report is shared backend data, not a personal saved preference: resetting the guest interface must not delete already accepted shared reports. Explain the anonymous-reporting model and retained anti-abuse identifiers accurately. Keep raw sensitive inputs and identity details out of public feeds and analytics.

Keep an explicitly labeled fictional demo/local mode usable before cloud configuration exists. In configured backend mode, show genuine service errors with retry behavior; never silently substitute demo data or pretend a failed write succeeded.

## 6. Account settings and deletion

Add a Settings tab for authenticated users, usable on desktop and mobile. Include first/last name and account controls, plus optional sex, gender, weight, height, and age fields. These personal fields start empty with clear placeholders; do not collect them during signup or invent defaults. Allow users to voluntarily enter, edit, and clear them. Specify units, validate sensibly, and distinguish sex from gender. Store them privately, separate from public reports and general activity analytics.

Provide permanent account deletion with clear consequences, explicit confirmation, and recent authentication when appropriate. Delete the auth identity and associated private profile, settings, saved plans, and saved clinics; revoke sessions and clear local state. Define how submitted shared reports are deleted or irreversibly de-identified, and document backup-retention limits honestly. Make partial failures/retries recoverable rather than leaving an apparently deleted but still usable account. Do not delete other users' records or shared clinic data. Guests do not need an account-deletion control.

Update old prototype/privacy copy to accurately describe the new data handling. Do not claim legal or security certifications that have not been established.

## 7. Founder account directory and activity dashboard

Provide a clean, access-controlled founder/admin view of verified accounts backed by the cloud database, with search, pagination, creation/verification timestamps, and useful account status. Update promptly when an account verifies or is deleted, using realtime subscriptions or clearly documented bounded refresh behavior. Do not expose passwords, auth tokens, or optional personal health-related profile fields in the routine directory. Bootstrap administrator roles through a trusted mechanism; users must not be able to grant themselves admin privileges.

The internal activity tab should show:

- Currently active users/sessions, with a documented activity window and presence expiry.
- Total verified accounts and recent signups.
- Recent and all-time saved visit-plan counts; actual booked appointments counted separately only if booking exists.
- Recent and all-time accepted wait reports, distinguishing ongoing and completed reports.
- Other useful, proportionate metrics such as report rejections or service/job failures.

Define each metric, time window, timezone, and counting/deduplication rules. Distinguish guests, accounts, and sessions rather than presenting them as interchangeable people. Use real stored events/records; label any demo metrics explicitly. Reopening a page must not increment business-event counts. Preserve aggregate counts appropriately across account deletion without retaining unnecessary identifying data.

## 8. Meaning-aware and typo-tolerant care search

Replace literal-only matching with useful semantic/intent matching and fuzzy clinic/provider-name matching. A well-tested combination of curated symptom concepts/synonyms, text normalization, weighted matching, and typo tolerance is acceptable; do not require a paid AI service simply to meet this need. Describe what the implemented algorithm actually does.

For example, “head pain” should find relevant supported care options through a headache-related concept even when the literal phrase is absent, and “Brightwel urgent car” should rank the fictional Brightwell Urgent Care highly. Preserve exact clinic/provider, specialty, neighborhood/address/ZIP, and existing symptom matches. Support multilingual search terms for common covered concepts where practical, documenting coverage rather than implying universal understanding.

Rank exact names and strong intent matches above weak fuzzy matches, use a relevance threshold, and preserve an honest no-results state for unsupported queries. Enforce every selected filter; never quietly relax insurance, language, distance, or other constraints. Define relevance ordering for nonempty searches and retain explicit nearest/shortest/reliability sorts and existing empty-query/time-of-day behavior. Check both service ranking and `FindCarePage.tsx` sorting. Protect against stale responses during rapid input changes. Keep list and map results consistent.

This is care navigation, not diagnosis: match only actual directory capabilities and preserve existing medical-emergency/safety messaging. Do not generate unsupported medical claims or send sensitive searches to an external AI service without a deliberate, documented data-handling decision.

## 9. Internal operational to-dos and setup documentation

Add an administrator-only “Launch checklist” or “Founder to-dos” section within the internal website, backed by an editable/persistent checklist. Populate it with specific outstanding work discovered during implementation: real clinic/provider data, source permissions, ratings, travel, booking, email sender configuration, cloud projects, domains, scheduling, monitoring, backups, and any necessary outside reviews. Each item should state why it matters, its status, what I must do, and how completion can be verified. Link relevant setup instructions without displaying secrets. Do not fill the list with vague “add backend” items for work you can implement now.

Create a root `README-LOCAL-SETUP.md` with exact, beginner-friendly steps for the selected cloud/auth/email services: creating projects, separating environments, applying migrations, seeding only fictional development data, setting redirect URLs and email templates, obtaining and placing credentials, creating the first administrator, running jobs, starting locally, validating verification emails, and deploying/rolling back. Follow my request to add this exact README filename to `.gitignore`, while leaving the existing main README tracked. If private setup content becomes tracked accidentally, ignoring it alone is insufficient; correct that without removing unrelated files. Never write actual secrets into documentation.

Also provide tracked `config/env/client.development.env.example` files with placeholders and a concise reproducible architecture/runbook in the normal docs so a fresh clone is understandable even though my personalized setup README is ignored. Ignore actual environment files, credentials, and generated private setup artifacts. Update the main README, backend backlog, and verification notes so old simulated-account/browser-persistence descriptions no longer contradict implemented behavior.

Perform setup steps that are possible within existing access and authorization. If a step needs my account ownership, credentials, purchase, DNS change, or an unavailable external service, complete all independent work and supply exact remaining steps. Never invent an email delivery or cloud deployment result.

## 10. Verification and completion criteria

Run the baseline suite and add focused automated integration/browser tests for substantial new behavior. Do not rely on static route/HTML smoke checks as proof that UI interactions or backend authorization work. Cover at least:

- Existing care-finding, filters, list/map, profiles, chart, reporting, planning arithmetic, tour, navigation/direct routes, and error/fallback flows.
- Seven interface languages, new spoken-language filters, stable filter values, Arabic RTL, and translated new forms/errors.
- Signup uniqueness, pending versus verified accounts, correct/incorrect/expired codes, resend/attempt limits, recovery, session restoration, logout, and deletion.
- Two different accounts plus a guest: persistence, direct API access denial, ownership tampering, account switching, multi-tab logout/session changes, and private-cache clearing.
- Guest state surviving client-side navigation but resetting on reload/new tab; no accidental legacy-storage restoration or account-data leakage.
- Report validation, retries/deduplication, spam controls, estimate eligibility, sparse/stale/outlier data, and ongoing-versus-completed separation.
- Search synonyms, typo examples, exact ranking, unsupported terms, combined hard filters, explicit sorting, and stale search responses.
- Admin access denied to guests/regular accounts at both UI and API levels; public configuration excludes internal tools/data; metrics update accurately; checklist changes persist.
- Keyboard interaction, dialog focus, responsive layout at approximately 320/390/768/1440px, long translations, and palette contrast.
- A clean local setup and migrations, with no dependency on one developer's leftover database state.

Run `npm run typecheck`, `npm test`, and any added backend/integration/browser checks as applicable. Report exactly what ran, passed, failed, or remained unverified. Fix regressions introduced by this work. Do not delete existing tests simply because implementation changed; adjust expectations only for intentional behavior changes and retain equivalent coverage.

Conclude with a concise requirement-by-requirement status, principal changes, test results, exact local startup instructions, and links to the setup README and other relevant files. Distinguish implemented-and-tested work from implemented-but-awaiting-external-configuration work and truly unimplemented items. Include any intentional compatibility changes and precise actions I must take. Do not claim the work is complete if major requested features remain placeholders. Continue until all locally feasible requested work is complete; external blockers should block only the dependent work.
