# Backend module boundaries

HTTP routes live in `backend/src/routes`. Feature behavior lives in `backend/src/modules`.

| Layer | Responsibilities | Allowed dependencies |
| --- | --- | --- |
| Routes | Authentication/authorization, request adaptation, transaction ownership where explicit, realtime notifications, presentation | Feature services, presenters, rules, shared HTTP helpers |
| Services | Commands and reads, business policy, orchestration | Models, own repository/rules, another feature's service or rules, shared infrastructure |
| Repositories | Queries, population, projections | Models and shared infrastructure |
| Rules | Validation and domain calculations | Domain constants and shared utilities |
| Models/infrastructure | Schemas, storage, stock batches, ordering windows | Other infrastructure; never routes or application startup |

Services receive explicit inputs and actor information, not Express request/response objects. Never import helpers from route files. Cross-feature repository access is prohibited; call a service or a rules module instead. Keep dependencies one-way so modules can be imported without starting Express.

## Features

- `collaborative-orders`: contributions, review, purchase/lifecycle, dispatch, receiving, presentation and queries. Summary lists explicitly exclude history; details retain it.
- `delivery-tickets`: settlement of receiving problems and follow-up order creation.
- `consumption`: recording, editing and removing usage; valuation shared with stock requests.
- `transfers`: pending transfer creation, queries, acceptance and rejection.
- `stock-requests`: request creation, queries and decisions with consumption/return effects.
- `distributions`: allocations, leftover reuse and distribution queries.
- `stock-adjustments`: opening balances, thresholds and stock removal. This does not introduce a general quantity-adjustment API.
- `operations`: population configuration shared by the domain routers.
- `stock-commands`: durable command claims and retry results saved with the stock transaction. The HTTP header adapter lives in `shared/stockCommandHttp.js`; services receive a plain command context.

The operations parent router mounts domain routers at `/`, retaining both `/api` and `/api/operations` aliases. Procurement mounts distributions and stock adjustments at `/` under `/api/procurement`. Feature-gate tests recursively enumerate these child routers.

## Transactions and side effects

The caller must pass the same MongoDB session to every stock balance, batch, consumption, audit and source-record write in a command. Functions documented as running inside the caller's transaction must not start nested transactions. Receiving and delivery settlement own their transaction; route-owned transactions remain explicit in the other domains. Do not parallelize MongoDB operations inside a transaction.

Send HTTP success and realtime notifications after commit. `recordConsumption` saves low-stock notifications in the transaction and collects their realtime alerts for the caller to send with `emitLowStockAlerts` after commit, so a rolled-back or retried command sends none; an outbox is the future mechanism for guaranteed notification delivery. Notifications are not durable transaction records.

## Enforcement

Run `npm --prefix backend run lint`. The backend ESLint configuration enforces import direction and prohibits cross-feature repository imports. It deliberately does not enforce formatting or apply a general lint cleanup to legacy files. Keep route-coverage, authorization, stock-transaction and kitchen-price tests green when moving boundaries.

The root `npm run lint` and `npm run check` include the backend boundary rules. See [stock-command retry behavior](STOCK_COMMAND_IDEMPOTENCY.md) before adding a stock-changing endpoint.

## Error handling

Async HTTP handlers use `asyncRoute` and forward failures to the application error middleware. `errorResponse` owns serialization. Routes declare compatibility policies with `legacyErrorPolicy` or `typedErrorPolicy` when an endpoint has an established envelope, status, duplicate-key mapping or text-export error. This retains existing API contracts while removing repeated catch/respond blocks. New endpoints should use the default `{ code, message }` operational-error envelope.

Keep catches that implement local recovery or business decisions, such as handling a malformed import workbook, collecting row errors, or translating a failed correction into `CANNOT_APPLY`. Transaction cleanup belongs in `finally`. Idempotency errors always use their standard status and `{ code, message }` envelope even on legacy endpoints. Unknown failures on routes without a compatibility policy still receive the existing generic global response.
