# Collaborative Purchase Orders API

Base path: `/api/procurement/collaborative-purchase-orders`

All endpoints require a bearer access token. Kitchen users can read every collaborative order, open an order, and manage their own kitchen's contribution while it is open. Admins can read every order and control its status.

Quantities are always stored and returned in the product's base unit. Pack fields are optional snapshots and follow the same format as the existing procurement APIs.

## Endpoints

### List orders

`GET /?status=open&page=1&limit=25`

Available statuses are `open`, `closed`, `ordered`, and `cancelled`. The response contains `items`, `page`, `limit`, `total`, and `pages`.

### Get one order

`GET /:id`

The response includes each kitchen contribution plus `kitchenCount` and `combinedItems`, which totals each product across all kitchens.

### Open an order (kitchen, or admin on a kitchen's behalf)

`POST /`

```json
{
  "title": "Weekly staples",
  "orderNote": "Combine delivery with the regular vendor run",
  "neededIn": "1w",
  "note": "Kitchen A quantities",
  "items": [
    { "stockItemId": "PRODUCT_ID", "qtyBaseUnit": 20 }
  ]
}
```

The creating kitchen's contribution is added automatically. `items` must contain at least one available product with a positive quantity.

When the items are needed is chosen, not typed: send `neededIn` (`1d`, `3d`, `1w`, `2w` or `1m`) or `"emergency": true` (needed within 1 hour). The server stores `neededBy`, `emergency` and `closesAt` on the order; a typed `neededBy` date is ignored and the request fails with 400 unless `neededIn` or `emergency` is given.

`closesAt` is when other kitchens can no longer join. The order stays open for whichever is longer: the time until `neededBy` minus 3 days, or 25% of the time until `neededBy`. For example, needed in 10 days closes after 7 days; needed in 5 hours closes after 1¼ hours; an emergency closes after 15 minutes. The figures live in `backend/src/ordering/window.js`.

An admin opens an order for a kitchen by also sending `godownId`. The contribution then belongs to that kitchen, which can edit it like its own, and the same product availability rules as for kitchens apply.

### Join an open order (kitchen only)

`POST /:id/contributions`

```json
{
  "note": "Kitchen B quantities",
  "items": [
    { "stockItemId": "PRODUCT_ID", "qtyBaseUnit": 12 }
  ]
}
```

A kitchen can have only one contribution per order.

### Edit the current kitchen's contribution

`PUT /:id/contributions/me`

The body is the same as the join request. It replaces that kitchen's complete item list.

### Leave an order

`DELETE /:id/contributions/me`

The kitchen that originally opened the order cannot leave it, but can edit its contribution. Other kitchens may leave while the order is open.

### Change lifecycle status (admin only)

`PATCH /:id/status`

```json
{ "status": "closed" }
```

Allowed transitions:

- `open` → `closed` or `cancelled`
- `closed` → `ordered` or `cancelled`
- `ordered` and `cancelled` are final

A closed order is never reopened; a kitchen that still needs items starts a new order, or an admin opens one on its behalf.

Closing the order immediately prevents kitchens from adding, editing, or removing contributions. Once `closesAt` passes, the order is closed automatically (with `statusChangedBy: null`) the next time any order is read or changed.

## Errors

Errors are `{ "code": "...", "message": "..." }`. Codes: `INVALID_INPUT` (400), `FORBIDDEN` (403), `NOT_FOUND` (404), `ORDER_CLOSED` (409, the order no longer accepts additions or changes), `ALREADY_JOINED` (409), `CONFLICT` (409, other conflicts such as a disallowed status change), `PRODUCT_UNAVAILABLE` (409).
