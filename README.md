# Josheph Scooters

Independent French-first electric mobility storefront and administration application, inspired by the owner's JShop. **Not approved for production yet:** database-backed workflows require a new Supabase project and live verification. See [DELIVERY_REPORT.md](DELIVERY_REPORT.md) for implemented scope and remaining work.

## Run locally

Node.js 22+ and npm are recommended (Next.js requires a supported Node runtime).

```powershell
cd josheph-scooters
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. With empty Supabase variables and explicit `DEMO_MODE=true`, the site displays fictional local products. Demo checkout is always disabled, including for demo records seeded in Supabase. With no database and demo mode disabled, the catalogue is empty and account/admin operations fail closed. There is no fake order success.

To connect real development data, follow [SETUP.md](SETUP.md). **Never reuse JShop's credentials, database, migrations or environment file.**

## Stack and structure

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, Lucide, Zod 4.
- Supabase Auth with SSR cookies; publishable-key clients and PostgreSQL RLS for application requests. No application service-role client.
- Integer TND millimes throughout pricing; PostgreSQL transaction functions control orders, inventory and status transitions.
- `app/page.tsx`: showroom homepage; `app/[...path]/page.tsx`: validated storefront/account route dispatcher; `app/admin/[[...path]]/page.tsx`: protected admin dispatcher. Catch-all routes deliberately share implementations without conflicting page definitions.
- `components/`: header/mobile menu/cart drawer, catalog, gallery, product controls/cards, checkout, reusable action forms, local guest store.
- `lib/`: validation/domain types, data access, SSR Auth, translations, server actions, shipping quote.
- `supabase/migrations/`: independent schema, policies, RPCs, Storage and profile trigger.
- `scripts/seed.ts`: optional development-only fictional catalogue seed.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm audit
```

Playwright defaults to installed Microsoft Edge on Windows. On other systems, install Chromium with `npx playwright install chromium` and remove `channel: 'msedge'` from `playwright.config.ts`. Browser tests start a separate demo-only development server on port 3100; they intentionally clear Supabase variables.

The live integration test skips unless all `TEST_*` opt-ins documented in [SETUP.md](SETUP.md) are present. Static SQL contract tests are not a substitute for running the database tests.

## Documentation

- [SOURCE_REUSE.md](SOURCE_REUSE.md): pinned baseline, audit, design reuse and security replacements.
- [SETUP.md](SETUP.md): environment, independent Supabase, Auth, Storage, admin bootstrap and tests.
- [DATABASE.md](DATABASE.md): model, RLS, order and stock invariants.
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md): product, order, content and inventory operations.
- [SECURITY.md](SECURITY.md): controls, threat boundaries and launch blockers.
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md): mandatory launch gates.

No real phone number, address, reviews, manufacturer claims, shipping fees, discounts, warranty promises or payment provider have been invented. Local SVGs are original illustrative placeholders, not the owner's official logo or product photography.
