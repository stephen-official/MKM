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

### Open an order (kitchen only)

`POST /`

```json
{
  "title": "Weekly staples",
  "orderNote": "Combine delivery with the regular vendor run",
  "neededBy": "2026-10-25",
  "note": "Kitchen A quantities",
  "items": [
    { "stockItemId": "PRODUCT_ID", "qtyBaseUnit": 20 }
  ]
}
```

The creating kitchen's contribution is added automatically. `items` must contain at least one available product with a positive quantity.

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
- `closed` → `open`, `ordered`, or `cancelled`
- `ordered` and `cancelled` are final

Closing the order immediately prevents kitchens from adding, editing, or removing contributions.
