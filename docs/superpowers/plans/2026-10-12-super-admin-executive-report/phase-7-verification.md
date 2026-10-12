# Phase 7 — Verification and documentation

Depends on every phase that was executed. If any Phase 6 task was cut, skip its checklist lines and say so in the report.

---

### Task 35: Full check, end-to-end walkthrough, docs

**Files:**
- Modify: `README.md` (root) — new "Super-admin, feature visibility and executive report" section
- Modify: `backend/.env.example` if it exists (otherwise document the variables in the README section only)

- [ ] **Step 1: Automated checks**

Run: `npm run check`
Expected: backend tests, admin-web tests (and client-web tests if Task 29 ran), lint for both apps, and both builds all succeed. Paste the summary lines (`# pass N`, `# fail 0`, vitest totals, build output sizes) into the task report. Any failure blocks completion — fix it, do not skip it.

Run: `npm --prefix backend run test:perf`
Expected: three PASS lines with p95 values within targets (README Decision 8). Paste the numbers.

Run: `grep -rnE "role\s*[!=]==?\s*['\"](admin|super_admin)['\"]" backend/src admin-web/src client-web/src --include='*.js' --include='*.jsx' | grep -v "utils/roles.js\|src/roles.js\|/tests/"`
Expected: no output.

- [ ] **Step 2: End-to-end walkthrough (local, dev seed)**

Use the `run` skill (or the project README's local setup) to start backend, admin-web and client-web against a local MongoDB seeded with `node backend/src/jobs/seed-dev.js`. Walk through and tick each:

1. Super-admin `superadmin@example.com` signs in; every existing admin page works; Executive section shows Executive Report, Feature Visibility (and Users, Report Schedules if built).
2. Admin `admin@example.com` signs in in another browser profile; no Executive section; `/executive-report` redirects home.
3. Feature Visibility: hide Reports → admin loses Reports within 60 s / on focus; `GET /api/reports/indents` as admin returns `{ code: "FEATURE_DISABLED", feature: "reports", … }`; history row recorded. Show it again.
4. Hide Purchase Orders only → admin's Stock Distribution page still lists POs; Purchase Orders page shows "currently disabled".
5. Executive Report, All kitchens, 30 days: KPIs, trend, top items, stock health, unpriced list, procurement, requests/transfers, comparison all render; "Data updated at" shows IST; ⓘ tooltips readable by keyboard.
6. Select one kitchen from the comparison table → URL and data change; comparison disappears; procurement spend KPI disappears.
7. Custom range across a month boundary; invalid URL (`?from=2026-02-30&range=custom`) is replaced by the default; Reset clears filters.
8. Excel export: Summary KPI values equal the tiles exactly; filename follows the convention. PDF export (if built) likewise.
9. Record a consumption in the kitchen app (client-web) → refresh the report → consumption value rises by exactly qty × the kitchen's latest distribution price.
10. (If built) Per-kitchen override hides "Use" for one kitchen's cooks only; per-user override restores it for one cook.
11. (If built) Users: create a kitchen user (invite), change an admin to kitchen user (their next request is refused), cannot deactivate yourself.
12. (If built) Report Schedules with `REPORT_SCHEDULER_ENABLED=true`: "Run now" produces a run row (success with SMTP configured, `EMAIL_FAILED` without).
13. Phone width (360 px) in devtools: report page, Feature Visibility and Users have no horizontal page scroll.

Record anything that deviates as a bug and fix it before continuing (systematic-debugging skill).

- [ ] **Step 3: Documentation**

Add to the root `README.md`:

```markdown
## Super-admin, feature visibility and executive report

### Creating the first super-admin
Credentials are never committed. Run once per environment (safe to re-run):

    SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_NAME="Your Name" SUPER_ADMIN_PASSWORD='a long password' \
      npm --prefix backend run create-super-admin

Flags: `--promote` turns an existing account with that email into a super-admin; `--reset-password` replaces the password of an existing super-admin. Local dev seed (`seed-dev.js`) creates `superadmin@example.com` / `Super@123`.

### Roles
- `super_admin` — everything an admin can do, never feature-gated, plus Executive Report, Feature Visibility, Users and Report Schedules.
- `admin` — admin console, subject to feature visibility.
- `user` — kitchen app, subject only to per-kitchen / per-user overrides.
Role and active-status changes apply on the user's next request; socket rooms update on their next reconnect.

### Feature visibility
Global settings apply to admins; per-kitchen overrides apply to that kitchen's users; per-user overrides win over both. Changes reach other servers within 5 seconds and admin browsers within a minute (immediately on window focus or their next blocked action). Every change is recorded in an append-only history. The route-to-feature map lives in `backend/src/features/registry.js`; `featureRouteCoverage.test.js` fails if a new route is not classified there — add every new route to the registry.

### Executive report
Definitions of every figure are in `backend/src/executive/definitions.js` and in the export's Definitions sheet. Business timezone `Asia/Kolkata` (override with `BUSINESS_TZ`), currency INR. Stock figures are current (not historical). Consumption is valued at the price captured when it was recorded; consumption recorded before this release has no captured price and appears as "unvalued lines".

### Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `BUSINESS_TZ` | `Asia/Kolkata` | Day boundaries for reports and schedules |
| `REPORT_SCHEDULER_ENABLED` | `false` | Run scheduled report emails in this process (safe on several instances) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_NAME` / `SUPER_ADMIN_PASSWORD` | — | Only for `create-super-admin` |
| `FRONTEND_URL` | `http://localhost:5173` | Links in invitation and reset emails |

### Production rollout notes
- Build the new indexes before deploying on large collections (see `backend/src/models/FlowModels.js`, "Executive report indexes"), e.g. `db.consumptions.createIndex({ godownId: 1, date: 1 })`, during a quiet period.
- The database must be a replica set (already required by existing transactions).
- Run `create-super-admin` once after deploying.
```

- [ ] **Step 4: Final review request**

Use the `superpowers:requesting-code-review` skill for a whole-branch review against this plan's README (Global Constraints, Review Focus, Decisions). Address findings with `superpowers:receiving-code-review`.

- [ ] **Step 5: Commit**

```bash
git add README.md backend/.env.example 2>/dev/null; git add README.md
git commit -m "docs: super-admin, feature visibility and executive report

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Then hand off with `superpowers:finishing-a-development-branch`.
