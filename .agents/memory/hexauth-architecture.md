---
name: HexAuth Architecture
description: Key conventions, route map, and sharp edges for the Hex Auth SaaS platform.
---

# HexAuth Architecture

## Product
Hex Auth — SaaS authentication and license management platform for software developers. Features: JWT auth + HWID binding, license key generation/redemption, admin dashboard, Python SDK, Discord webhooks.

## Stack
- pnpm monorepo, Express 5 + MongoDB/Mongoose (NOT PostgreSQL), React+Vite+Tailwind v4+wouter routing
- API port 8080, frontend port 21560
- `Start application` workflow = primary frontend workflow (port 21560); `artifacts/hex-auth: web` will also start on port 21560 if PORT env is globally set — they conflict, restart `Start application` after killing port 21560 if needed

## API structure
- All routes at `/api` prefix (handled by Express, mounted in `app.ts`)
- Route files: auth, apps, users, licenses, logs, sessions, blacklist, subscriptions, settings, stats, sdk, files
- All dashboard/admin routes require `requireAuth` middleware from `src/middlewares/auth.ts`
- JWT stored in localStorage as `hexauth_token`; sent via `Authorization: Bearer <token>`
- Workspace isolation via `x-workspace-id` header

## Database (MongoDB/Mongoose)
- Models in `artifacts/api-server/src/models/index.ts`: User, App, AppUser, License, Session, Log, Blacklist, TeamMember, Variable, AppFile
- AppFile model stores files as base64 in MongoDB (5MB limit) — no multer/disk storage

## Auth flow
1. POST /api/auth/register → creates user, sends verification code (logs code if SMTP not configured)
2. POST /api/auth/verify-email → verifies code, returns JWT
3. POST /api/auth/login → validates credentials + email verified + not banned → returns JWT

## SDK flow
POST /api/sdk/login tries AppUser first, then falls back to User. Binds HWID on first login, checks blacklist, fires rich Discord webhook with app name/HWID/PC name, returns sessionToken.

## Files route
GET/POST/DELETE /api/files — upload (base64 JSON body), list, delete. Download at /api/files/:fileId/download. 5MB base64 limit enforced server-side.

## Payment info (landing page)
bKash 01755334082 · Nagad 01755334082 (must NOT change to other providers)

## Tailwind v4 dark mode
Use `@custom-variant dark (&:is(.dark *))` in CSS; add `document.documentElement.classList.add("dark")` in main.tsx. Do NOT use `@apply dark` — invalid in Tailwind v4.

## Team invite flow
1. Owner sends invite → `POST /api/settings/team/invite` → creates TeamMember (status=pending) → sends email
2. Invited person clicks link → `GET /api/settings/team/accept/:token` → backend marks accepted → **redirects to frontend `/invite-accepted?ok=1`**
3. Frontend `/invite-accepted` page shows success (green) / expired (yellow) / invalid (red) state
4. Team list (`GET /api/settings/team`) returns `status` field (pending/accepted) for each member

## Team permissions hierarchy
- owner → admin (by join order, earlier admin outranks later admin) → viewer
- Owner cannot be removed; admin cannot remove a same-or-higher-ranked admin
- Viewer cannot perform write actions (backend enforced)

## Animated inputs
- `AnimatedInput` component at `src/components/ui/animated-input.tsx` — typewriter placeholder only, no overlay spans (font glitch fix)
- Used in login.tsx and register.tsx

## AppUser vs User
- `AppUser` = end users of protected apps (managed via /api/users endpoint)
- `User` = dashboard owners/team members
- SDK tries AppUser first, falls back to User for login

## Generated API hooks (api-client-react)
- Hook types use `number` for IDs but MongoDB returns string IDs → cast with `as any` when passing MongoDB `_id` string to mutation hooks
- Must run `pnpm run typecheck:libs` before typechecking artifact packages to build declaration files

## Why
- `@apply dark` throws "Cannot apply unknown utility class `dark`" in Tailwind v4 because `dark` is a custom variant, not a utility.
- Files stored as base64 to avoid multer/disk complexity in MongoDB environment.
- AnimatedInput overlay spans caused font rendering glitch on paste — simplified to typewriter placeholder only.
