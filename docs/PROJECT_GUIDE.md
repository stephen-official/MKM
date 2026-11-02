# MKM — Montessori Kitchen Management: Project Guide for a New Collaborator

This guide is for an AI coding assistant (or a developer) joining the project with no prior context. It explains what the system does, how it is built, where things live, and the rules to follow when changing it. The root `README.md` covers setup and commands; this guide covers how the system works. Where they disagree, the code is the authority. Check it before acting on anything here.

---

## 1. What the product is

The Montessori Group of Schools in Kurnool, India, runs several school kitchens. A **central administration team** buys supplies and sends them to the kitchens. Each **kitchen** records what it uses, asks for more stock, receives deliveries, and tracks its own balance.

MKM is the software for that supply chain. It has three deployable parts:

| Part | Folder | Used by | Tech |
|---|---|---|---|
| API server | `backend/` | Both apps | Node 22, Express 4, Mongoose 8 (MongoDB), Socket.IO 4, ES modules |
| Admin console | `admin-web/` | Central admins and super-admins | React + Vite, react-router, axios, lucide-react icons, vitest |
| Kitchen app | `client-web/` | Kitchen staff (role `user`) | React + Vite, mobile-first UI, also wrapped as an **Android app with Capacitor** (`client-web/android/`) |

Both frontends call the backend under `/api`. Business timezone is **Asia/Kolkata**; currency is **INR (₹, en-IN grouping)**.

Deployment (from the code): the backend runs behind a proxy on Render (see the rate-limiter comment in `backend/src/app.js`). Both frontends are on Vercel: `vercel.json` has SPA rewrites, and `https://mkm-user.vercel.app` / `https://mkm-self.vercel.app` are in the CORS allow-list. The Capacitor app ID is `com.stephenofficial.mkm`.

---

## 2. Vocabulary (read this first)

The code uses older inventory terms. Use the plain term in anything a user sees.

| Code term | Meaning |
|---|---|
| **Godown** | A location with its own stock balance: a school kitchen or the central store. A kitchen user is tied to one godown (`User.godownId`). |
| **Stock item** | A tracked supply (rice, oil…) with a base unit (kg, litre, piece). All quantities are stored in the base unit as `qtyBaseUnit`. |
| **Stock group** | A category of stock items. |
| **Unit / sub-unit** | Units of measure and conversions. |
| **GodownStock** | One row per (godown, stock item): current quantity `qtyBaseUnit` plus low-stock `thresholdBaseUnit`. **This is the stock balance.** |
| **Indent request** | A kitchen asks the central team for supplies (`IndentRequest`). |
| **Indent** | A central purchasing requirement created by admins (`Indent`). It is *not* a kitchen request. |
| **Purchase order (PO)** | Supplies bought and received centrally (`PurchaseOrder`). |
| **Distribution** | Splitting received PO stock across kitchens (`Distribution`, with `allocations` and `leftovers`). |
| **Transfer** | Stock moved from one godown to another. The receiving kitchen accepts or rejects it (`Transfer`). |
| **Usage** | Stock a kitchen used (`Consumption`). Every product, including products labelled `daily_use`, is stock-backed; prices and first-expired-first-out (FEFO) batch allocations are captured when usage is recorded. |
| **Request** | A kitchen asks admins to approve a usage record (`Request`, `requestType` = `usage`; legacy values remain readable). Approval deducts kitchen stock and creates a Consumption record. **This is not the same as an indent request.** |

---

## 3. Roles and authentication

Exactly three role strings, used everywhere (DB enum, JWT, localStorage, tests):

- `super_admin`: everything an admin can do, **never feature-gated**, plus four pages only super-admins see: Executive Report, Feature Visibility, Users and Report Schedules.
- `admin`: uses the admin console. Pages can be switched off by feature flags.
- `user`: a kitchen staff member, using the kitchen app, tied to one godown.

Rules:
- Never compare `role === "admin"` or `role === "user"` directly. Use the helpers: `isAdminRole`, `isSuperAdmin`, `isKitchenRole` and `ROLES`. They live in `backend/src/utils/roles.js` and `admin-web/src/roles.js`. The kitchen app only has a `Roles` constant in `client-web/src/types.js`. `roleGuard.test.js` catches direct comparisons in the backend.
- `authorize(["admin"])` automatically also admits `super_admin`. `authorize(["super_admin"])` admits only super-admins.
- Auth uses a JWT access token plus a refresh token (`backend/src/utils/tokens.js`, `routes/authRoutes.js`). `middleware/auth.js#authenticate` reloads the user from the DB **on every request**, so role, kitchen and active-status changes apply on the user's next call.
- Admin-web stores `accessToken` and `userRole` in localStorage. Client-web stores `token` and `refreshToken`. Both axios clients (`*/src/api.js`) refresh automatically on a 401.
- Public `POST /api/auth/register` rejects `admin` and `super_admin` (403). Super-admins are created only with `npm --prefix backend run create-super-admin` (see README).
- Kitchen users reset passwords inside the kitchen app by pasting the emailed token. The emailed link (`FRONTEND_URL`) points at the admin console.

---

## 4. Backend architecture (`backend/src`)

```
server.js        HTTP server + Socket.IO auth/rooms + scheduler start
app.js           Express app: CORS, JSON, /uploads static, route mounts, error handler
config/          env.js (validated env), db.js (Mongo connect)
middleware/      auth.js (authenticate, authorize)
features/        registry.js (route → feature map), featureGate.js, featureFlagService.js
routes/          one router per area (below)
controllers/     productLedgerController.js (the only controller; other logic lives in routes)
executive/       Executive report engine: buildReport, sections/*, valuation, Excel/PDF exports, schedule
models/          Mongoose schemas
jobs/            seed scripts, create-super-admin, reportScheduler
utils/           roles, tokens, mailer (nodemailer), money, pagination
tests/           node:test suites + helpers/ (in-memory Mongo replica set)
realtime.js      io proxy so routes can emit without importing server.js
```

### Route mounts (`app.js`)
`/api/auth` is public and rate-limited. Every other mount goes through `authenticate → featureGate → router`:

| Mount | Router | Covers |
|---|---|---|
| `/api/inventory` | inventoryRoutes | Master data lookups and CRUD for stock-groups and godowns (generic `/:type`), Excel export. Writes to `stock-items` are refused (use `/api/products`) and units are read-only presets. Kitchens only get complete, unarchived products from `GET /stock-items`; admins get a `productCount` on each `GET /stock-groups` row (archived products included) |
| `/api/products` | productRoutes | The product catalog (Products page): list with completeness, create/edit, preset units, image upload, archive/restore. Prices and archiving are super-admin only. `GET /export/excel` and `GET /import-template` give the same workbook (`catalog/productWorkbook.js`): locked Product ID (`productNo`, P-0001, permanent, `assignMissingProductNos` fills gaps), a note row under the headings, dropdowns from a hidden Lists sheet (groups and pack names from the database and open to new ones; units, type, food facts and Yes/No fixed), one Yes column per allergen, 3 pack slots. `POST /import` matches rows by Product ID (blank = new), creates typed-in groups (dropped again if unused), keeps pack prices on admin uploads, refuses older layouts. `GET /export/pdf` is the read/print list (`catalog/productPdf.js`) |
| `/api/product-requests` | productRequestRoutes | Kitchens ask for a missing product; admins approve (creating or linking the product) or reject with a reason |
| `/api/procurement/collaborative-purchase-orders` | collaborativePurchaseOrderRoutes | Shared orders kitchens start and join; admin approve, supplier/invoice, dispatch; kitchen photo upload and receive with FSSAI details. See `docs/COLLABORATIVE_PURCHASE_ORDERS_API.md` |
| `/api/ordering-settings` | orderingSettingsRoutes | Needed-by options, emergency period and ordering window (super-admin writes) |
| `/api/suppliers` | supplierRoutes | Admin supplier records (name, 14-digit FSSAI licence, phone, active) |
| `/api/delivery-tickets` | deliveryTicketRoutes | Delivery problems kitchens raise while receiving (list, settle: accept a quantity into stock, follow-up order for the shortfall) |
| `/api/usage-days` | usageDayRoutes | A kitchen's day-by-day usage account (recorded / no usage / missed, last 30 days, plus every "no usage" mark for History) and `POST /none` to mark a day as "no usage". There is no kitchen undo: a marked day stays closed (usage on it is refused with `DAY_CLOSED`) until an admin approves a correction |
| `/api/usage-corrections` | usageCorrectionRoutes | A kitchen asks to change what it recorded and an admin approves or rejects it. Kinds: `reopen_day` (a "no usage" mark made by mistake, with the usage to record once it is removed) and `edit_usage` (new lines for a usage record, `consumptionId`; no lines = cancel it). The ask keeps a `before` snapshot and `recordUpdatedAt`; approve applies it inside one transaction through `recordConsumption` / `applyConsumptionEdit` / `removeConsumption` (exported from operationsRoutes) and refuses with `RECORD_CHANGED`, `RECORD_GONE` or `CANNOT_APPLY` (e.g. stock too low) without changing anything. A product no longer available to kitchens may stay or go down on an ask (it was already used); only a new or larger line needs an available product (`PRODUCT_UNAVAILABLE`). `DELETE /:id` lets the kitchen take back a pending ask. Errors are `{ code, message }` |
| `/api/procurement` | procurementRoutes | Indents, purchase orders, distributions, godown-stock thresholds, stock balance |
| `/api` **and** `/api/operations` | operationsRoutes | Unified usage records, requests (approve/reject), transfers and user-transfers, godown-stocks, notifications. **Mounted twice on purpose.** featureGate normalises the alias. |
| `/api/reports` | reportRoutes | Generic per-entity listings and Excel exports |
| `/api/indent-requests` | indentRequestRoutes | Kitchen indent requests: create, confirm, reject, receive |
| `/api/product-ledger` | productLedgerRoutes | Per-item movement history |
| `/api/features` | featureRoutes | Feature flags, overrides, audit |
| `/api/executive` | executiveRoutes | Executive report JSON + `export.xlsx` / `export.pdf` (super-admin) |
| `/api/users` | userRoutes | User management (super-admin) |
| `/api/report-schedules` | reportScheduleRoutes | Scheduled report emails (super-admin) |

### Models (`models/`)
- `InventoryModels.js`: StockGroup, Unit, Godown, StockItem (catalog fields: `pricePerUnit`, `brand`, `productCode`, `soldInPacks` + `packs[{name,size,price}]`, `expiryRequired` (default true; kitchens must enter an expiry when receiving), `archived`)
- `CollaborativePurchaseOrderModel.js`: shared orders (`contributions[]` per kitchen with lines; `neededBy`, `closesAt` (a super-admin may move it, see `PATCH /:id/closing-time`), per-kitchen `adminChange` (what the kitchen had before a super-admin changed its items, until it taps OK), `supplierId`, `invoiceNo`; lines carry approval, dispatch, delivery times and the `trackingId` of the batch they became)
- `SupplierModel.js`: Supplier (name unique ignoring case, `fssaiLicence` 14 digits, phone, active)
- `DeliveryTicketModel.js`: DeliveryTicket (one problem line: reason short/excess/damaged/wrong_item/expired, usable `receivedQtyBaseUnit`, note, voice note URL, the receiving details for the usable part, `resolution` once settled)
- `CounterModel.js`: named running numbers; `stock/trackingId.js` turns `batch-YYMM` into `MKM-YYMM-NNNN`
- `ProductRequestModel.js`: ProductRequest (a kitchen's request for a product not in the catalog)
- `NoUsageDayModel.js`: NoUsageDay (a day a kitchen closed on purpose: reason closed/holiday/other, note; one per kitchen and date)
- `UsageCorrectionModel.js`: UsageCorrection (a kitchen's ask to change a recorded day: `kind` reopen_day | edit_usage, date, consumptionId, proposed `items`, `before` snapshot, recordUpdatedAt, status pending/approved/rejected, admin decision)
- `FlowModels.js`: IndentRequest, Indent, PurchaseOrder, GodownStock, Distribution, Consumption, Request, Transfer, Notification, plus the **executive report indexes**
- `StockBatchModel.js`: priced stock batches per kitchen/product, including received date, expiry, lot, condition, notes and remaining quantity, plus the kitchen receiving details (`trackingId`, `mfgDate`, `storage`, `photos.goods/label`, `supplierName`, `supplierFssaiLicence`)
- `DailyUsageModel.js`: legacy DailyUsage shape, used only by the one-time usage-log migration
- `User.js`: User (`role`, `godownId`, `active`, reset token fields, edit version)
- `FeatureModels.js`: FeatureFlags (versioned singleton `_id: "global"` plus overrides), FeatureFlagAudit (append-only)
- `AdminAuditModels.js`: UserAdminAudit
- `ReportScheduleModels.js`: ReportSchedule, ReportRun

### Where stock quantities actually change
These are the only places that write `GodownStock.qtyBaseUnit`. Every one of them runs inside a **MongoDB transaction**, which is why the DB must be a replica set.

| Event | Code | Effect |
|---|---|---|
| Admin creates a distribution | `routes/procurementRoutes.js` `POST /distributions` | `$inc` each allocated kitchen's stock **at dispatch time** (upsert) |
| Kitchen receives an indent request | `routes/indentRequestRoutes.js` `POST /:id/receive` | Increases kitchen stock by the received quantity |
| Kitchen receives a shared order | `routes/collaborativePurchaseOrderRoutes.js` `POST /:id/receive` | Adds every line on the way to kitchen stock and creates one StockBatch per line with a tracking ID, photos, expiry and the order's supplier. Refuses the whole receipt if any line lacks a photo or a required expiry. A line sent with `problem` becomes a DeliveryTicket instead and stays out of stock |
| Admin settles a delivery problem | `routes/deliveryTicketRoutes.js` `POST /:id/settle` | Adds the accepted quantity (0 up to what usably arrived) as a StockBatch from the ticket's details, marks the order line delivered with that quantity, optionally opens a follow-up shared order for the shortfall |
| Kitchen/admin records consumption directly | `routes/operationsRoutes.js` `handleStockProcessing` (`POST /consumptions`, legacy `POST /orders`) | Checks for enough stock, then decrements it. Emits `low_stock_alert` |
| Admin approves a usage Request | `operationsRoutes.js` `POST /requests/:id/approve` | Decrements stock FEFO and creates a Consumption with the request reason. A future target date is recorded as the approval day |
| Kitchen accepts a transfer | `operationsRoutes.js` `POST /user-transfers/:id/accept` | Moves stock from source to destination atomically |
| Edits and deletes of usage | `operationsRoutes.js` `PATCH/DELETE /consumptions/:id` | Replays FEFO allocations and adjusts stock by the difference |

`GodownStock.qtyBaseUnit` remains the fast aggregate balance. `StockBatch.remainingQtyBaseUnit` explains that balance by receipt and price. New inward stock creates a batch; consumption and accepted transfers deduct batches first-expired-first-out (`stock/batchService.js` `fefoOrder`): soonest `expiryDate` first (an expired batch before everything, since using it is warned about but allowed), then undated batches (opening balances, distributions) oldest `receivedAt` first, and they capture their allocations. `GET /my-kitchen-stock` adds each item's dated lots (`expiries: [{ date, qtyBaseUnit }]`, soonest first, no batch ids or prices) so the kitchen app marks the same stock "use first", and `suppliers: ["Name", …]` (A–Z, from the batches still in stock) so the Stock screen can show where an item came from. Existing balances without batches are treated as an opening batch at the product's current price on first use, or can be initialized ahead of deployment with `npm --prefix backend run migrate-stock-batches` (dry run; add `-- --apply` explicitly).

The README states the *intended* rule: "requesting or approving supplies does not change stock; receipt does." **Distributions do not follow it yet**: they credit kitchen stock as soon as they're dispatched. Usage always changes `GodownStock`; there is no untracked write-only usage path.

Legacy `DailyUsage` rows can be moved into the unified log with `npm --prefix backend run migrate-usage-log` (dry run; add `-- --apply` explicitly). The dry run also lists every active-kitchen/daily-use-product pair without a stock row. Enter real opening balances before rollout; the migration intentionally does not invent quantities.

### Feature visibility (feature flags)
- **Single source of truth:** `features/registry.js`. `FEATURES` lists the 10 toggleable keys: inventory, indent, purchase-orders, stock-distribution, godowns, transfer-stock, requests, consumption, reports, product-ledger. `ROUTE_RULES` maps every HTTP route to `open`, `lookup` or `feature(…)`.
- `featureGate.js` enforces it. A disabled feature returns **403** `{ code: "FEATURE_DISABLED", feature, message }`. **Any path under a protected mount that the registry does not classify returns 404 (fail closed).**
- `featureRouteCoverage.test.js` fails if a route is missing from the registry or a rule matches no route. **Every new route must be added to the registry.**
- How flags combine: super_admin is never gated. For admins: defaults, then the global flags, then that user's override. For kitchen users: defaults, then the kitchen's override, then the user's override. Every default is `true`.
- Writes use optimistic concurrency (`expectedVersion` → 409 `VERSION_CONFLICT`) and write an audit row in the same transaction. The server cache has a 5 s TTL. Clients refetch on load, on focus, every 60 s, and right after any `FEATURE_DISABLED` response.

### Product catalog (`catalog/`)
- Units are a fixed preset list in `catalog/units.js` (kg, g, L, mL, pcs, dozen, packet). Kitchens enter quantities in exactly these units, with no conversion. To add a unit, change that list (the admin and kitchen apps each keep a copy, marked "keep in step").
- A product is **complete** when it has a group, a preset unit, a price per unit, and, if "ordered in packs", at least one pack where each has a name, a size and a price (`catalog/completeness.js`). Incomplete or archived products are hidden from kitchen pickers and refused on every kitchen write (`requireAvailableProducts` in `catalog/productService.js`). Kitchens still see stock they hold, marked "Unavailable".
- Food-safety facts for FSSAI record-keeping (`catalog/foodSafety.js`, mirrored in `admin-web/src/pages/products/foodSafety.js`, "keep in step"): `kind` (food | non_food), and for food `vegMark` (veg | non_veg | egg), `storage` (room | fridge | freezer), optional `form` (packaged | loose) and `allergens` (the FSS Labelling 2020 list). A new product must say its kind; a food product is incomplete (hidden from kitchens) without its veg mark and storage. A product saved before these existed has no kind: it stays available but is flagged (`fssaiMissing`, list status `fssai`, `counts.fssai`) until someone edits it, so a rollout never hides stock kitchens hold. Delivery-level FSSAI facts (supplier licence, lot, dates, condition, label photo) live on StockBatch, not the product. `expiryRequired` is no longer asked on the form: once a product has a kind, the server sets it (food that is not `loose` → true; loose food and non-food → false).
- Admins and super-admins add and edit products. Only a super-admin may set or change a price (product or pack) or archive. When an admin changes a pack's size, that pack's price is cleared. Archiving is refused while any kitchen holds stock.
- `npm --prefix backend run migrate-product-catalog` prints how existing units map onto the presets and which products are still incomplete; add `-- --apply` to merge look-alike units (e.g. "Kgs" → kg).
- Pack selections now flow through kitchen supply requests, central indents, purchase-order intake and stock distribution. Workflow lines keep an immutable pack snapshot (`packId`, name, size, quantity and price where applicable), while `qtyBaseUnit`/`orderedQty`/`receivedQty` remain authoritative for stock arithmetic and old records remain valid. Kitchen and admin stock views derive labels such as `3 × 25 kg bag + 4 kg` from the base-unit balance. Kitchen usage can be counted in a product's pack (bags, tins) or in the base unit; the Use screen converts and sends `qtyBaseUnit` plus the pack snapshot (`packId`, `packName`, `packSize`, `packQuantity`), which `POST /orders` and `POST /consumptions` keep on the consumption line when it agrees with `qtyBaseUnit`.

### Realtime (Socket.IO)
- Sockets authenticate with the access token (`server.js`). Rooms: `admins` (all admin-tier users), the godown id and `kitchens` (kitchen users), and `user:<id>`.
- Routes emit through `realtime.js`'s `io` proxy. Before `setIo()` runs (tests, scripts), emits do nothing.
- When a user's role, kitchen or active flag changes, `disconnectUser` drops their sockets on this instance. `revalidateSockets` runs every 30 s on every instance to catch changes made elsewhere.
- Common events: `new_request`, `request_approved`, `request_rejected`, `low_stock_alert`, `consumption_updated`, `consumption_deleted`.
- Live kitchen lists: after any write a kitchen can see, routes call `notifyKitchen(godownId, topic)` or `notifyKitchens(topic)` (`realtime.js`), which emit `kitchen:changed { topic }` with topic `stock | orders | requests | usage | indents | transfers | flags`. Product and feature-flag routers do this with one after-response hook. The kitchen app re-fetches just that list. **When you add a route that changes kitchen data, call one of these.**

### Executive report (`executive/`)
A super-admin dashboard and export built from one function, `buildReport.js`. The JSON API, Excel (`excelExport.js`, exceljs) and PDF (`pdfExport.js`, pdfkit) all use it, so their totals match by construction.
- Sections: `sections/consumption.js`, `stock.js`, `procurement.js`, `requestsTransfers.js`, `comparison.js`. Each section fails on its own: one broken section degrades to `status: "error"` instead of failing the whole report.
- Every figure is defined in `definitions.js`, which also feeds the export's Definitions sheet. Valuation rules are in `valuation.js`. Request parameters are parsed in `params.js` (inclusive business-date range, max 366 days, no future dates, default last 30 days).
- Stock figures are *current* snapshots labelled "Estimated". Historical stock is not reconstructed. Consumption is valued at its captured price; older records without one appear as "unvalued lines".
- Money: round half away from zero to 2 decimals **once, at the end**. The frontend never computes money totals; it only formats numbers from the API.
- Scheduled emails: `jobs/reportScheduler.js` + `executive/schedule.js`. Enabled with `REPORT_SCHEDULER_ENABLED=true`. Safe across several instances (at-most-once claiming). Needs SMTP (`EMAIL_USER`/`EMAIL_PASS`); without it, runs are recorded as `EMAIL_FAILED`.

### Error format
New endpoints return `{ code: "SCREAMING_SNAKE_CASE", message, ...details }`. Older routes often return `{ error: message }` or `{ message }`. Match whichever style the file you're editing already uses.

---

## 5. Admin console (`admin-web/src`)

- `App.jsx`: auth gate. Non-admin roles see "Access restricted". It wraps the shell in `FeatureFlagsProvider` and builds routes from the nav config.
- `components/navItems.js`: `NAV` (10 feature pages, each with a `feature` key) and `SUPER_NAV` (4 super-admin pages), plus `WORKSPACE_NAV` / `SUPER_WORKSPACE_NAV` (the workspaces the nav shows, each with tabs; the Master data workspace (`/catalog`) has the tabs Products · Kitchens · Kitchen requests, and a tab with `pendingCount` shows its pending count). `features/featureNav.js` builds the nav sections and the route guards.
- `components/Layout.jsx`: the shell, which mirrors the kitchen app (2026-11-01): a glass header with the brand and Log out, and one nav listing every entry — a floating pill at the bottom of a phone (scrolls sideways when there are many entries) and a glass sidebar on a laptop (≥ 1024 px). The main area is a fixed-height scroll box; pages size their panes to it (`height: 100%`).
- `components/ui/index.jsx`: the shared UI kit (PageHeader, DataTable, SplitView, DetailPanel, RailList, Field, DateField, Banner, EmptyState, ErrorState, LoadingState, StatusBadge, Button, Meta…), plus `useConfirm.jsx`. **Reuse these. Don't add new ad-hoc components.**
- Styling: the admin wears the kitchen app's glass look — Inter, a pale blue wash, frosted white panels, pill buttons, glass segmented tabs. `theme.css` holds the tokens (the kitchen block is copied from `client-web/src/index.css`, keep in step), `glass.css` the primitives (`.kg-*`, `.ks-*`, `.app-header`, `.app-nav`, `.section-nav`, copied from `client-web/.../kitchen-ui.css` and `KitchenStock.css`, keep in step), `styles.css` the components. Executive pages have `pages/executive/executive.css`.
- Toasts: `toast.jsx` / `useToast.js`. Excel exports in the browser use `xlsx-js-style`.

| Page | Purpose |
|---|---|
| Products | The master product list as glass cards like the kitchen Stock screen (picture banner, facts, Edit/Archive chips), a floating search pill and status filter chips; add/edit popup (`products/ProductForm.jsx`, closes only by its cross or buttons): a required photo (kitchen staff pick by picture; uploaded through `stock/photoStorage.js`, Cloudinary or the local uploads folder), name, group, unit and price first; Food safety (FSSAI) as choice chips (food or not, veg/non-veg, kept in, how it arrives, allergens, expiry tick); packs as a yes/no, one row per pack with `PackNameSelect` (built-ins incl. Packet, names added by you each with a minus that deletes the name, Other… to type one); brand, code, low-stock warning and daily-use behind a "More details" fold. Products without a photo (older ones, spreadsheet imports) stay available but carry a "No photo" badge and filter (`counts.noPhoto`, status `nophoto`). Cards show the food-safety summary and an "FSSAI details needed" badge; the "FSSAI details" chip and an info banner count them. Super-admins see how many products wait on them for a price (`counts.needsPrice` on the Products tab and in the banner). Export opens a format choice (Excel to edit and upload back, PDF to read or print); Bulk add explains the three steps, offers the template and takes the file, then shows every row's outcome in a modal. Kitchen product requests are their own Catalog tab (`/catalog/requests`) with status chips (Waiting first) and a search |
| Kitchens (`InventoryPage.jsx` + `pages/kitchens/`, Master data tab "kitchens") | Each kitchen (and the central store; godowns, the word is not shown) is a fold-out glass card. Opened: the kitchen read-only with Edit (name and logo, one Save at the bottom; logo via `POST/DELETE /inventory/godowns/:id/logo`, shown in the kitchen app's header through `/me`) and Delete kitchen (refused while anything points at it, `GODOWN_IN_USE`). Super-admins also see its users (`/users?role=user`), each with Login ID (email), password and WhatsApp number (`User.phone`, stored +<country><number>, `utils/phone.js`): a pencil (edit name, Login ID, WhatsApp and optionally a new password, one Save) and a power icon (Disable/Enable) beside the name, and "Add user" folding out Name, Login ID, Password, WhatsApp (all required in the form; no invite email), and Show a password they set — sealed with `PASSWORD_VIEW_KEY` (env, never in the DB; `utils/passwordVault.js`), kitchen accounts only, every look audited (`view-password`), cleared when the user resets their own. Kitchen details: address, person in charge, phone (digits), and one central-store mark (`Godown.isCentralStore`, the card shows a "Central store" pill); create/update take only these fields. Each user also shows Last signed in (`User.lastLoginAt`, recorded at login from 2026-11-02), can be moved to another kitchen from its edit form (signs them out), and has a WhatsApp button that opens wa.me with their sign-in details (`KITCHEN_APP_URL` in `pages/kitchens/kitchenUsers.js`; nothing is sent by the server) |
| Settings (`SettingsPage.jsx`, `/settings`, super-admin only, own nav entry under Manage) | Tabs Units · Pack names · Product groups · Ordering rules, each with a plain-words explanation. Units: the 7 built-in (`catalog/units.js`) plus ones added here (`Unit.offered`, `POST/DELETE /products/units`; built-in and in-use units cannot be removed; the allowed list is held in memory and refreshed at start-up, on change and each minute). Pack names: built-in plus custom (stored `PackName` + names on products, `GET/POST /products/pack-names`; removing one takes it off products via `/products/pack-types/remove`). Groups: add, rename, remove when empty (`Other` built in). Ordering rules edit `/api/ordering-settings` (version-checked). Everything added here feeds the product form, the kitchen request sheet and the Excel dropdowns |
| Purchasing › Planning (route `/indent`) | `pages/planning/`: kitchen shared orders still gathering (open, or closed and waiting for approval) as fold-out cards, soonest needed-by first. Opened: the ordering window (Close now; super-admins Change time in a tap-only popup, up to 2 days before needed-by), each kitchen's items (super-admins change them in a popup until approval) and all items with totals. New order (any admin) starts an order for any kitchen, the central store too. The old indent screens (`IndentPage.jsx`, `pages/indent/`) are no longer routed and will be removed |
| Purchase Orders | Receive goods against purchased indents (Intake) and history; **Shared orders** tab (approve, supplier + invoice + bulk expiry, mark ordered, dispatch); **Problems** tab (`pages/problems/`, settle delivery problems); **Suppliers** tab (`pages/suppliers/`) |
| Stock Distribution | Allocate received PO stock to kitchens (splits, leftovers) |
| Godowns | Stock levels per godown, low-stock thresholds; **Expiring** tab (`pages/godowns/`, kitchen batches expired or expiring within 7/14/30 days) |
| Transfer Stock | Create godown→godown transfers; activity log |
| Requests | Approve or reject kitchen usage requests |
| Consumption | View, edit or delete the unified usage log; edits and deletes synchronize stock. **Corrections** tab (`pages/consumption/CorrectionsPanel.jsx`): each kitchen ask in two or three plain lines (`correctionSummary.js`, tested), a Details modal with the before/after table, Approve (applies the change and reloads the records) or Reject with a note |
| Reports | Generic per-entity record browser with Excel export |
| Product Ledger | Movement history of one item in one godown |
| Executive Report* | KPI dashboard, charts, kitchen comparison, Excel/PDF export |
| Feature Visibility* | Toggle pages globally, per kitchen or per user; change history |
| Users* | Create users, change role or kitchen, deactivate, send password reset |
| Report Schedules* | Schedule emailed executive reports; run history |

\* super-admin only. Bigger pages split their sub-views into folders: `pages/indent/`, `pages/executive/`, `pages/features/`, `pages/ledger/`, `pages/schedules/`, `pages/users/`, `pages/consumption/`.

---

## 6. Kitchen app (`client-web/src`)

- Mobile-first, with a bottom tab bar (`components/kitchen/KitchenBottomNav.jsx`): **Home · Stock · Orders · History**. The Stock tab lands on **Record** (usage) and has section tabs Record · Stock levels. The Orders tab (id `requests`) lands on **Ongoing** (orders still on their way, plus transfers waiting for Accept / Reject) and has section tabs Ongoing · New order · Transfer (the stock-transfer builder, view `new-transfer`). The History tab lands on **Usage** (KitchenActivity) and has section tabs Usage · Orders (delivered and cancelled orders, view `orders-history`; the older indent-request screen SupplyRequestsDeliveries at `#/past-requests` has no link in the app any more) · Transfers (KitchenTransfers, sent to / by this kitchen). The Orders tab shows a "!" badge only while an unsent order draft from Home needs quantities. (KitchenMore exists but has no entry in the nav at the moment.)
- `components/ClientStore.jsx` is the main container and state holder. Screens live in `components/kitchen/`: KitchenHome ("Use first" list of expired/expiring stock), KitchenStock (expiry line per item), KitchenUsageScreen (expired and expiring-within-7-days items first, with "N days left" banners; expired stock is warned about, not blocked; a day already marked "no usage" shows one closed-day card with "Edit" instead of the list and ticket; in correction mode (ClientStore `correction`, started by Edit on Home, Record or History) the same screen opens on the record's day with the ticket pre-filled, the record's own quantities count as available again, lines for products the kitchen may no longer use stay on the ticket reduce-only (`lockedItems`) and are not listed below, and "Send to admin" posts a correction instead of recording), KitchenActivity (usage records and "no usage" days together, each with Edit, the correction's status and "Take back" while it waits), KitchenOrders ("Ask for supplies", shared orders; when a super-admin changed this kitchen's items, the order shows "Your admin changed items · Tap to see" here and on Home, opening AdminChangeDialog with each item more / less / new / removed until the kitchen taps OK) with KitchenReceiveItems (per-item photos, expiry, batch, storage on receipt, or a problem report with reason, usable amount, note and voice note; the label photo is read on the phone with Tesseract.js (`utils/labelOcr.js`, worker + WebAssembly core served from `/ocr` by a plugin in `vite.config.js`, English data committed at `public/ocr/eng.traineddata.gz`) and `features/kitchen/labelScan.js` turns the text into expiry, made-on and batch number, filling only what it found; a failed read leaves the form untouched), SupplyRequestsDeliveries, KitchenReceiveDelivery (old indent flow), KitchenTransfers, KitchenActivity, KitchenMore, and others.
- Pure logic lives in `features/kitchen/`: `workflows.js`, `selectors.js`, `normalize.js`, `status.js`, `featureTabs.js`, `orders.js`, `receiving.js`, `expiry.js` (days left, "use first" order), `labelScan.js` (label text → dates and batch number) and `corrections.js` (the correction that matters for a day or a record, the cart pre-filled from a record, History entries from usage plus no-usage marks). Tests run with `node --test`. **Put new logic there and test it.**
- `features.js` / `featureToast.js`: kitchen-side feature flags. Disabled controls are **hidden**, not just blocked with a toast.
- `socket.js`: Socket.IO client. `App.jsx` shows toasts for realtime events. `liveUpdates.js`: `useKitchenChanges(topics, onTopic)` re-fetches a list when the server sends `kitchen:changed` (burst settling in `features/kitchen/liveChanges.js`); `useRefetchOnReturn` re-fetches everything after a socket reconnect or when the app returns to the foreground. The header's Refresh button does the same by hand.
- Android: `npm --prefix client-web run build && npx --prefix client-web cap sync android`, then build in Android Studio. On a phone, `VITE_API_URL` must be a reachable address, not localhost.
- Main flow to understand first: **Home → Stock → Record Usage → Supply Requests → Deliveries**.

---

## 7. Development workflow

### Commands (repo root)
| Command | What it does |
|---|---|
| `npm run setup` | `npm ci` in all three apps |
| `npm run dev:backend` / `dev:admin` (5173) / `dev:client` (5174) | Run locally |
| `npm test` | Backend (`node:test`), admin-web (`vitest`), client-web (`node --test`) |
| `npm run lint` | ESLint for both frontends. The backend has no linter |
| `npm run build` | Build both frontends |
| `npm run check` | Test + lint + build. **Run this before every commit** |
| `npm --prefix backend run test:perf` | Executive report latency check on a production-sized fixture |

Local data: `npm run seed` (small), or `node backend/src/jobs/seed-dev.js`, which gives a fuller dataset and a dev super-admin `superadmin@example.com` / `Super@123`. **It drops the whole database and refuses any non-localhost URI.**

### Testing conventions
- Backend: `node:test` + `node:assert/strict`, files at `backend/src/tests/*.test.js`. Helpers live in `tests/helpers/`, which the test glob doesn't match. `helpers/db.js` starts an in-memory **replica set**, so transactions work. HTTP tests use `supertest` against `app`.
- Admin-web: `vitest`, **pure logic only**. There is no DOM-testing library, so keep logic in plain `.js` modules next to the pages (for example `pages/executive/format.js` + `format.test.js`).
- Client-web: pure logic tests in `features/kitchen/*.test.js`.
- Write the failing test first for bug fixes and new logic. Keep test output clean: mock and assert any expected `console.error`/`console.warn`.

### Rules that matter
1. **The backend is the authority** for permissions and quantities. Hiding a button in React is not authorization.
2. **Every multi-document stock change runs in a Mongo transaction** (`session.withTransaction`).
3. **Every new route goes into `features/registry.js`**, or it returns 404 and the coverage test fails.
4. Use the role helpers. Never write string comparisons against role names.
5. Money is rounded once at the end. The frontend never sums money.
6. Dates for reports are business dates (`YYYY-MM-DD`) in `BUSINESS_TZ`. Use the existing helpers (`businessDateOf`, `normalizeBusinessDate` in `backend/src/executive/params.js`). Don't call `new Date().toISOString().slice(0,10)`.
7. Test with both an admin and a kitchen user after any workflow change.
8. Never commit `.env` files, credentials, DB exports, `uploads/` or build output.
9. Commits: Conventional Commits (`fix(scope): …`, `feat(scope): …`), small and focused. **Push only when the project owner asks.** Work on a feature branch, never directly on `main`.
10. Match the style of the file you're in. Newer code is tidy and well-commented; older route files are looser. Don't reformat unrelated code.

### Environment
See the README tables. Key backend variables: `MONGODB_URI` (replica set), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `CLOUDINARY_*`, `EMAIL_USER`/`EMAIL_PASS`, `BUSINESS_TZ`, `REPORT_SCHEDULER_ENABLED`. Frontends need `VITE_API_URL`, which is baked in at build time.

---

## 8. Current state of the project (as of 2026-10-16)

- Active branch: **`feat/super-admin-executive-report`**, about 80 commits ahead of `main` and not yet merged. It added the super-admin role, feature visibility (global, per kitchen, per user), the Executive Report with Excel/PDF exports, user management, scheduled report emails, and many hardening fixes.
- Design and plan documents: `docs/superpowers/plans/2026-10-12-super-admin-executive-report/README.md` lists the "Decisions" and Global Constraints, and the per-phase files sit next to it. Follow-ups are in `docs/superpowers/plans/2026-10-13-followups.md` (Tasks 36–38), and the git log shows them implemented. **Read the plan README before changing roles, flags or the executive report.**
- Decided out of scope for now (needs the owner's decision): a Unicode font for non-Latin names in the PDF; code-splitting the ~1.5 MB admin bundle; rewriting the existing load-in-`useEffect` pattern flagged by `react-hooks/set-state-in-effect` lint warnings. **Lint must have 0 errors, and the warning count must not grow.**

### Known issues and debt
- **Kitchen app:** `components/RefreshButton.jsx` is `position: fixed` at bottom-right and covers the "More" tab in the bottom nav on phones. Not fixed yet.
- **Stock rule mismatch:** distributions credit stock at dispatch, which contradicts the README's "receipt changes stock" rule (see section 4).
- **Confusing names in the admin nav:** "Requests" (usage approvals) vs Indent → "Requests" (supply requests). "Godowns" is both a page and a tab in Inventory Info. The Reports page largely repeats history tabs that other pages already have. A nav cleanup has been discussed but not done. Feature keys in `registry.js` and the labels in `navItems.js` must stay in sync if anything is renamed.
- `shared/` at the repo root holds old copies (`PurchaseOrdersPage.jsx`, `procurementRoutes.js`, `types/`). Nothing imports them. Don't edit them by mistake.
- Stray files at the repo root (`basmati rice.jpg`, `sunflower.jpg`, `images.jpg`, `gcm-diagnose.log`) aren't part of the app.
- `client-web/README.md` is the untouched Vite template.
- Older route files mix response shapes and indentation. Don't do sweeping refactors without asking.

---

## 9. Where to look for…

| Task | Start here |
|---|---|
| Add or change an API endpoint | `backend/src/routes/<area>Routes.js` + `features/registry.js` + a test in `backend/src/tests/` |
| Change who can do what | `middleware/auth.js`, `utils/roles.js`, `features/registry.js` |
| Add an admin page | `admin-web/src/pages/`, `components/navItems.js`, `App.jsx` `routeMap`, and a feature key in `registry.js` if it should be toggleable |
| Change a kitchen screen | `client-web/src/components/kitchen/`, logic in `features/kitchen/` |
| Change an executive figure | `backend/src/executive/sections/*`, `definitions.js`, matching tests `executive*.test.js` |
| Stock maths or a balance bug | The table in section 4 + `controllers/productLedgerController.js` (movement history) |
| Emails | `backend/src/utils/mailer.js` |
| Realtime events | `backend/src/realtime.js`, `server.js`, `client-web/src/socket.js` |

When unsure about intended behaviour, especially anything that changes stock quantities, permissions or money, **ask the project owner before changing it.**
