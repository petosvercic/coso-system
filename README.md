# coso-system

Monorepo:

- packages/coso-engine - deterministický výpočet (compute) nad vstupom (seed/hash)
- packages/coso-contract - typy + schémy (validný input/output)
- apps/nevedelE - Next.js produktová appka (UI skeleton) + render edícií

## One Day MVP flow

### Web build and run
- Dev: `npm run dev`
- Build: `npm run build:nevedelE`
- Open: `http://localhost:3000/one-day`

### Notes
- Flow: `IMPULSE -> SPECTRUM -> RESULT -> SILENCE -> CLOSED`
- Copy guardrail: all One Day copy is centrally validated.
- Design is intentionally neutral; do not add CTA styling.
- Multiple spectra exist, but only one is shown per session.
- Content packs are swappable JSON files.

### Localization
- Supported languages: `sk` (default), `en`.
- Selection: browser/platform locale (`sk`, `en`), fallback to `sk`.
- Locale chrome: `apps/nevedelE/app/one-day/locales/sk.json`, `apps/nevedelE/app/one-day/locales/en.json`.
- Content packs: `apps/nevedelE/app/one-day/content/packs/pack-*.{sk,en}.json`.

### Content packs
- Build-time selection: `NEXT_PUBLIC_CONTENT_PACK=pack-a|pack-b` (default `pack-a`).
- Validate one pack: `npm run validate:content -- apps/nevedelE/app/one-day/content/packs/pack-a.sk.json`.
- Validate all packs: `npm run validate:content:all`.

## Release checklist

- `npm run release:check`
- `npm run validate:content:all`
- `npm run validate:env`

## Telemetry privacy

- Telemetry is off by default.
- Client flag: `NEXT_PUBLIC_TELEMETRY_ENABLED=true|false`.
- Server flag: `TELEMETRY_ENABLED=true|false`.
- Allowed payload fields only: `name`, `ts`, `session_id`, optional `build_version`, optional `platform`.
- No user ids, no slider values, no content text, no profiling fields.

## Env setup (local/preview/prod)

`.env.local` is ignored by git. Use `.env.example` as the key list template.

### Server-only vars
- `PAYMENTS_ENABLED`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `GOLD_TOKEN_SECRET`
- `TELEMETRY_ENABLED`

### Client-exposed vars
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PAYMENTS_ENABLED`
- `NEXT_PUBLIC_CONTENT_PACK`
- `NEXT_PUBLIC_TELEMETRY_ENABLED`
- `NEXT_PUBLIC_BUILD_VERSION`
- `STRIPE_PUBLISHABLE_KEY`

### Payments / Stripe
- Checkout endpoint: `POST /api/checkout/gold`
- Quiet pages: `/gold/success`, `/gold/cancel`
- Webhook endpoint: `POST /api/webhooks/stripe`

For `PAYMENTS_ENABLED=true`, required envs are validated by `npm run validate:env`:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_PUBLISHABLE_KEY`
- `GOLD_TOKEN_SECRET`

### Webhook testing (local)
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Webhook deployment notes
- Production: set webhook endpoint to `https://<prod-domain>/api/webhooks/stripe`
- Preview: either configure a preview endpoint per environment or keep webhooks disabled in preview.

## Edície (source of truth)

Edície sú uložené ako dáta v repozitári:

- Index: apps/nevedelE/data/editions.json
- Konkrétna edícia: apps/nevedelE/data/editions/<slug>.json

Príklad edície:

```json
{
  "slug": "test-002",
  "title": "Test 002",
  "content": { "hello": "again" },
  "createdAt": "2026-02-02T10:28:37.149Z"
}
```
