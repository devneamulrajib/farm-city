# Farm City — Architecture

Farm City is a transactional storefront for fresh fish and seafood in Bangladesh, operated as a Trikon Holdings venture. The catalog, pricing rules, delivery zones, and homepage are data, not code, so the same platform can later sell meat, vegetables, fruit, and grocery without a frontend rewrite.

This document is the source of truth for folder layout and the decisions below. Implementation follows it.

## Context

[Hello Kisaan](https://hellokisaan.com/) is a useful information-architecture reference and a poor visual one.

What we take from it:

- Category navigation is the primary way people enter the catalog. Categories are named in the local language and in English, and each category has its own listing.
- Product discovery is a grid of cards: image, name, price, and a clear next step.
- Search sits in the header because shoppers often know the item (a fish name, a cut) rather than the taxonomy.
- Featured categories on the home page are shortcuts into those listings.
- Account features are separate from browsing.

What we do not take:

- Hello Kisaan does not run checkout or payments. Farm City does.
- The visual design is intentionally different: white surfaces, deep ocean blue, quiet green accents, and an editorial grocery feel rather than a classifieds layout.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | `/client` + `/server`, npm workspaces | Matches the requested boundary. Shared tooling at the root, independent deployables. |
| Client | React 18, Vite, Tailwind, React Router, Axios | Requested. Vite is the dev server and the production build. |
| Client state | Redux Toolkit | See below. |
| Server | Node.js, Express 4, Mongoose 8 | Requested. Express 4 avoids Express 5 middleware quirks. |
| Data | MongoDB (replica set, including single-node) | Transactions for checkout. Atlas and local `rs0` both qualify. |
| Auth | JWT access token + rotating refresh token | See below. |
| Validation | Zod | One schema per request, shared by the validate middleware. |
| Realtime | Socket.io | See below. |
| Images | Cloudinary, or local disk when it is not configured | Admin upload works in dev with no third-party account. |

## Folder structure

```
/client
  index.html
  vite.config.js
  tailwind.config.js
  .env.example
  public/                 static brand assets only
  src/
    main.jsx              providers: redux, router, i18n, toasts
    App.jsx               route table
    index.css             design tokens
    i18n/                 en.json, bn.json, init
    services/             axios instance + one module per resource
    store/                auth, cart, ui slices
    hooks/
    layouts/              store, account, admin
    components/
      ui/                 primitives (button, input, dialog, sheet, …)
      layout/             header, footer, announcement, search
      product/            card, gallery, variant picker, attribute list, filters
      cart/
    pages/
      store/              home, listing, product, cart, checkout, confirmation, track, content
      account/
      admin/
    utils/                money, phone, dates, media URLs
/server
  .env.example
  src/
    index.js              http server, socket attach, listen
    app.js                express app (exported for tests)
    config/               env, db, cloudinary
    models/
    controllers/
    routes/
    middleware/           auth, admin, validate, error, upload, rate limit, sanitize
    validators/           zod schemas
    services/
      attributeService.js
      cartService.js
      orderService.js
      imageService.js
      tokenService.js
      payment/            registry + cod, bkash, nagad, sslcommerz
    socket/
    utils/
    seed/
  tests/
  uploads/                local image fallback (gitignored)
/docs
  ARCHITECTURE.md
  API.md
```

The client never imports server code. The server never renders HTML. Coupling is the HTTP API plus Socket.io events documented in `docs/API.md`.

## Request lifecycle

```
Browser
  │  Axios  /api/...   Authorization: Bearer <access>
  │                    X-Guest-Id: <uuid>          (guests)
  ▼
Vite proxy (dev) or the API host (prod)
  ▼
helmet → cors → rate limit → cookie parser → JSON → mongo sanitize
  ▼
route → validate(zod) → auth? → admin? → controller → service → Mongoose
  ▼
{ success, data, meta }    or    { success: false, message, errors }
```

Central `errorHandler` maps `ApiError`, Zod failures, Mongoose validation, and duplicate-key errors. Stack traces are logged on the server and omitted from responses in production.

## Dynamic attribute model

Categories own the shape of products. Products only store values.

`Category.attributeSchema` is an ordered list:

| Field | Role |
| --- | --- |
| `key` | Stable identifier (`freshness`, `origin`, `expiryDate`). Unique within the category. |
| `label.en` / `label.bn` | Rendered label. The UI does not have a dictionary of fish fields. |
| `type` | `text`, `number`, `select`, `multiselect`, `boolean`. |
| `options` | Allowed values for select types, each with `value` and bilingual `label`. |
| `required` | Enforced on create and update. |
| `filterable` | Listing API accepts `attr_<key>=`. |
| `unit` | Optional suffix (`days`, `cm`). Display only. |

`Product.attributes` is a plain object keyed by those keys. `Product.category` points at the schema used for validation. `Product.categories` is the set of categories the product appears in (the primary category plus extras such as “Popular Fish”), so merchandising groups do not require duplicate products.

Validation (`services/attributeService.js`), run on every product write:

1. Load the primary category schema.
2. Reject unknown keys.
3. Require keys marked `required`.
4. Coerce and check types. Select values must be a member of `options`. Multiselect must be an array of members.
5. Persist the cleaned object only.

The storefront product page and the admin product form both map `attributeSchema` to generic controls. Specifications on the product page are a loop over the schema, not a fish-specific component.

Weights people buy are **variants**, not attributes. A variant is a sellable SKU (`500g`, `1 kg`, `2 kg`) with its own price, compare-at price, and stock. `allowCustomQuantity` is a separate selling mode: the shopper enters an amount in the product unit and pays `basePrice × amount`. Attributes describe the item; variants price it.

Adding Meat & Poultry or Vegetables is an admin action: create a category, define its schema, create products. No client deploy.

Listing filters follow the same rule. `GET /api/products` accepts `attr_<key>` only when the resolved category marks that key `filterable`. The filter sidebar asks the category endpoint for the schema and renders it. There is no `if (category === 'fish')` branch in the client.

## Catalog pricing

- `basePrice` is the current selling price for one unit (`kg`, `gram`, `piece`, `pack`).
- `compareAtPrice`, when greater than `basePrice`, is the pre-discount price. The UI shows it struck through. The same pair exists on each variant, where `price` is the pack price.
- Money is calculated in paisa (integer) and stored as taka with 2 decimal places, so `1.1 + 2.2` style errors cannot change a total.
- Coupons are a separate discount on the order subtotal (`percent` or `fixed`), with minimum order, optional cap, window, and usage limit. They do not mutate product documents.

## Cart persistence

Two owners, one shape.

| Shopper | Identity | Where the cart lives |
| --- | --- | --- |
| Guest | `farmcity_guest_id` UUID in `localStorage`, sent as `X-Guest-Id` | `Cart` document keyed by `guestId`, plus a localStorage mirror of item ids so a refresh paints immediately |
| Customer | User id from the access token | `Cart` document keyed by `user` |

Partial unique indexes enforce one cart per user and one per guest id. Guest documents omit `user`; user documents omit `guestId`.

Cart lines store `product`, `variantId` (when mode is `variant`), `mode` (`variant` | `custom`), and `quantity`. They do **not** store price. `GET /api/cart` reprices every line from the live product. If a product was removed, disabled, or no longer has stock, the line comes back with `issues[]` and is excluded from the payable subtotal until the shopper removes or fixes it.

Merge on login and register (`POST /api/cart/merge`):

1. Load the guest cart and the user cart (create the user cart if needed).
2. For each guest line, add quantity onto a matching user line or push a new line.
3. Re-check stock and clamp or flag overflows.
4. Delete the guest cart.
5. Return the user cart.

The guest id stays in `localStorage` so the next anonymous session can start clean. Logout does not delete the user cart.

Checkout never trusts client prices. `orderService` loads products inside a transaction and prices from the database.

## Price snapshotting on orders

An order is a historical document. Later edits to a product must not change what the customer paid or what the picker packs.

Each `Order.items[]` entry copies, at the moment the transaction commits:

- product id (reference, for links and reviews)
- `name.en`, `name.bn`
- image, sku
- variant id and label
- `weightValue`, `weightUnit`, selling `unit`
- `quantity`
- `unitPrice` and `compareAtPrice`
- `lineTotal`
- a shallow copy of attributes (so a later schema edit does not rewrite history)

The order also snapshots `subtotal`, `deliveryCharge`, `discount`, `couponCode`, `total`, the shipping address, and the payment method. Delivery charge is resolved from `DeliveryZone` (area match, then district default, then `settings.defaultDeliveryCharge`) inside the same transaction and then stored.

Stock decrement uses a conditional update (`stock >= quantity`). A failed match aborts the transaction and the shopper gets a precise out-of-stock error. Cancelling a `Pending` order (customer or admin) restores stock. Cancellation after `Processing` is an admin action and still restores stock unless the status is already `Delivered` or `Cancelled`.

`popularity` increments by quantity sold so “best selling” sort reflects real orders, with the seed data giving the catalog a starting rank.

## Order status

`Pending → Confirmed → Processing → Out for Delivery → Delivered`, or `Cancelled` from any state except `Delivered`.

Every transition appends `statusHistory[]` with status, note, actor, and timestamp. The customer order page renders that array as a timeline. Timestamps are stored in UTC and formatted in `Asia/Dhaka`.

Cash on delivery:

- Order is created as `Pending`.
- Payment document is `pending`, order `paymentStatus` is `unpaid`.
- Marking the order `Delivered` sets the COD payment to `paid`.
- This path needs no third-party credentials and is the one local setup uses.

Online providers do not decrement stock until their callback verifies a captured payment. If the shopper abandons the hosted page, the order remains unpaid and stock stays available. A failed callback marks the payment `failed` and the order `Cancelled`.

## Payment provider abstraction

`services/payment/registry.js` is the only place controllers ask “which methods exist?”.

Each provider module exports:

```
id, label
isConfigured()          env credentials present (never reads the admin toggle)
initiate({ order })     start the provider flow
verify(callback)        confirm money moved
```

`GET /api/payments/methods` returns a method only when **both** are true:

1. An admin enabled it in Settings.
2. `isConfigured()` is true.

Cash on delivery is configured whenever it is enabled. It has no secrets.

bKash (tokenized checkout), Nagad (checkout initialize / complete with the merchant key), and SSLCommerz (gwprocess session) are real HTTP integrations behind those flags. The modules call the sandbox or production base URL from env. They are not simulated: if credentials are absent the method is hidden; if a call fails, checkout returns the provider error and does not pretend the order was paid.

The admin settings screen can show a method as “enabled in settings, credentials missing” via `GET /api/admin/payment-providers`. That payload includes booleans only. App keys, passwords, and private keys never leave the server, and they are not prefixed with `VITE_`.

## Authentication and authorization

Access token:

- JWT, 15 minutes, payload `{ sub, role, type: 'access' }`.
- Returned in the JSON body and kept in Redux memory.
- Sent as `Authorization: Bearer`.
- Not written to `localStorage`. A refresh of the tab recovers it through the refresh cookie, so a stolen localStorage dump does not include a token. XSS can still read memory; the short lifetime and the refresh rotation limit the window.

Refresh token:

- JWT, 7 days, `httpOnly` cookie, `path` restricted to `/api/auth`, `SameSite=Lax` by default.
- Only a SHA-256 hash is stored, on the user, with an expiry. Login rotates it. Reuse of a rotated token is rejected.
- `POST /api/auth/refresh` issues a new access token and a new refresh cookie.
- Production split-origin deploys set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`. `SameSite=Lax` is correct for local dev and for a same-site reverse proxy.

Why this shape instead of a single long-lived JWT in `localStorage`: the durable credential is not readable by script, and the credential that authorizes API calls expires quickly. Why not put the access token in a cookie as well: bearer tokens are not sent cross-site implicitly, which avoids a CSRF channel on every mutating route. The refresh cookie is the only cookie credential, and it is path-scoped to the refresh and logout routes.

Passwords are hashed with bcrypt (cost 12). `isActive: false` fails login and refresh. Roles are `customer` and `admin`.

`requireAuth` loads the user from the bearer token and rejects missing, expired, or inactive accounts. `requireAdmin` requires `role === 'admin'` and is applied on every admin route and on every mutating catalog route. The client admin layout is a convenience redirect only. It is not the authorization boundary.

Guests may checkout. The order stores their name, phone, and address. They can track with order number plus phone (`POST /api/orders/track`). If they later register or log in with the same phone, unclaimed orders with that phone are attached to the account.

## Internationalization

UI strings live in `client/src/i18n/en.json` and `bn.json` and are looked up with i18next. The active language is in Redux and `localStorage` (`farmcity_locale`). The toggle is in the header and works before login.

Translatable content that merchants edit (product name and description, category name and description, banner copy, announcement, testimonials, highlights, attribute labels) is stored as `{ en, bn }`. The API returns both. The client picks the active language and falls back to English when Bangla is empty. Formatting:

- Money: `৳` with `en-BD` grouping, for example `৳1,250`.
- Phone: input accepts `01XXXXXXXXX`, `8801…`, and `+8801…` for operator prefixes `013`–`019`. Stored normalized as `01XXXXXXXXX`.
- Dates: `Asia/Dhaka` via `Intl.DateTimeFormat`.

The server does not localize error messages into Bangla in v1; the client maps known error codes where it has a translation, and otherwise shows the English message. Field labels and chrome are fully translated.

## Realtime

Socket.io is attached to the same HTTP server. It is used for one thing: pushing order status. When an admin transition is saved, the server emits `order:status` to the room `user:<userId>` and `order:<orderId>`. The order detail page joins those rooms with the access token checked on handshake.

That is the justification. Polling the tracking page would be a worse version of the same feature, and nothing else in the app needs a socket (no chat, no live inventory stream). The client does not open a socket on the home page.

## Images

`imageService.upload(file)`:

- If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are all set, upload to Cloudinary and return the secure URL plus `publicId`. Delivery URLs can include transformation parameters (`f_auto,q_auto,w_…`) so the browser does not download the original.
- Otherwise store the file with multer under `server/uploads`, served at `/uploads`. The client resolves relative `/uploads/...` against the API origin (the Vite proxy in dev).

Seed images are real Unsplash photographs saved into `uploads/` so the catalog renders without Cloudinary and without hotlink dependence. Admin multi-image upload uses the same service. The client lazy-loads with `loading="lazy"` and explicit width/height to limit layout shift.

## Client state

Redux Toolkit holds three slices:

| Slice | Contents | Why it is global |
| --- | --- | --- |
| `auth` | user, access token, bootstrap status | Header, routes, checkout, and reviews all read it. The axios interceptor must see the token outside React. |
| `cart` | server cart, badge count, mini-cart open | Header badge, mini cart, cart page, and checkout must agree. Guest persistence is a listener middleware on the slice. |
| `ui` | locale | Every translated string and every bilingual field selector. |

Server collections (products, orders, admin tables) stay in page-level state loaded through the service layer. They are not copied into Redux. That split is deliberate: catalog pages have distinct caches and filters, while auth and cart are cross-cutting and must update together (add to cart from a card and from the product page). Context would re-render the whole tree on every quantity change and would make the axios auth interceptor awkward. RTK Query was considered and skipped so the service layer stays plain Axios, which is what the brief asked for, and so request code is visible in `services/` rather than generated hooks.

## Security and performance defaults

- `helmet`, CORS locked to `CLIENT_ORIGIN`, `express-rate-limit` on `/api` and a tighter limiter on `/api/auth`.
- Request bodies sanitized of `$` and `.` keys before they reach Mongoose.
- Zod on every write and on query objects that drive Mongo filters. Filter objects are built in code from an allowlist, never by spreading `req.query` into `find()`.
- Pagination capped at 48.
- Text index on product name, description, and tags. Search runs `$text` first (the index) and, if that matches nothing, a case-insensitive regex on names and tags so partial words still work.
- Indexes documented on the models: slugs, category, order number, user, phone, cart identity, coupon code, delivery zone `(district, area)`.
- Public product queries project away admin-only fields and exclude soft-deleted rows (`isDeleted`).
- Uploads restricted by MIME (`jpeg`, `png`, `webp`) and a 5 MB limit.
- `trust proxy` is configurable so rate limits see the real client behind Render or Nginx.

## Soft deletion and singleton settings

Products are soft-deleted (`isDeleted`) so order snapshots can still link back for admin context. Categories with products cannot be deleted. Settings is a single document (`key: "store"`) created with defaults on first read. Homepage announcement, contact details, the company logo, why-choose-us, testimonials, payment toggles, and the free-delivery threshold live there, so those sections are admin-editable. An empty logo uses the default FCB mark shipped in the client.

## Processes

```
npm run dev        root: client + server together
npm run seed       server seed (admin, categories, products, banners, zones, sample orders)
npm test           server tests against the local replica set, database farmcity_test
```

Local MongoDB must be a replica set (`rs0`). Checkout uses a multi-document transaction. A standalone `mongod` cannot do that; the README gives the exact `rs.initiate()` steps and the Atlas note (Atlas clusters already are replica sets).

## Deployment shape

- `server` on Render, Railway, or a VPS. `PORT` from the environment. Persistent disk or Cloudinary for uploads. A VPS local-disk deploy needs a volume; ephemeral hosts should set Cloudinary.
- `client` on Vercel or Netlify. `VITE_API_URL` is the API origin. No secrets in the Vite env.
- MongoDB Atlas connection string in `MONGODB_URI`.
- Socket.io needs sticky sessions or a single API instance. The deployment doc states that. One instance is the expected start.

## As built

A few details were settled while implementing the design above:

- Guest and account carts both live in MongoDB. The guest id is a UUID in `localStorage`, sent as `X-Guest-Id`. The browser also keeps that id so a refresh can reload the same cart.
- Variant packs and loose weight are separate stock pools. A variant sale decrements that variant. A custom amount decrements `product.stock`. `availability` is recomputed from both.
- Checkout returns a `viewToken`. The confirmation page reads the order with that token. Account pages use the session instead.
- `POST /api/auth/refresh` returns `{ user: null }` when there is no cookie, so a first visit is not a 401.
- Order status is pushed over Socket.io to the order room and the user's room. The tracking page also works without the socket, by loading the order again.

## Out of scope for this build

- Email and SMS gateways (no “we sent you a code” UI).
- Password reset.
- Multi-vendor seller accounts.
- Wallet balance and partial refunds. Admin cancellation restores stock and marks an online payment `refunded` only as a status; the provider refund API is not called automatically.
- A Bangla translation of every server error string.
