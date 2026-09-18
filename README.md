# PriceDrop

**Know when to buy.**

Paste a product link → compare against history → **BUY NOW / WAIT / AVOID**.

## Multi-user

- Anyone can analyze without an account.
- Price history is **shared** (one database for the instance).
- Alerts and the wishlist are **private** per account.
- `npm start` binds `0.0.0.0:3000` so other people on the same network can open the machine's LAN IP.

## Run locally (several people on your LAN)

```bash
copy .env.example .env
# set AUTH_SECRET to a long random string
npm install
npx prisma db push
npm run build
npm start
```

You: [http://localhost:3000](http://localhost:3000)  
Others: `http://YOUR-LAN-IP:3000` (allow Node through Windows Firewall if they can't connect).

Each person should **Join** with their own email.

If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`:

```bash
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm install --strict-ssl=false
```

## What this is not yet

- Public internet hosting (this SQLite file lives on one machine; Vercel needs a hosted Postgres).
- Email/push when a price drops (alerts are stored; checking is on the wishlist).
- Live Amazon prices for every URL (many stores hide prices from bots).

## Demo links

- Sony WH-1000XM6 → **BUY NOW**
- AirPods Pro → **WAIT**
- NovaBeat ad headphones → **AVOID**
