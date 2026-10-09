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

`npm run seed` creates a small sample catalog and predictable development accounts. Use it only with a disposable local database; inspect `backend/src/jobs/seed.js` first. Never run it against production.

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
| `FRONTEND_URL` | Yes | Frontend URL used in password-reset links. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret. |
| `EMAIL_USER` | For reset email | Sending email account. |
| `EMAIL_PASS` | For reset email | App password, not the normal mailbox password. |

### Frontends (`admin-web/.env`, `client-web/.env`)

Both applications use `VITE_API_URL`. Locally it is `http://localhost:5000/api`. Vite embeds it at build time, so set it before a production build.

On a physical Android phone, `localhost` means the phone. Set `VITE_API_URL` to an API address reachable from the device, then rebuild and synchronize Android.

## Common commands

Run these at the repository root:

| Command | Result |
| --- | --- |
| `npm run setup` | Install locked dependencies in all three applications. |
| `npm run dev:backend` | Start the API with automatic restart. |
| `npm run dev:admin` | Start the admin UI on port 5173. |
| `npm run dev:client` | Start the kitchen UI on port 5174. |
| `npm test` | Run backend tests. |
| `npm run lint` | Lint the kitchen client. Admin and backend do not yet have lint scripts. |
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
