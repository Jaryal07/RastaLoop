# RastaLoop

RastaLoop shows which verified street obstructions change a trip to an essential destination and which repairs would bring the trip back. This CityFix prototype uses a synthetic corridor, sample evidence, and simulated team roles.

## Run locally

Use Node.js 24 and npm. Run these commands from the repository root.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000` for the landing page or `/demo` for the interactive corridor. A local SQLite database is created when the first demo session starts. For a production build on your computer, run `npm run build` followed by `npm start`.

## Try the case

1. Open `/demo` and choose **Reset demo** if you have visited before. The step-free clinic route is **320 m** and the bus stop is **250 m** away.
2. As **Resident**, submit the preselected ramp report. To add corroboration, choose **Add to existing case**. The route remains available while verification is pending.
3. Switch to **Reviewer**, verify the curb-ramp obstruction, and check the repair queue. The step-free clinic trip is unavailable. Switch to **Steps allowed** to see the **590 m** alternative, then switch back.
4. Switch to **Operator**, assign maintenance, and record sample repair evidence. The clinic route remains unavailable.
5. Switch to **Rechecker** and choose **Still blocked**. Repeat assignment and repair, then choose **Pass recheck**. The **320 m** step-free route returns. The history records both checks.

Use **Print handoff** on a selected case to print its location, observed barrier, priority reason, and history.

## Deploy

1. Create a Supabase project and run [the migration](supabase/migrations/202611210001_demo_sessions.sql) in its SQL Editor.
2. Create a Next.js project on Vercel using this repository. Select Node.js 24.x. Set `SUPABASE_URL` to the project URL and `SUPABASE_SERVICE_ROLE_KEY` to a Supabase server-only secret key or legacy service-role key in the hosting settings. `.env.example` lists the required names. Local runs without these settings use SQLite and accept an optional `RASTALOOP_DB_PATH` override.
3. Deploy, then confirm the production landing page and `/demo` open in a signed-out browser. Run the live API smoke test and complete the browser walkthrough.

## Verify

```sh
npm test
npm run build
```

With the app running on `http://127.0.0.1:3000`, use `npm run test:live`. Set `RASTALOOP_TEST_URL` to test another origin. The smoke test covers concurrent writes, simulated role permissions, session isolation, and reset.

The browser walkthrough lives in `test/browser.cjs`. It requires Playwright and a Chromium browser. `PLAYWRIGHT_PATH` and `RASTALOOP_CHROME_PATH` can point to an existing installation. Run with `RASTALOOP_RECORD=1` to capture the working demo. On Windows, run `video/render.py` with Pillow, FFmpeg, and Windows Speech to rebuild the film exports.

- [Technical notes and credits](docs/technical.md)
- [Field validation protocol](docs/fieldwork.md)
- [Submission index](docs/submission.md)
- [Social drafts](docs/social.md)
