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

- Route: `apps/nevedelE/app/one-day/page.tsx` (`/one-day`)
- Run: `npm run dev`, then open `http://localhost:3000/one-day`
- Flow: `IMPULSE -> SPECTRUM -> RESULT -> SILENCE -> CLOSED`
- Copy guardrail: all One Day copy is centrally validated; do not add CTA/question/future-binding or identity language.
- Design is intentionally neutral; do not add CTA styling.
- Smoke checklist: `docs/one-day-smoke.md`.
- Day variation is deterministic and non-personal.
- Multiple spectra exist, but only one is ever shown per session.
- UI components: `ScreenShell`, `TitleBlock`, `SentenceBlock`, `SpectrumSlider` in `apps/nevedelE/app/one-day/ui.tsx`.
- Edit copy/content packs in `apps/nevedelE/app/one-day/copy.sk.ts`.
- Space budgets: see `apps/nevedelE/app/one-day/space-budget.ts` (impulse sentence, result title words, result text chars).
- Content packs can be swapped without code changes.
- Meaning states rotate deterministically; content is swappable.
- Content packs are JSON-based in `apps/nevedelE/app/one-day/content/packs/`.
- Build-time selection: `NEXT_PUBLIC_CONTENT_PACK=pack-a|pack-b` (default `pack-a`).
- Validate a pack offline: `npm run validate:content -- apps/nevedelE/app/one-day/content/packs/pack-a.json`.

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


## Release checklist

- `npm run release:check`
- `npm run validate:content -- apps/nevedelE/app/one-day/content/packs/pack-a.json`
- `npm run validate:content -- apps/nevedelE/app/one-day/content/packs/pack-b.json`

## Telemetry privacy

- Telemetry is off by default.
- Enable on web client: `NEXT_PUBLIC_TELEMETRY_ENABLED=true`.
- Enable server logging endpoint: `TELEMETRY_ENABLED=true`.
- Allowed payload fields only: `name`, `ts`, `session_id`, optional `build_version`, optional `platform`.
- No user ids, no slider values, no content text, no profiling fields.
