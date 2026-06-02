---
name: HexAuth Architecture
description: Key conventions, route map, and sharp edges for the Hex Auth SaaS platform.
---

# HexAuth Architecture

## Product
Hex Auth — SaaS authentication and license management platform for software developers. Features: JWT auth + HWID binding, license key generation/redemption, admin dashboard, Python SDK, Discord webhooks.

## API structure
- All routes at `/api` prefix (handled by Express, mounted in `app.ts`)
- Route files: auth, apps, users, licenses, logs, sessions, blacklist, subscriptions, settings, stats, sdk
- All dashboard/admin routes require `requireAuth` middleware from `src/middlewares/auth.ts`
- JWT stored in localStorage as `hexauth_token`; sent via `Authorization: Bearer <token>`

## Database tables
users, apps, licenses, logs, sessions, blacklist, team_members, variables — all in `lib/db/src/schema/`

## Auth flow
1. POST /api/auth/register → creates user, sends verification code (logs code if SMTP not configured)
2. POST /api/auth/verify-email → verifies code, returns JWT
3. POST /api/auth/login → validates credentials + email verified + not banned → returns JWT

## SDK flow
POST /api/sdk/login takes appId, username, password, hwid, version → binds HWID on first login, checks blacklist, returns sessionToken. POST /api/sdk/validate checks sessionToken liveness.

## Payment info (landing page)
bKash 01755334082 · Nagad 01755334082 (must NOT change to other providers)

## Tailwind v4 dark mode
Use `@custom-variant dark (&:is(.dark *))` in CSS; add `document.documentElement.classList.add("dark")` in main.tsx. Do NOT use `@apply dark` — invalid in Tailwind v4.

## Team invite flow
1. Owner sends invite → `POST /api/settings/team/invite` → creates TeamMember (status=pending) → sends email
2. Invited person clicks link → `GET /api/settings/team/accept/:token` → backend marks accepted → **redirects to frontend `/invite-accepted?ok=1`** (or `?error=expired|notfound|invalid`)
3. Frontend `/invite-accepted` page shows success (green) / expired (yellow) / invalid (red) state
4. Team list (`GET /api/settings/team`) now returns `status` field (pending/accepted) for each member

## Team UI permissions
- Invite + remove buttons only visible when `user.role === "owner"`
- Role badges: owner=yellow/Crown, admin=blue/Shield, viewer=gray/Eye
- Pending members show yellow "Pending" badge; accepted show green "Active" badge

## Animated inputs
- `AnimatedInput` component at `src/components/ui/animated-input.tsx` — accepts `typedPlaceholder` prop for typewriter effect
- Used in login.tsx and register.tsx; replaces standard `Input` for username/email/password fields

## Password match indicator (register.tsx)
- Uses `useWatch` from react-hook-form to track `password` + `confirmPassword` values live
- `confirmBorderClass`: green border+bg when match, red when mismatch, neutral when empty

## Why
`@apply dark` throws "Cannot apply unknown utility class `dark`" in Tailwind v4 because `dark` is a custom variant, not a utility.
