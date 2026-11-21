# Technical notes and tool credits

## Approach

Reports attach to a named graph segment. Verification excludes that segment from routes. Assignment and repair evidence leave it blocked until a separate rechecker records a pass. A failed recheck returns the case to the repair queue. The history records the actor and time of every change.

Dijkstra’s algorithm searches eligible segments from Market entrance. The step-free profile requires affirmative step-free observations. For each active case, the queue reruns both step-free trips with just that case cleared and orders cases by trips restored, metres saved on comparable trips, then verification time. This accounts for several blockers on one segment. It evaluates one repair at a time, so it can miss benefits that require clearing several different segments together.

Each browser receives a random 24-hour demo cookie. Cases and event histories share one versioned row per session. A conditional write commits new state and history together. A stale client receives the current snapshot with a `409`. Reset creates a fresh session. Expired sessions are excluded from queries. Longer hosted pilots should prune expired rows periodically.

## Boundaries and next step

The graph, observations, and evidence are synthetic. The schematic and distances describe only the modeled corridor. Each visitor can play all the simulated roles in their own session. An operator pilot needs authenticated reviewers, moderation, current field observations, and a handoff agreement. The sandbox collects structured choices and uses no personal contact details. Field validation is pending.

| Resource | Use |
|---|---|
| Next.js, React, TypeScript | Website, API, graph and workflow. Dependency versions are in `package-lock.json`. |
| Node.js, SQLite, Supabase Postgres, Vercel | Local runtime and storage. Supabase and Vercel are the hosted deployment target. |
| HTML Canvas and CSS | Original corridor schematic and brand mark. |
| Codex and OpenAI ImageGen | Software assistance and the AI-generated before-and-after illustrations. |
| Pillow and ReportLab | Web image preparation and original brand kit PDF. |
| Playwright, FFmpeg, and Windows Speech | Local production workflow verification, actual browser capture, film encoding, captions, and synthetic narration. |
| [FixMyStreet](https://fixmystreet.org/running/staff/), [Swachhata](https://www.swachh.city/assets/files/Swachhata_ULB_Admin_Module_FAQ.pdf), [AccessMap](https://sidewalks.washington.edu/2024/06/03/accessmap/) | Feature research. The fixture and software implementation are original. |
| [MoHUA accessibility guidance](https://depwd.gov.in/en/document/harmonised-guidelines-standards-for-universal-accessibility-in-india-2021/) | Reference for planning the field walk. |
