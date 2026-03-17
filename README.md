# Tipos Keno Collector MVP

Privátna Next.js + Vercel + Supabase appka na live zber e-KLUB KENO žrebovaní.

## Čo obsahuje

- `app/api/cron/fetch-draw/route.ts` - Vercel cron endpoint každé 4 minúty
- `lib/etipos.ts` - SOAP fetch z `GetLastDraw`
- `supabase/schema.sql` - databázová schéma
- `middleware.ts` - Basic Auth ochrana dashboardu
- `app/page.tsx` - jednoduchý privátny dashboard
- `vercel.json` - cron konfigurácia

## 1. Lokálne rozbalenie do cieľa

Rozbaľ zip do:

`E:\Tipos 2`

Potom v PowerShelli:

```powershell
cd "E:\Tipos 2"
git init
git branch -M main
git remote add origin https://github.com/petosvercic/coso-system.git
npm install
```

Ak remote už existuje:

```powershell
git remote remove origin
git remote add origin https://github.com/petosvercic/coso-system.git
```

## 2. Supabase

1. Vytvor nový projekt.
2. Otvor SQL Editor.
3. Spusť obsah `supabase/schema.sql`.
4. Zober si:
   - Project URL
   - anon key
   - service role key

## 3. Env premenné

Skopíruj `.env.example` do `.env.local` a doplň hodnoty.

## 4. Vercel

1. Import repo z GitHubu do Vercel.
2. Nastav všetky env premenné z `.env.example`.
3. Deployni projekt.
4. Vercel cron začne volať `/api/cron/fetch-draw` každé 4 minúty.

## 5. Prvé otestovanie

Lokálne:

```powershell
npm run dev
```

Manuálne otestovanie cron route:

```powershell
$headers = @{ Authorization = "Bearer TVOJ_CRON_SECRET" }
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/fetch-draw" -Headers $headers
```

## 6. Push do GitHubu

```powershell
git add .
git commit -m "Initial Tipos Keno collector MVP"
git push -u origin main
```

## Poznámky

- Dashboard je chránený cez Basic Auth.
- Cron route je chránená cez `CRON_SECRET`.
- `draw_id` je unikátny, takže nevzniknú duplicity.
- Toto je MVP scaffold. Backfill archívu a analytický modul dopíšeme potom.
