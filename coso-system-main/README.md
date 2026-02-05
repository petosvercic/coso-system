# coso-system

Monorepo:

- packages/coso-engine - deterministický výpočet (compute) nad vstupom (seed/hash)
- packages/coso-contract - typy + schémy (validný input/output)
- apps/nevedelE - Next.js produktová appka (UI skeleton) + render edícií

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
