# Collaborative Purchase Orders API

Base path: `/api/procurement/collaborative-purchase-orders`

All endpoints require a bearer access token. Kitchen users can read every collaborative order, open an order, and manage their own kitchen's contribution while it is open. Admins can read every order and control its status.

Quantities are always stored and returned in the product's base unit. Pack fields are optional snapshots and follow the same format as the existing procurement APIs.

## Endpoints

### List orders

`GET /?status=open&page=1&limit=25`

Available statuses are `open`, `closed`, `approved`, `ordered`, and `cancelled`. The response contains `items`, `page`, `limit`, `total`, and `pages`.

### Get one order

`GET /:id`

The response includes each kitchen contribution plus `kitchenCount` and `combinedItems`, which totals each product across all kitchens.

What a kitchen user sees is limited: its own contribution is complete, but other kitchens' contributions list only `stockItemId` per item (no quantities, pack details or note), and `combinedItems` lists products without `qtyBaseUnit`. Admins see everything. As on every endpoint, price fields (`packPrice`, pack `price`, `pricePerUnit` and so on) are removed from kitchen responses by `kitchenPriceFilter` (`backend/src/utils/kitchenSafe.js`).

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

`closesAt` is when other kitchens can no longer join. The order stays open for whichever is longer: the time until `neededBy` minus 3 days, or 25% of the time until `neededBy`. For example, needed in 10 days closes after 7 days; needed in 5 hours closes after 1¼ hours; an emergency closes after 15 minutes. These are the default figures; a super-admin can change them (see below). Orders keep the dates worked out when they were opened.

## Ordering settings

Base path: `/api/ordering-settings`

`GET /` (any signed-in user) returns `{ settings, version }`. `settings` holds `neededInOptions` (`{ key, label, hours }` for the "needed by" dropdown), `emergencyHours`, `closeBeforeHours` and `minOpenShare`. `version` is 0 until the figures are first saved, and the defaults in `backend/src/ordering/window.js` apply until then.

`PUT /` (super-admin only) with `{ expectedVersion, settings }` saves all four figures. If someone else saved since `expectedVersion`, it fails with 409 `VERSION_CONFLICT`. Figures outside these limits fail with 400 `INVALID_INPUT`: 1–10 options with unique short keys, labels up to 30 characters and 1 hour to 1 year each; emergency 15 minutes to 24 hours; closing before delivery 0–60 days; shortest window 5%–95%.

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

The body is the same as the join request. It replaces that kitchen's complete item list, with two limits once an admin has approved something:

- An approved line (it has `approvedAt`) must come back unchanged, and no other line may name the same product. Otherwise the request fails with 409 `LINE_APPROVED`. Lines not yet approved can still be changed, removed or added.
- If the kitchen's whole share is approved (the contribution has `approvedAt`), any edit fails with 409 `SHARE_APPROVED`.

Edits are saved with a version check, so if the order changed since it was read (for example an approval landed), the request fails with 409 `VERSION_CONFLICT` and should be retried after reloading.

### Leave an order

`DELETE /:id/contributions/me`

The kitchen that originally opened the order cannot leave it, but can edit its contribution. Other kitchens may leave while the order is open, unless any of their lines is approved (409 `LINE_APPROVED`).

### Approve (admin only)

`POST /:id/approve`

| Body | Effect |
| --- | --- |
| `{}` | Approves every kitchen's share and moves the order to `approved`, closing it to every kitchen |
| `{ "godownId": "KITCHEN_ID" }` | Approves that kitchen's whole share; other kitchens carry on |
| `{ "godownId": "KITCHEN_ID", "items": [{ "stockItemId": "PRODUCT_ID", "packId": "optional" }] }` | Approves those lines of that kitchen's share; the rest stays editable |

Approval works while the order is `open` or `closed` (otherwise 409 `ORDER_CLOSED`). Approved lines and shares carry `approvedAt` and `approvedBy`. A kitchen or product that is not on the order gives 404.

### Dispatch (admin only)

`POST /:id/dispatch`

| Body | Effect |
| --- | --- |
| `{}` | Dispatch all: sends every kitchen's lines that have not been sent yet |
| `{ "godownId": "KITCHEN_ID" }` | Sends that kitchen's remaining lines |
| `{ "godownId": "KITCHEN_ID", "items": [{ "stockItemId": "PRODUCT_ID", "packId": "optional" }] }` | Sends just those lines; the rest can follow later |

The order is placed once (`ordered`), but lines are sent separately: each line gets `dispatchedAt` and `dispatchedBy`, and the contribution gets them too once all its lines are sent. Whole lines only; a short quantity is a delivery problem, not a partial dispatch. The order must be `ordered` (otherwise 409 `NOT_ORDERED`); if nothing in the request is left to send, 409 `ALREADY_DISPATCHED`. Contributions dispatched before lines were tracked carry `dispatchedAt` only on the contribution; read a line as sent when either is set.

### Receive what has arrived (kitchen only)

`POST /:id/receive`

```json
{
  "items": [
    {
      "stockItemId": "<product id>",
      "photos": { "goods": "<url>", "label": "<url>" },
      "expiryDate": "2027-03-31",
      "mfgDate": "2026-09-01",
      "lotNumber": "B-4471",
      "storage": "room",
      "notes": ""
    }
  ]
}
```

"All received": adds every line of the kitchen's own share that is on the way (sent, not yet received) to its stock, creates a stock batch per line and sets `deliveredAt`, `deliveredBy` and `trackingId` on those lines, all in one transaction. Lines sent later are received later. The contribution gets `deliveredAt` once every line is received.

`items` carries the FSSAI receiving details, one entry per product that is arriving (entries for other products are ignored; a missing one fails with 400 `MISSING_ITEM_DETAILS`, and nothing is added to stock):

- `photos.goods` and `photos.label` (required): URLs returned by the photo upload endpoint, or any `https://` URL. Missing or malformed → 400 `PHOTO_REQUIRED`.
- `expiryDate` (`YYYY-MM-DD`): required unless the product's `expiryRequired` is `false` (the product in each line carries that flag). Missing → 400 `EXPIRY_REQUIRED`; already passed in business time → 400 `EXPIRED_GOODS`, with a message telling the kitchen to call the central store.
- `mfgDate` (`YYYY-MM-DD`, optional): must not be in the future.
- `lotNumber` (optional, up to 60): the manufacturer's batch number read off the label.
- `storage` (optional): `room`, `fridge` or `freezer`.
- `notes` (optional, up to 500).

Each stock batch (`sourceType: "collaborative_order"`, `sourceId` = the order, priced at the product's `pricePerUnit` for valuation) stores these fields plus `trackingId` (`MKM-YYMM-NNNN`: year and month of receipt, then a running number that restarts each month and is unique across kitchens), `condition: "good"`, and a copy of the order's supplier as `supplierName` and `supplierFssaiLicence` (blank when the order has no supplier). `GET /api/procurement/stock-batches` (admin) returns them.

If nothing is on the way, 409 `NOT_DISPATCHED`; once everything is received, 409 `ALREADY_DELIVERED`. Damaged or short deliveries are not handled here yet (Phase 3 tickets); a kitchen with a problem should not call this. The product ledger lists each received line as a `RECEIVED` row on the day it arrived, referenced by `orderNo`.

### Supplier and invoice (admin only)

`PATCH /:id/purchase`

```json
{ "supplierId": "<supplier id>", "invoiceNo": "INV-2026-0042" }
```

Either key may be sent alone; only the keys present change. `supplierId` must be an active supplier (see Suppliers below), or `null` to clear it. `invoiceNo` is up to 60 characters and is meant to be filled in after payment. The order must be `approved` or `ordered` (otherwise 409 `NOT_APPROVED`). Every response then carries `supplier` (`{ _id, name, fssaiLicence }` or `null`) and `invoiceNo`; admins also get the raw `supplierId`. Kitchens see `supplier` and `invoiceNo` read-only, and every stock batch they receive copies the supplier (see Receive).

### Change lifecycle status (admin only)

`PATCH /:id/status`

```json
{ "status": "closed" }
```

When moving to `ordered`, "Mark as ordered" may name the supplier in the same call: `{ "status": "ordered", "supplierId": "<supplier id>" }`. The supplier is optional at this point.

Allowed transitions:

- `open` → `closed` or `cancelled`
- `closed` → `cancelled`
- `approved` → `ordered` or `cancelled`
- `ordered` and `cancelled` are final

`approved` is reached only through `POST /:id/approve` (from `open` or `closed`), so an order is always approved before it is ordered.

A closed order is never reopened; a kitchen that still needs items starts a new order, or an admin opens one on its behalf.

Closing the order immediately prevents kitchens from adding, editing, or removing contributions. Once `closesAt` passes, the order is closed automatically (with `statusChangedBy: null`) the next time any order is read or changed.

## Suppliers (admin only)

Base path: `/api/suppliers`. Part of the `purchase-orders` feature.

Supplier records hold the name and FSSAI licence that kitchens see read-only on the orders they receive (Phase 2 of the kitchen receiving work).

- `GET /` lists active suppliers sorted by name; `GET /?status=all` includes archived ones. Each row: `{ _id, name, fssaiLicence, phone, active, createdAt, updatedAt }`.
- `POST /` with `{ name, fssaiLicence, phone? }` creates one (201). The licence must be 14 digits; spaces are removed before checking. Names are unique ignoring case (409 `DUPLICATE_NAME`).
- `PUT /:id` with any of `{ name, fssaiLicence, phone, active }` edits it. Archive by sending `active: false`.

Errors use the shared `{ code, message }` shape: `INVALID_INPUT` (400), `NOT_FOUND` (404), `DUPLICATE_NAME` (409).

## Errors

Errors are `{ "code": "...", "message": "..." }`. Codes: `INVALID_INPUT` (400), `FORBIDDEN` (403), `NOT_FOUND` (404), `ORDER_CLOSED` (409, the order no longer accepts additions or changes), `ALREADY_JOINED` (409), `LINE_APPROVED` (409), `SHARE_APPROVED` (409), `VERSION_CONFLICT` (409), `NOT_ORDERED` (409), `ALREADY_DISPATCHED` (409), `NOT_DISPATCHED` (409), `ALREADY_DELIVERED` (409), `MISSING_ITEM_DETAILS` (400), `PHOTO_REQUIRED` (400), `EXPIRY_REQUIRED` (400), `EXPIRED_GOODS` (400), `NOT_APPROVED` (409, supplier or invoice details on an order that is not yet approved), `CONFLICT` (409, other conflicts such as a disallowed status change), `PRODUCT_UNAVAILABLE` (409).
