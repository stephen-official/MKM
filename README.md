# Montessori Kitchen Management

Inventory and supply workflow software for the Montessori Group of Schools in Kurnool. A central administration team purchases and dispatches supplies while each school kitchen records usage, requests stock, receives deliveries, and tracks its balance.

## Repository map

| Directory | Purpose | Default local URL |
| --- | --- | --- |
| `backend/` | Express API, MongoDB models, authentication, reports, and Socket.IO | `http://localhost:5000` |
| `admin-web/` | React/Vite application for central administrators | `http://localhost:5173` |
| `client-web/` | React/Vite application for kitchen staff | `http://localhost:5174` |
| `client-web/android/` | Capacitor Android wrapper for the kitchen application | Device/emulator |

Both web applications call the backend under `/api`. The backend stores operational data in MongoDB and sends live notifications with Socket.IO.

## Prerequisites

- Node.js 22 or newer and npm
- MongoDB 7 or newer. A standalone database supports basic development; transaction-based workflows require a replica set.
- Git
- Optional for Android: Android Studio, its Android SDK, and a compatible JDK
- Optional Cloudinary and email credentials for image uploads and password resets

## Quick start (local stack)

With Node.js and MongoDB installed, one script runs everything on your machine against a local database:

```bash
scripts/dev.sh up     # installs dependencies if missing, then starts MongoDB, API, admin and kitchen apps
scripts/dev.sh seed   # fills the local database with development data
scripts/dev.sh down   # stops everything
```

| Service | URL |
| --- | --- |
| Admin app | `http://localhost:5173` (`admin@example.com` / `Admin@123`) |
| Kitchen app | `http://localhost:5174` (`user@example.com` / `User@123`) |
| API | `http://localhost:5055/api` |
| MongoDB | `127.0.0.1:27018`, database `mkm_dev` |

Local state lives in `~/mkm-local`, outside the repository. The first `up` creates `~/mkm-local/backend.env` with local-only settings and fresh secrets; add Cloudinary or email credentials there if you need uploads or emails. Values in that file override `backend/.env`, so the script never connects to a remote database. Logs are in `~/mkm-local/logs`.

`seed` creates the small sample catalog above. For the full dataset (every kitchen, catalog, stock and history), ask a maintainer for `live-catalog.json`, save it as `~/mkm-local/live-catalog.json`, and run `seed` again. That path uses `seed-dev.js`, which **drops the local database** first; kitchen logins then follow the kitchen name, such as `monte@example.com` / `User@123`.

The steps below set up the same pieces by hand.

## First-time setup

1. Install each application's locked dependencies: `npm run setup`
2. Create local environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp admin-web/.env.example admin-web/.env
   cp client-web/.env.example client-web/.env
   ```

3. Replace the placeholder secrets in `backend/.env`. Never commit an `.env` file.
4. Start MongoDB, then run these commands in three terminals:

   ```bash
   npm run dev:backend
   npm run dev:admin
   npm run dev:client
   ```

5. Open the admin application at `http://localhost:5173` or the kitchen application at `http://localhost:5174`.

The API health check is `http://localhost:5000/api/health`.

### Optional development seed

`npm run seed` creates a small sample catalog and predictable development accounts. Use it only with a disposable local database; inspect `backend/src/jobs/seed.js` first. Never run it against production. It does not create a super-admin; use `create-super-admin` (below).

For a fuller local dataset, `node backend/src/jobs/seed-dev.js` loads the catalog from `~/mkm-local/live-catalog.json` (create it with `node backend/src/jobs/export-live-catalog.js`), then generates users, stock and transactions with dev credentials, including a super-admin (`superadmin@example.com`). It refuses any `MONGODB_URI` that is not `localhost`/`127.0.0.1` and **drops that whole database** before seeding, so point it at a disposable local database only.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | API and Socket.IO port; defaults to `5000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Long random access-token secret. |
| `JWT_REFRESH_SECRET` | Yes | A different long random refresh-token secret. |
| `JWT_EXPIRES_IN` | No | Access-token lifetime, such as `1d`. |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh-token lifetime, such as `7d`. |
| `ADMIN_REGISTRATION_LIMIT` | No | Legacy administrator count cap; not a security boundary. |
| `USER_REGISTRATION_LIMIT` | No | Kitchen-user count cap. |
| `CORS_ORIGIN` | Yes | Comma-separated browser origins allowed to call the API. |
| `FRONTEND_URL` | Yes | Admin console URL used in password-reset and invitation links (default `http://localhost:5173`). Kitchen users must instead use the token from the email in the kitchen app; see below. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret. |
| `EMAIL_USER` | For reset email | Sending email account. |
| `EMAIL_PASS` | For reset email | App password, not the normal mailbox password. |

### Frontends (`admin-web/.env`, `client-web/.env`)

Both applications use `VITE_API_URL`. Locally it is `http://localhost:5000/api`. Vite embeds it at build time, so set it before a production build.

On a physical Android phone, `localhost` means the phone. Set `VITE_API_URL` to an API address reachable from the device, then rebuild and synchronize Android.

## Super-admin, feature visibility and executive report

### Creating the first super-admin
Production credentials are never committed. The only committed credentials are the dev-seed ones below, which are local-only: `backend/src/jobs/seed-dev.js` refuses to run unless `MONGODB_URI` points at localhost. Run once per environment (safe to re-run):

    SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_NAME="Your Name" SUPER_ADMIN_PASSWORD='a long password' \
      npm --prefix backend run create-super-admin

Flags: `--promote` turns an existing account with that email into a super-admin and keeps its existing password (re-run with `--reset-password` afterwards to set the new password); `--reset-password` replaces the password of an existing super-admin. Local dev seed (`seed-dev.js`, local databases only) creates `superadmin@example.com` / `Super@123`; never use it against a shared or production database.

### Invitation emails
Invitation and password-reset emails link to `FRONTEND_URL`, which points at the admin console. Admins and super-admins can use the link directly. Kitchen users cannot use that link: they should open the kitchen app, choose "Forgot password?", request a reset for their email, then paste the token from the email into the reset-token screen and choose a password.

### Roles
- `super_admin` - everything an admin can do, never feature-gated, plus Executive Report, Feature Visibility, Users and Report Schedules.
- `admin` - admin console, subject to feature visibility.
- `user` - kitchen app, subject only to per-kitchen / per-user overrides.

Role and active-status changes apply on the user's next request. Their live connections are dropped at once on the server that made the change, and within 30 seconds on any other server; they rejoin the right rooms on reconnect.

### Feature visibility
Global settings apply to admins; per-kitchen overrides apply to that kitchen's users (the kitchen app in `client-web` respects them); per-user overrides win over both. Changes reach other servers within 5 seconds and admin browsers within a minute (immediately on window focus or their next blocked action). Every change is recorded in an append-only history. The route-to-feature map lives in `backend/src/features/registry.js`; `featureRouteCoverage.test.js` fails if a new route is not classified there, and at runtime an unclassified path under a protected mount answers 404 - add every new route to the registry.

### Executive report
Definitions of every figure are in `backend/src/executive/definitions.js` and in the export's Definitions sheet. Business timezone `Asia/Kolkata` (override with `BUSINESS_TZ`), currency INR. Stock figures are current (not historical). Consumption is valued at the price captured when it was recorded; consumption recorded before this release has no captured price and appears as "unvalued lines".

### Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `BUSINESS_TZ` | `Asia/Kolkata` | Day boundaries for reports and schedules |
| `REPORT_SCHEDULER_ENABLED` | `false` | Run scheduled report emails in this process (safe on several instances) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_NAME` / `SUPER_ADMIN_PASSWORD` | - | Only for `create-super-admin` |
| `FRONTEND_URL` | `http://localhost:5173` | Links in invitation and reset emails |

### Production rollout notes
- Build the new indexes before deploying on large collections (see `backend/src/models/FlowModels.js`, "Executive report indexes"), e.g. `db.consumptions.createIndex({ godownId: 1, date: 1 })`, during a quiet period.
- The database must be a replica set (already required by existing transactions).
- Run `create-super-admin` once after deploying.
- Performance check: `npm --prefix backend run test:perf` seeds a production-sized fixture covering one year of history and asserts report latency targets. Real latency with more history will be somewhat higher; re-run with larger counts (`PRODUCTION_SIZE` in `backend/src/tests/helpers/perfFixture.js`) if production data exceeds the fixture.
- Scheduled report emails need working SMTP (`EMAIL_USER` / `EMAIL_PASS`); without it, runs are recorded with status `EMAIL_FAILED`.

## Common commands

Run these at the repository root:

| Command | Result |
| --- | --- |
| `npm run setup` | Install locked dependencies in all three applications. |
| `npm run dev:backend` | Start the API with automatic restart. |
| `npm run dev:admin` | Start the admin UI on port 5173. |
| `npm run dev:client` | Start the kitchen UI on port 5174. |
| `npm test` | Run backend, admin-web and kitchen-client tests. |
| `npm run lint` | Lint admin-web and client-web. The backend has no lint script. |
| `npm run build` | Build both frontend applications. |
| `npm run check` | Run tests, lint, and both builds. |
| `npm run seed` | Seed the configured database with development data. |

Android wrapper:

```bash
npm --prefix client-web run build
npx --prefix client-web cap sync android
npx --prefix client-web cap open android
```

The last command opens Android Studio. Build and sign release artifacts there with the organization's credentials.

## Workflow glossary

The database retains some older inventory terminology. Prefer the plain-language term in user-facing work.

| Internal/legacy term | User-facing meaning |
| --- | --- |
| Godown | A school kitchen or central store with its own stock balance. |
| Stock item | A supply tracked in a unit such as kg, litre, or piece. |
| Consumption / daily usage | Supplies used by a kitchen; confirmation reduces stock. |
| Indent request | A kitchen's supply request to the central team. |
| Indent | A central procurement requirement, not a kitchen request. |
| Purchase order | Supplies ordered and received by the central team. |
| Distribution | A dispatch from central stock to kitchens. |
| Receipt | The quantity a kitchen confirms it received; this increases stock. |
| Transfer | Stock moved between kitchens when the receiver accepts it. |

Intended rule: requesting or approving supplies does not change kitchen stock; receipt does. Recording usage reduces stock, and accepting a transfer moves stock atomically.

## Beginner takeover notes

- Start with the kitchen flow: **Home → Stock → Record Usage → Supply Requests → Deliveries**.
- The backend is the authority for permissions and quantities. Hiding a React button is not authorization.
- Keep every multi-record stock change in a MongoDB transaction.
- Test both roles after workflow changes: an administrator and a user assigned to a kitchen.
- Never commit real credentials, database exports, uploads, or generated builds.
- Make local commits as work progresses. Push only when the project owner explicitly asks.

Before committing, run:

```bash
npm run check
git diff --check
git status --short
```

If full lint reports pre-existing errors, lint the files you changed and document the remaining baseline errors.
