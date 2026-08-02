# Hospital Observation Status Revenue Integrity

Protect reimbursement by validating observation, inpatient, and outpatient status against documentation and payer rules.

**Primary buyer:** Hospitals and utilization-management teams. **Evidence:** orders, medical-necessity evidence, timestamps, bed status, condition codes, utilization reviews, claims, payer rules, denials, and remittances.

Full local application built with React, Vite, Express, PostgreSQL, and OpenRouter. Includes 15 domain-specific capabilities, 105 custom AI workbench fields, three scenario-fill controls per feature, operational registers, workflow transitions, analytics, professional AI decision briefs, audit history, and at least 15 PostgreSQL records per capability.

## Domain capabilities

- Encounter timeline reconstruction
- Admission order validation
- Observation order validation
- Two-midnight evidence
- Condition code 44 control
- Utilization review queue
- Medical necessity scoring
- Bed-status reconciliation
- Hours and unit calculation
- Ancillary charge capture
- Claim status coding
- Denial root-cause analysis
- Appeal packet generation
- Payment reconciliation
- Status revenue analytics

Run `./start.sh`, then open <http://127.0.0.1:4644>. API: `5644`.

Administrator: `runtime-admin@example.com` / `LocalDemo!2026`. Operator and reviewer credential buttons are available on the login page.
