# Retrying stock commands safely

Send a stable `Idempotency-Key` header on a supported command. Generate a new random key for each intentional action and retain that key and the same body across network retries. Never generate a fresh key merely because the first response timed out.

Keys contain 1–200 printable ASCII characters without spaces. They are scoped to the authenticated user, HTTP method and resource path. `/api/operations` aliases normalize to `/api`, and usage creation through `/api/orders` normalizes to `/api/consumptions`. JSON object-key order does not affect the fingerprint; array order does. Role, kitchen assignment, request body and query parameters are fingerprinted. Authentication, feature gates, authorization and product availability checks still run on every request, including retries.

| Command | Supported endpoints |
| --- | --- |
| Usage | `POST /api/orders`, `POST /api/consumptions`, `PATCH/DELETE /api/consumptions/:id` |
| Transfer acceptance | `POST /api/user-transfers/:id/accept` |
| Stock request approval | `POST /api/requests/:id/approve` |
| Distribution | `POST /api/procurement/distributions` |
| Opening balance | `POST /api/procurement/opening-balances` |
| Stock settings/removal | `POST /api/procurement/godown-stocks/:id/threshold`, `DELETE /api/procurement/godown-stocks/:id` |
| Purchase intake | `POST /api/procurement/purchase-orders` |
| Supply receipt | `POST /api/indent-requests/:id/receive` |
| Shared-order receipt | `POST /api/procurement/collaborative-purchase-orders/:id/receive` |
| Delivery settlement | `POST /api/delivery-tickets/:id/settle` |
| Usage correction approval | `POST /api/usage-corrections/:id/approve` |

The claim, stock effects and command result are saved in one MongoDB transaction. Concurrent instances compete on a deterministic unique `_id`; only one can commit the action. Failed transactions roll back the claim, allowing the same request to be retried. Reusing a committed key with different input returns HTTP 409 `IDEMPOTENCY_CONFLICT`. Malformed keys return HTTP 400 `INVALID_IDEMPOTENCY_KEY`.

Usage, distribution, opening-balance, intake and supply-receipt retries return the saved command outcome. Shared-order receipt, delivery settlement and correction approval replay the completed command without repeating its effects and then read the current detail representation; subsequent activity can therefore appear in that response. Kitchen price filtering still runs when responding to a replay. Replays skip post-commit realtime notifications; notification delivery itself is not guaranteed exactly once.

Requests without a key retain their existing behavior. Sending the header on a read or an unsupported mutation does not add retry protection. Frontend callers must retain keys across retries to benefit; this backend change does not generate keys on their behalf.

`StockCommand` records contain a hashed key identity, input fingerprint and JSON command result; raw request bodies and keys are not retained. Records have no TTL because expiring a successful claim would let a late retry move stock again. Keep them through backups and restores, and do not prune them while clients can still retry their keys. Results over 4 MiB abort with HTTP 413 `COMMAND_RESULT_TOO_LARGE`. A replica set is required, as it already is for the stock transactions. This provides at-most-one committed stock change per key, not a guarantee of successful HTTP or realtime delivery.
