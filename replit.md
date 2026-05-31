# Hex Auth

A full-stack SaaS authentication and license management platform for software developers. Provides JWT auth with HWID binding, license key generation/redemption, admin dashboard, Discord webhooks, and a Python SDK.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, at /api)
- `pnpm --filter @workspace/hex-auth run dev` — run the frontend (port 21560, at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + framer-motion
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all endpoints)
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/db/src/schema/` — Drizzle table definitions (users, apps, licenses, logs, sessions, blacklist, team_members, variables)
- `artifacts/api-server/src/routes/` — Express route handlers by domain
- `artifacts/hex-auth/src/pages/` — Frontend pages
- `artifacts/hex-auth/src/lib/auth.tsx` — AuthContext and useAuth hook

## Architecture decisions

- Contract-first: OpenAPI spec drives codegen for both Zod schemas and React Query hooks. Never write raw fetch calls in the frontend.
- JWT in localStorage (`hexauth_token`), sent as `Authorization: Bearer <token>` header.
- HWID binding: first SDK login sets the HWID on the user record; subsequent logins from different hardware IDs are rejected.
- Dark mode forced via `document.documentElement.classList.add("dark")` in main.tsx (Tailwind v4 `@apply dark` is invalid).
- Discord webhooks fire for key events: login.ok, login.fail, hwid.deny, user.ban, hwid.reset.

## Product

- **Landing page**: Hero, feature grid, pricing (Free/Starter/Pro/Custom), Python SDK showcase, payment info (bKash/Nagad 01755334082)
- **Auth**: Register with email verification, login, JWT sessions
- **Admin Dashboard**: Stats overview, active users chart, plan mix, recent activity
- **Apps**: Create and manage protected applications; rotate API tokens
- **Users**: Ban/unban, reset HWID, update plan/subscription
- **Licenses**: Generate HEX-XXXX keys, redeem codes, manage expiry
- **Sessions**: View active SDK sessions, kill sessions
- **Blacklist**: Block by HWID/IP/username
- **Event Logs**: Filterable activity log with severity badges
- **Settings**: Profile, password, webhook, team members, credentials

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always rebuild libs (`pnpm run typecheck:libs`) before typechecking artifact packages, so new DB table exports resolve correctly.
- SMTP not configured = verification codes logged to pino instead of sent via email.
- Do not change the payment methods on the landing page from bKash/Nagad 01755334082.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
