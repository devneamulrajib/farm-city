# Farm City API

Base URL: `/api`. JSON envelope:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 12, "total": 22, "pages": 2 } }
```

Errors:

```json
{ "success": false, "message": "Please check the form and try again.", "errors": [{ "field": "body.phone", "message": "..." }] }
```

Authenticated requests send `Authorization: Bearer <accessToken>`. The access token lives in memory and lasts 15 minutes. `POST /api/auth/login` and `POST /api/auth/register` also set an httpOnly refresh cookie scoped to `/api/auth`. Guests send `X-Guest-Id` (a UUID stored in `localStorage`).

Dates are stored in UTC. Clients format them in `Asia/Dhaka`. Money is BDT.

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `{ name, email, phone, password }` |
| POST | `/auth/login` | — | `{ identifier, password }` identifier is email or a BD mobile |
| POST | `/auth/refresh` | cookie | Returns a new access token, or `{ user: null }` when signed out |
| POST | `/auth/logout` | cookie | Clears the refresh cookie |
| GET | `/auth/me` | user | Current user and addresses |

Phones accept `01XXXXXXXXX`, `8801…`, and `+8801…` and are stored as `01XXXXXXXXX`.

## Users

| Method | Path | Auth |
| --- | --- | --- |
| PATCH | `/users/me` | user |
| PUT | `/users/me/password` | user |
| POST | `/users/me/addresses` | user |
| PATCH | `/users/me/addresses/:id` | user |
| DELETE | `/users/me/addresses/:id` | user |

## Categories and products

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/categories` | — |
| POST | `/categories` | admin |
| PUT | `/categories/:id` | admin |
| DELETE | `/categories/:id` | admin |
| GET | `/products` | — |
| GET | `/products/:slug` | — |
| POST | `/products` | admin |
| PUT | `/products/:id` | admin |
| DELETE | `/products/:id` | admin, soft delete |

`GET /categories` returns `{ flat, tree }`. Each category includes `attributeSchema`.

`GET /products` query: `q`, `category` (slug), `page`, `limit` (max 48), `sort` (`popular`, `newest`, `price_asc`, `price_desc`), `minPrice`, `maxPrice`, `availability`, `featured`, `bestSeller`, `newArrival`, `onSale`, and `attr_<key>` for filterable attributes.

Search uses the product text index first and falls back to a case-insensitive name/tag match.

Product writes are validated against the primary category's attribute schema. Unknown keys are rejected. Variant `_id` values are preserved on update.

## Cart

Identity is the signed-in user, otherwise `X-Guest-Id`.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/cart` | — |
| POST | `/cart/items` | `{ productId, mode: "variant"\|"custom", variantId, quantity }` |
| PATCH | `/cart/items/:itemId` | `{ quantity }` |
| DELETE | `/cart/items/:itemId` | — |
| DELETE | `/cart` | — |
| POST | `/cart/coupon` | `{ code }` |
| DELETE | `/cart/coupon` | — |
| POST | `/cart/merge` | `{ guestId }` user only |

Prices are calculated from the current catalog. Lines that are out of stock come back with `issues` and are excluded from the subtotal.

## Orders

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/orders` | guest or user |
| GET | `/orders` | user, own orders |
| GET | `/orders/mine/:orderNumber` | user |
| GET | `/orders/:orderNumber?token=` | view token from checkout |
| POST | `/orders/track` | `{ orderNumber, phone }` |
| POST | `/orders/:orderNumber/cancel` | user, only while `Pending` |

Checkout body: `{ name, phone, email, addressLine, district, area, instructions, paymentMethod }`.

Each order item snapshots name (English and Bangla), image, sku, variant label, weight, unit, quantity, unit price, and line total. Delivery charge and coupon discount are snapshotted too.

Statuses: `Pending`, `Confirmed`, `Processing`, `Out for Delivery`, `Delivered`, `Cancelled`. Every change appends `statusHistory`.

Cash on delivery decrements stock immediately and leaves payment `unpaid` until an admin marks the order `Delivered`. Online methods do not decrement stock until the provider verifies payment.

## Payments

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/payments/methods` | Methods that are both enabled and configured |
| GET | `/payments/bkash/callback` | bKash redirect |
| ALL | `/payments/nagad/callback` | Nagad redirect |
| POST | `/payments/sslcommerz/success` | SSLCommerz |
| POST | `/payments/sslcommerz/fail` | SSLCommerz |
| POST | `/payments/sslcommerz/cancel` | SSLCommerz |
| POST | `/payments/sslcommerz/ipn` | SSLCommerz server notification |

Successful and failed callbacks redirect the browser to `/order/:orderNumber?token=&payment=`.

## Content

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/banners?placement=hero\|promo` | — |
| POST/PUT/DELETE | `/banners` | admin |
| GET | `/reviews/product/:slug` | — |
| POST | `/reviews` | user who has ordered the product |
| GET | `/settings/public` | — |
| POST | `/newsletter/subscribe` | `{ email }` |
| POST | `/inquiries` | contact form |
| GET | `/delivery/zones` | active zones |
| POST | `/delivery/quote` | `{ district, area, subtotal }` |

## Admin

Every `/admin` route requires an admin JWT.

| Method | Path |
| --- | --- |
| GET | `/admin/overview` |
| GET | `/admin/products` and `/admin/products/:id` |
| GET | `/admin/categories` |
| GET | `/admin/banners` |
| GET | `/admin/orders` and `/admin/orders/:id` |
| PATCH | `/admin/orders/:id/status` `{ status, note }` |
| GET | `/admin/customers` and `/admin/customers/:id` |
| PATCH | `/admin/customers/:id` `{ isActive }` |
| GET/PUT | `/admin/settings` |
| GET | `/admin/payment-providers` |
| GET/POST | `/admin/delivery-zones` |
| PUT/DELETE | `/admin/delivery-zones/:id` |
| GET/POST | `/admin/coupons` |
| PUT/DELETE | `/admin/coupons/:id` |
| GET | `/admin/subscribers` |
| GET | `/admin/inquiries` |
| POST | `/admin/uploads` multipart field `image` |

`GET /admin/payment-providers` returns `{ id, settingsEnabled, configured, available }` and no secrets.

## Realtime

Socket.io on the same host. Handshake `auth.token` is the access token when the shopper is signed in. Emit `order:watch` with `{ orderId, phone }` after the server checks ownership or the phone on the order. The server emits `order:status` to `order:<id>` and `user:<id>`.
