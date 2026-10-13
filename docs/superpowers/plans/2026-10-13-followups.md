# Follow-ups: kitchen Requests tab bug + deferred review items

Branch: `feat/super-admin-executive-report`. Design of record: `docs/superpowers/plans/2026-10-12-super-admin-executive-report/README.md` (Global Constraints apply). Each task: TDD where a test is named (RED then GREEN), one or more focused commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, then root `npm test`, `npm run lint` (0 errors, warning count must not grow), `npm run build`.

Out of scope (need a partner decision, not done here): embedding a Unicode font in the PDF for non-Latin names (needs a font asset); code-splitting the 1.5 MB admin bundle; rewriting the pre-existing `react-hooks/set-state-in-effect` load-in-effect pattern across pages.

---

### Task 36: Kitchen app (client-web)

**Files:** `client-web/src/components/ClientStore.jsx`, `client-web/src/components/kitchen/KitchenHome.jsx` (and wherever the Home "Record usage"/"Start" and "+ Stock Request"/"+ Daily Request" controls live), `client-web/src/api.js`, `client-web/src/features/kitchen/featureTabs.js` + `featureTabs.test.js`.

1. **Pre-existing bug — Requests bottom tab does nothing.** `handleTabChange("requests")` sets `supplyInitialTab` and returns without `setActiveTab("requests")`. Fix: set the sub-tab to "requests" and switch to the "requests" view (respecting the feature guard — the view is gated by `indent`). Extract the tab→action decision into a pure helper in `featureTabs.js` (e.g. `tabTarget(tab) → { view, supplyTab? }`) and test that "requests" maps to `{ view: "requests", supplyTab: "requests" }`.
2. **Home controls respect flags.** When `consumption` is off, hide (not just toast) the Home "Record usage" tile and any "Start" usage hero; when `requests` is off, hide "+ Stock Request" / "+ Daily Request". Pass the computed `hidden`/flags down; keep layouts tidy when items are hidden.
3. **Don't delay ungated loads.** Initial fetches for ungated data (stock, items, godowns, me) start immediately in parallel with `/features`; only feature-gated lists wait for the flags.
4. **Single toast path.** The local guard toast and the server `FEATURE_DISABLED` toast share the same per-feature 10 s dedupe so one action never shows two toasts.

---

### Task 37: Backend deferred items

**Tests infra / roles**
1. `tests/helpers/db.js` `stopDb`: `try { disconnect } finally { stop }`.
2. `realtime.test.js`: `setIo(null)` in `finally`.
3. `superAdminBranches.test.js` indent-requests test: also assert a non-owner kitchen user gets 403 (so the branch change is guarded).
4. `roleGuard.test.js`: also flag direct comparisons with `"user"`; replace remaining literals in backend (e.g. registration `role !== "user"`) and admin-web (`UserForm.jsx`, `userForm.js`, `UsersPage.jsx`) with `ROLES.USER` / `isKitchenRole`.

**Feature flags**
5. `featureFlagService`: generation counter so an in-flight load that started before a write cannot repopulate the cache with pre-write state (test with a deferred findById).
6. On E11000 / conflict, report the actual current version (re-read) instead of guessing `+1`.
7. Cached flag objects are frozen (`Object.freeze`) so callers cannot mutate the cache; test that mutation throws in strict mode or has no effect.
8. Stale-fallback test mocks `console.warn` and asserts it was called (pristine output).
9. Conflict test at `expectedVersion > 0` (two writers at v1).
10. `listAudit` validates `scope` against the enum and lower-cases `targetId` at the service level.
11. HTTP tests: `GET /api/features` 503 for an admin when flags are unavailable; `PUT` `INVALID_FEATURE_VALUE`; `PUT` `NO_CHANGES`.
12. Override endpoints: 403 tests for admin and kitchen user on GET/PUT; `GET /overrides/:scope/:targetId` validates `targetId` with `isValidObjectId` (404 `TARGET_NOT_FOUND` otherwise, no cache entry); `listOverrides` marks entries whose target no longer exists (`targetExists: false`); fix the stale "(Phase 6)" comment.

**Executive report**
13. `definitions.js` texts state the normative details: procurement spend uses the PO's received date; consumption uses the recorded date, falling back to the business date of creation for non-ISO dates.
14. `parseReportParams`: an explicit `to` within 29 days of `MIN_DATE` with no `from` clamps `from` to `MIN_DATE` instead of failing.
15. `normalizeBusinessDate`: only ISO-8601 strings (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm…`) and Date objects are parsed; loose strings ("2026", "Oct 5") fall back; `null`/invalid fallback uses now. Tests.
16. `priceLines` failure (valuation read error) must not block recording consumption: catch, store null prices, log a code. Test with a mocked valuation failure → consumption saved with nulls.
17. Duplicate legacy stockItemIds in `oldItems`: keep the first non-null price deterministically; test. Add tests for `purchaseOrderPrices` with a `stockItemIds` filter and for an item with only invalid PO prices.
18. Consumption section: `VALUED` requires a finite number (exclude NaN/±Infinity); top-items qty tie-break on `round3(qty)`; previous-period zero check on `round2(prevValue) === 0`; lines with null `stockItemId` group as "Unknown item"; replace the weak `notEqual(deltaPct, null)` assertion with the exact value; add a regression test where an ISO `date` disagrees with `createdAt` (backdated counted on its date, forward-dated excluded).
19. Stock section: low-stock sort on the raw ratio (round only for display); tests for "Deleted item" fallback, a low-and-unpriced row, and that an inactive kitchen's rows never appear in all-kitchens lists.
20. Procurement: leftover fixture uses a non-zero leftover qty (so summing leftovers would fail the test); share one price-validity aggregation expression constant between valuation and procurement.
21. `buildReport`: KPI/section assembly guarded so a missing KPI/section key degrades that entry to `status:"error"` instead of a 500; add `/summary` tests for kitchen user (403) and no token (401); silence the expected `console.error` in the failing-section test (mock and assert). Keep comparison rows for kitchens with only current pending requests, with a code comment explaining why.
22. Perf fixture: add DailyUsage and Indent documents and a populated previous period; index-plan test covers Indent (`createdAt`, `status`) and DailyUsage queries.
23. Exports: one `exportTimeoutError()` factory; Excel "Top items" sheet notes `tiedBeyondLimit`; drop the redundant `Buffer.from`; tests for `listLimit` slicing, an errored section rendering its message, and `buildExportReport` mapping TIMEOUT → 504 and other failures → 500 `EXPORT_INCOMPLETE`.
24. PDF: top-items block shows the tied-beyond-limit note; test that `export.pdf` is 403 for admins.

**Users**
25. `POST /api/users`: create user + audit row in one transaction; send the invite after commit.
26. Map E11000 to `EMAIL_EXISTS` only when the duplicate key is `email`; otherwise 500.
27. PATCH: always re-check inside the transaction that the actor is still an active super-admin (not only on demotion); guard `req.body` being undefined.
28. `send-reset` on an inactive user → 409 `USER_INACTIVE`; deactivating a user clears `resetToken`/`resetTokenExpiry`; reactivating a super-admin requires `confirmSuperAdmin: true`.
29. Tests: mass-assignment (`PATCH` with `email`, `passwordHash`, `refreshToken` ignored), refresh-token revocation on deactivation and on kitchen change, the items above; silence the expected invite-failure `console.error` (mock + assert); fix the mismatched assertion message in the inactive-kitchen test.

**Schedules**
30. `DELETE /report-schedules/:id` also deletes its `ReportRun` rows.
31. A run failing with `KITCHEN_NOT_FOUND` deactivates the schedule (`active:false`, `lastError: "KITCHEN_NOT_FOUND"`).
32. Tests: runner PDF path; `ATTACHMENT_TOO_LARGE` (mock the renderer to return >10 MB); real `mailer.sendReportEmail` maps recipients to `bcc` and the service address to `to` (mock `nodemailer.createTransport`).

---

### Task 38: Admin-web deferred items

1. `roles.test.js`: undefined, unknown strings ("superadmin"), `isSuperAdmin("user")`/`(null)`.
2. `logout()`: if the access token is expired, try one refresh before calling `/auth/logout` (best effort, never throws); vitest test with mocked axios.
3. Feature flags provider: sequence refreshes with `createRequestTracker` (latest wins); clear `error` after a successful refresh; ignore `FEATURE_DISABLED`-triggered refreshes within 2 s of the last one; while `status === "loading"` for non-super-admins, render a loading state instead of the routes (no flash, no wasted 403); sync the stored role from `/features` `audience` — if it differs from the session role, update the session (super_admin→admin shows the admin nav; kitchen audience logs out with a message).
4. Feature Visibility: `.switch { position: relative }`; Reload disabled while in flight and refreshes the audit list too; no trailing space in "Save"; `diff.test.js` cases for a key absent from `saved` and all-pruned edits; load kitchens/users lazily when their tab is first opened; the info banner text matches the active tab.
5. Executive Report: when `godownId` ≠ all, wait for the kitchen list (or its failure) before the first summary fetch; canonicalise uppercase ids and an explicit `range=30d`; the kitchen-reset banner is not re-shown on a browser reload (ignore location state when navigation type is POP from reload); custom-range `DateField`s get `min = to − 365 days` / `max` so an invalid span can't be picked; preset chips use `aria-pressed` buttons (not `role="radio"` without arrow keys).
6. Trend chart: label the axis minimum and draw/label the zero line when negatives exist.
7. InfoTip: Escape closes it even when opened by hover (document keydown while open); mouseleave does not close it while the button has focus.
8. `download.test.js`: malformed JSON blob with a JSON content type → null.
9. Users page: own row disables role select and Active checkbox (with a hint); show "Showing first 1000 users" in the Per-user overrides target list when the total exceeds the items returned.
10. Report Schedules: deleted kitchen shows a disabled "Removed kitchen" option (not "All kitchens"); Run now has an in-flight guard and reloads the list; extract `buildSchedulePayload(form)` into `scheduleText.js` with tests; on `VERSION_CONFLICT` reload and re-open the form on the fresh row.
11. Executive copy: correct plurals ("1 distribution", "1 purchase order", "1 recipient" already fine) via a small `plural(n, one, many)` helper with a test.
12. README: clarify that committed dev-seed credentials are local-only (`seed-dev.js` refuses non-local databases) next to "Credentials are never committed".
