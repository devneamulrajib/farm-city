# Farm City

Farm City is a Bangladeshi online shop for fresh fish and seafood, a Trikon Holdings venture. The catalog is data-driven: categories carry their own attribute templates, so later aisles (meat, vegetables, grocery) do not need a frontend change.

Cash on delivery works without third-party accounts. bKash, Nagad, and SSLCommerz are real integrations and stay hidden until their credentials are set and an admin turns them on.

## Stack

- `client` — React, Vite, Tailwind, React Router, Redux Toolkit, Axios, i18next
- `server` — Node.js, Express, MongoDB, Mongoose, JWT, Zod, Socket.io

Redux holds the session, the cart, and the language. Page data is loaded through `client/src/services`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for why, and [docs/API.md](docs/API.md) for every endpoint.

## Local setup

On Windows 10 or 11, follow [INSTALL-WINDOWS.md](INSTALL-WINDOWS.md). It covers Node.js, MongoDB or Atlas, and the `copy` commands for the env files. The steps below are for macOS and Linux.

You need Node.js 22+ and a MongoDB replica set. Checkout uses a transaction, which a standalone `mongod` cannot do.

```bash
# macOS / Linux, once
mkdir -p ~/mongo-data
mongod --replSet rs0 --bind_ip 127.0.0.1 --dbpath ~/mongo-data --fork --logpath ~/mongo-data/mongod.log
mongosh --eval 'rs.initiate({_id:"rs0", members:[{_id:0, host:"127.0.0.1:27017"}]})'
```

MongoDB Atlas clusters are already replica sets. Use the Atlas connection string as `MONGODB_URI`.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
npm install
npm run seed
npm run dev
```

- Shop: http://127.0.0.1:4178
- API: http://127.0.0.1:4108

Seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@farmcity.com | (set your own password when you seed; do not commit it) |
| Customer | customer@farmcity.com | (set your own password when you seed; do not commit it) |

`npm run seed` replaces catalog, orders, and these users. It copies photographs from `server/seed/images` into `server/uploads/seed`.

```bash
npm test
```

Tests use the database `farmcity_test` on the same replica set and do not touch the seeded shop data.

## Photographs

Seed photos are free to use:

- Hilsa, rohu, pomfret, prawn, crab, squid, salmon, and market scenes from [Wikimedia Commons](https://commons.wikimedia.org) (CC BY, CC BY-SA, or CC0). See filenames in `server/seed/images`.
- The mixed seafood platter and cooked shrimp are [Unsplash](https://unsplash.com) photos `photo-1615141982883-c7ad0e69fd62` and `photo-1565680018434-b513d5e5fd47`.

## Environment variables

`server/.env.example` and `client/.env.example` list every variable.

| Integration | Required variables | Behaviour when missing |
| --- | --- | --- |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Uploads go to `server/uploads` and are served at `/uploads` |
| bKash | `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD` | Hidden at checkout even if an admin enables it |
| Nagad | `NAGAD_MERCHANT_ID`, `NAGAD_MERCHANT_NUMBER`, `NAGAD_PG_PUBLIC_KEY`, `NAGAD_MERCHANT_PRIVATE_KEY` | Hidden at checkout. PEM keys can use `\n` for line breaks |
| SSLCommerz | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | Hidden at checkout. Set `SSLCOMMERZ_LIVE=true` for the live gateway |
| Cash on delivery | none | Works whenever an admin leaves it enabled (the default) |

Nothing secret is prefixed with `VITE_`. The only client variable is `VITE_API_URL`, which is empty in local dev because Vite proxies `/api`, `/uploads`, and `/socket.io`.

## Production

1. Create an Atlas cluster and set `MONGODB_URI`.
2. Deploy `server` to Render, Railway, or a VPS.
   - Build command: `npm install`
   - Start command: `npm run start -w server`
   - Set `NODE_ENV=production`, `TRUST_PROXY=true`, long random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN` to the shop URL, and `SERVER_URL` to the API URL.
   - Hosts with an ephemeral disk should set the Cloudinary variables. A VPS can keep the local upload directory on a volume.
   - Run `npm run seed -w server` once against the production database if you want the starter catalog.
3. Deploy `client` to Vercel or Netlify.
   - Root directory: `client`
   - Build: `npm run build`
   - Output: `dist`
   - Set `VITE_API_URL` to the API origin, for example `https://api.example.com`.
4. If the shop and API are on different sites, set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`. Same-site reverse proxy setups can keep `lax`.
5. Socket.io (live order status) expects a single API instance, or a load balancer with sticky sessions.

Enable bKash, Nagad, or SSLCommerz in Admin → Settings only after the matching variables are present. The settings screen shows whether credentials are configured. It never shows the secrets.
