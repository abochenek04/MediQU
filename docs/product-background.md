# MediQU product background

The patient-facing About page now focuses on Why MediQU, Patient Journey, Wait Estimates, and Reliability. The prior guide's implementation and research context is retained here for future product work.

## Data and integrity

The prototype uses fictional patient reports, clinic samples, and historical patterns. A pilot would need to compare patient-reported operational timing with clinic timestamps and label the source of every estimate. Future controls may include rate limits, duplicate detection, source weighting, statistical anomaly review, verified-visit prompts, and manual moderation. These controls are not active in this prototype.

## Privacy

Guest browsing does not require an account or medical history. Saved clinics, visits, preferences, and reports are stored in the current browser. A production system would require decisions about consent, retention, access control, security, vendors, and incident response. The prototype makes no claim of HIPAA compliance. Operational notes should not contain identifying or medical information.

## Access and product positioning

Guest access is the core experience. Account synchronization and any optional Plus planning tier remain concepts. No prices or paid services are offered. Cross-clinic total-visit planning and evidence transparency are product hypotheses to evaluate with patients, rather than researched superiority claims about other services.

## Pilot and roadmap

1. Test the prototype with patients.
2. Choose a clinic partner and a narrowly scoped pilot.
3. Validate estimates against operational timestamps.
4. Establish evidence-based freshness and confidence rules.
5. Measure patient and clinic outcomes before expanding.

Future integrations may include scheduling, check-in, clinic queue feeds, travel routing, and consent-based notifications. Any future clinical features would need separate privacy and clinical safety review.

## Architecture

The application retains React, TypeScript, Vite, the existing route helper, AppContext, shared UI components, centralized mock data, and ClinicDataService. Production APIs should replace the service adapter. They should not create separate implementations inside pages.

Clinic ratings now carry rating, reviewCount, and source. Demo clinic ratings are computed from the existing clinic reviews. Ongoing wait reports carry a distinct reportKind and elapsedMinutes; they are not completed total-visit measurements and must not be treated as such by future models. Exact report timestamps remain available in the submitted report's timing record.

The optional location adapter requests browser permission on demand, returns rounded coordinates, and stores nothing. Search computes straight-line distances to the fictional fixture coordinates. This is not live clinic discovery, traffic, routing, or travel-time data.

## Open questions

- What sample size, freshness, and source diversity make estimates useful?
- How should scheduled and walk-in demand interact in a timing model?
- How can reports be verified without unnecessary personal information?
- What motivates useful patient reporting and clinic participation?
- Which planning features warrant an account or an optional tier?

## Safety

Timing estimates are planning aids. They do not diagnose, triage, measure medical quality, guarantee duration, or justify delaying urgent care. Clinic hours, coverage, and booking arrangements must be confirmed directly.
