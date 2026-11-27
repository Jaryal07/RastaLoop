# Neighborhood pilot readiness

**Status: not ready to accept real reports.** The current `/demo` workflow uses a synthetic corridor, seeded example evidence, simulated staff roles, and per-browser demo sessions. Do not enter real resident reports or use the demo as an operations system.

## Pilot boundary

- Start with one mapped neighborhood and a named, trained staff team.
- Keep synthetic demo data and real pilot records in separate environments and databases.
- Accept only a structured barrier report, an approximate location, and an optional photo. Do not request names, phone numbers, email addresses, or free-text contact details in the first pilot.
- Keep precise coordinates, if needed to resolve a report, visible only to authorized staff. Public route views must use generalized locations and must not reveal report metadata or photos.
- Label information by provenance and verification state. A resident observation is not a confirmed accessibility condition; a repair submission is not a reopened route until an independent recheck passes.

## Before collecting reports

- Publish a plain-language notice covering purpose, data collected, who can access it, how long it is retained, and how a person can request removal.
- Obtain appropriate consent before a photo is submitted. Strip image metadata such as GPS/EXIF where feasible, reject unsupported file types and oversized files, store photos privately, and review images for faces, plates, and other identifying details before any public use.
- Define a retention schedule for report locations, photos, and audit records with the pilot's data owner. Provide a tested process for deletion and for handling backups; do not retain records indefinitely by default.
- Add staff authentication, explicit least-privilege roles, and server-side authorization on every read and action. The resident-facing route must not be able to act as reviewer, operator, or rechecker.
- Add abuse controls and a human moderation path before exposing public submissions. Database row-level security is defense in depth, not a substitute for application-level validation, authorization, or rate limiting.
- Verify database backup and restore, migration rollback, alert ownership, and an incident/contact procedure before go-live.

## Field and accessibility validation

Complete `docs/fieldwork.md` with the actual surveyed corridor, dates, methods, and participant counts. Confirm segment locations, distances, crossing details, and step-free claims with people who use the routes. Record uncertainty rather than inferring accessibility from a map or photo.

Test reporting and route interpretation with keyboard, screen-reader, zoom, low-bandwidth, and mobile users, including people with varied mobility needs. Use WCAG 2.2 AA as a target for the interface; do not claim conformance until it has been evaluated.

## Release gates

Do not announce the pilot until:

1. The corridor data and its provenance have been reviewed by the neighborhood partner and accessibility participants.
2. Staff identities, role assignments, audit history, moderation, retention, private photo access, and deletion have been tested in the hosted environment.
3. Automated type, unit, API, production-build, and browser checks pass against the same deployment configuration intended for the pilot.
4. A staff member has rehearsed report review, assignment, recheck, outage handling, and restoration from backup.
5. The team has agreed on a small set of pilot success measures and stop conditions, and can pause intake without losing or exposing existing reports.

The current application does not implement these pilot controls. This checklist describes prerequisites, not a claim that the prototype currently satisfies them.
