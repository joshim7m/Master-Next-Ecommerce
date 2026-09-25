# Prisma Cheat Sheet

Quick reference for Prisma + PostgreSQL in this project (Prisma 5.x, schema at `prisma/schema.prisma`, `DATABASE_URL` in `.env`).

## First-time setup

```bash
# 1. Install dependencies (postinstall hook runs `prisma generate` automatically)
npm install

# 2. Create the database in PostgreSQL
psql -U postgres -c "CREATE DATABASE eghuri;"

# 3. Point the project at it — edit .env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eghuri?schema=public"
```

## Migrations

```bash
# Dev: create + apply a migration after schema.prisma edits (also regenerates client)
npx prisma migrate dev --name describe_the_change

# Staging/production: apply committed migrations only (never edits schema)
npx prisma migrate deploy

# Check migration state vs database
npx prisma migrate status
```

## Generate Prisma Client only

```bash
# Run when the client is out of sync but no migration is needed
npx prisma generate
```

> **Dev-server gotcha:** a running `npm run dev` keeps the OLD Prisma Client in memory.
> Errors like `Unknown field 'status'` mean the running server predates `prisma generate`.
> Fix: stop the server (`Ctrl+C` / `kill <pid>`) and restart. If it persists: `rm -rf .next && npm run dev`.

## Seed

```bash
npm run seed            # runs everything in order:
                        #   1. prisma/seedSettings.js  → staff users + site settings + sliders + social links
                        #   2. prisma/seedCatalog.js   → categories + products from catalogData.json
                        #   3. prisma/seedBlog.js      → blog categories + posts
```

### Fresh catalog fetch (optional)

```bash
npm run fetch-catalog   # scrape fresh data into prisma/catalogData.json
npm run seed-catalog    # re-upsert categories + products
```

## Reset migrations from scratch (dev only — deletes all data)

```bash
# 1. Stop the dev server first
#    Ctrl+C   (or: kill <pid>)

# 2. Remove migration history
rm -rf prisma/migrations

# 3. Re-create one clean baseline from the current schema.
#    Prisma sees no migration history + existing data and will ask to RESET the DB → confirm.
npx prisma migrate dev --name init

# 4. Re-seed
npm run seed

# 5. Restart dev server
npm run dev
```

> ⚠️ This destroys orders, users, and content. Dev machines only.

## Danger-zone reset (drop + migrate + seed in one step, dev only)

```bash
npx prisma migrate reset --force   # WARNING: drops the whole database
```

## Production build & deploy

```bash
npx prisma migrate deploy   # apply migrations on the server
npx prisma generate         # ensure client matches schema
npm run build
npm start
```

> In production `JWT_SECRET` must be set in the environment (see `src/lib/jwt-secret.js`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Unknown field '...for select statement'` | Stale dev server: stop it, restart (`rm -rf .next` if it persists) |
| `Unknown argument 'upsert'` on `create` | `upsert` is only valid under `update`; use `details: { create: {...} }` on `create` |
| `violates RESTRICT setting of foreign key` | Delete referencing child rows first (e.g. `UserDetails` before `User`) — see staff `deleteUser` action |
| `P1001 can't reach database` | Is PostgreSQL running? Check `DATABASE_URL` host/port/password |
| Schema drift detected by `migrate dev` | Run `npx prisma migrate reset` (dev) to re-align schema + history |

## Seeded admin accounts

| Name | Email | Role | Password |
|---|---|---|---|
| Joshim Uddin | joshimfv@gmail.com | super-admin | `histacin` |
| Rasel Hasan | raselfv@gmail.com | admin | `histacin` |
| Robin Ahmed | robinfv@gmail.com | manager | `histacin` |

Change passwords after first login (Users → Edit). The super-admin account cannot be edited or deleted.
