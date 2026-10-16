# Upgrade requirement and preservation checklist

Branch: `codex/mediq-platform-upgrade`. Original untracked `docs/next-version-implementation-prompt.md` is preserved. Implementation and local verification completed September 28, 2026; external deployment/provider validation is not claimed.

## Baseline and sequence

The baseline typecheck and smoke suite passed. Original product inventory: seven routes, six fictional clinics, guest search/filter/list/map, location/manual fallback, profiles/providers/reviews/charts/confidence, quick/full reports, saved clinics and visit plans, planning arithmetic, tour, About/Contact/footer, four locales including RTL. Account preview and persistent guest storage are intentionally replaced.

Executed sequence: baseline/architecture → durable API/auth/schema/jobs → account/settings/admin → search/languages/palette → integration/browser regression checks → reproducible setup/release documentation.

| Requirement | Implementation and verification evidence | Status |
| --- | --- | --- |
| Preserve routes and care features | Existing pages/components; original smoke assertions and browser care/direct-route suites | Implemented and tested |
| Seven interface and clinic languages | `translate.ts`, six named locale catalogs, 529-key audit; seven-language/RTL and new spoken-filter browser tests | Implemented; native-speaker review outstanding |
| Blue/orange accessible palette | CSS, brand/favicon/charts; core contrast 4.83:1 or better; responsive/focus browser checks | Implemented and tested; full external accessibility review outstanding |
| Separate staging/public environments | Strict server configuration, database environment marker, forced release builds, independent Render templates; public admin chunk/API exclusion checks | Implemented and tested locally; cloud setup pending owner |
| Real verified accounts and recovery | Better Auth/SQLite, hashed OTPs, real email adapter, account pages; lifecycle/expiry/cooldown/recovery/session tests | Implemented and tested locally; real sender delivery pending owner |
| Durable private account data | SQL migrations and owner-scoped API; two accounts plus guest, reopened database and second-device tests | Implemented and tested |
| Temporary guest state | Memory-only AppContext, targeted legacy key cleanup; reload/new-tab/SPA tests | Implemented and tested |
| Shared reports, estimates and jobs | Server validation/deduplication/rate limits/review, recency/sample/outlier estimation, retry/retention jobs | Implemented and tested; external refresh adapter awaits licensed source |
| Settings and deletion | Private optional fields, password controls, atomic cascade and verification-record scoping; browser/API tests | Implemented and tested; real hosting backup policy pending owner |
| Admin account directory and activity | Trusted CLI role grant, server authorization, search/pagination, 30-second refresh, defined aggregate/presence metrics | Implemented and tested for development/staging; production private operations remain pre-launch work |
| Moderation and corrections | Review queue, restricted clinic updates, transactionally recorded audit trail | Implemented and tested in protected internal environment |
| Meaning-aware/fuzzy search | Shared weighted matcher, multilingual curated concepts, hard filters, recommended vs explicit sorts and stale-response guard | Implemented and tested; finite vocabulary documented |
| Persistent launch checklist | Twelve seeded tasks with reasons/actions/verification, translated copy, editable status/notes; persistence and audit tests | Implemented and tested |
| External integrations | Typed server-only directory/ratings/travel/booking/consent-aware notification registry; unavailable/error states | Extension points implemented; vendor-specific integrations not implemented without source authorization |
| Setup/release documentation | Exact ignored local README, tracked examples, runbook, architecture/data policy/backlog/verification | Complete; local configuration, migrations, seed, jobs and backup executed |
| Regression/API/browser checks | Typecheck, smoke, six API groups, seven browser suites, translations, palette, both release builds, diff hygiene | Passed; details in `docs/verification.md` |

## Deliberate compatibility changes

Verified accounts replace the preview. Account private data is now persisted by the server. Guest saved items, preferences and tour/drafts reset on a full reload/new tab; accepted backend reports remain shared. Legacy MediQU personal storage keys are removed without clearing unrelated storage. Language choices expand to seven; search defaults to recommended relevance and preserves explicit sorts. Plans remain distinct from bookings. Prototype-only assurances about browser-local data were replaced with the implemented privacy model. All original routes remain available.

## Exact remaining owner actions

Follow `README-LOCAL-SETUP.md` and `docs/runbook.md`: create separate hosting services/disks, provision secrets, verify a Resend sender and real delivery, attach HTTPS domains, configure monitoring and off-host backups, authorize real clinic/provider sources and vendor integrations, establish private production operations, and complete outside reviews. None of these steps was represented as an executed cloud deployment or purchase. Local implementation is usable without them through the private development mailbox and fictional seed.
