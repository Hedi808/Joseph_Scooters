# Setup — independent Supabase only

## 1. Create a new project

Create a separate Supabase project named for Josheph Scooters. Record its project reference. Do **not** select the existing JShop project or paste its credentials. Use separate development, staging and production projects.

Create `.env.local` from `.env.example` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_FROM_NEW_PROJECT
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=false
```

Only the project URL and publishable key are required for the application. No `SUPABASE_SECRET_KEY` is needed for application requests. Do not prefix any elevated key with `NEXT_PUBLIC_`.

## 2. Apply migrations

On that fresh project, run these files in order in Supabase SQL Editor, or use Supabase CLI migrations after explicitly linking the **new** project:

1. `supabase/migrations/202611090001_independent_store.sql`
2. `supabase/migrations/202611090002_admin_revenue.sql`
3. `supabase/migrations/202611090003_profiles_and_validation.sql`
4. `supabase/migrations/202611090004_discovery_indexes.sql`

These are initial migrations, not reset scripts. Do not rerun the initial schema against an existing schema. Do not apply them to JShop. Check SQL results before proceeding. They have **not been executed against a live database in the implementation environment**.

The schema expects Supabase's `auth` and `storage` schemas. The initial migration pins pgcrypto to `public` in this new database. Review this with your database administrator if the new project has pre-existing extensions/customizations.

## 3. Configure Auth

- Set Site URL to the exact deployment origin.
- Allow `http://localhost:3000/auth/callback` in development and `https://YOUR_DOMAIN/auth/callback` in production. The recovery redirect includes `?next=/reset-password`; allow that exact URL where required.
- Enable email confirmation. Configure a real SMTP provider before launch; Supabase's default delivery limits are not suitable for a public shop.
- Set password requirements to at least 12 characters. The UI currently applies the 12-character minimum at login as well because this app starts with new Auth accounts, not legacy passwords.
- Enable Supabase Auth rate limits and CAPTCHA/bot protection at the project/edge where available. Complete delivery, expired-link and abuse tests.
- Auth uses PKCE code exchange at `/auth/callback`, server-set HTTP-only cookies and `proxy.ts` refresh. Only `/account` and `/reset-password` are allowed callback destinations.

## 4. Bootstrap the initial admin manually

1. Register and verify the intended administrator's account.
2. Find its exact UUID in **Authentication → Users**.
3. As the trusted project administrator, execute in SQL Editor:

```sql
insert into public.admin_memberships(user_id)
values ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid)
on conflict do nothing;
```

Never insert an email into this table, grant roles through editable user metadata, or expose this bootstrap in registration UI. Test that an ordinary verified user cannot enter admin or invoke admin RPCs. Remove an admin by deleting only that user's membership using a trusted SQL session. Add MFA/session assurance before production admin use.

## 5. Storage and business configuration

The migration creates public bucket `product-media`, max 5 MiB, JPEG/PNG/WebP only. Only admins can write/delete objects. Application uploads check signatures and use UUID filenames. Do not store private customer documents here.

Open `/admin/settings`. Enter verified business name, contact email, WhatsApp international digits (no invented default), address if supplied, legal texts, delivery/returns/warranty policies and hero copy. Leave COD disabled until policies and delivery fees are approved. Configure actual region/category delivery rules; no coverage or fee is assumed.

Then create and publish **real** products with verified descriptions, prices, specs and inventory. Replace conceptual illustrations with authorized photographs. `demo=true` records remain unorderable regardless of COD settings.

## 6. Optional development seed

For a disposable development project only, set:

```dotenv
DEMO_MODE=true
SEED_SUPABASE_SECRET_KEY=YOUR_DEVELOPMENT_SERVER_SECRET
SEED_CONFIRM_PROJECT_REF=YOUR_DEVELOPMENT_PROJECT_REF
```

Run `npm run db:seed`. This is idempotent by deterministic UUID. It creates 12 clearly fictional products and representative variants, including out-of-stock and featured records. It creates no users, orders, ratings, reviews, shipping fees or policies. It refuses `NODE_ENV=production`, missing project confirmation, missing demo opt-in or missing credentials. An explicit development key/reference is still a human safety boundary: never supply a production key. Remove the seed key afterward.

## 7. Verification

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm audit
```

For the live database integration test, provision a **dedicated disposable test project**, apply all migrations, then set shell variables `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_SUPABASE_SECRET_KEY`, `TEST_CONFIRM_PROJECT_REF` and `TEST_ALLOW_FIXTURES=true`. Run `npm test` in that shell. The test creates verified test identities, an admin membership, a real orderable test product and audit trails; temporarily enables COD and a delivery rule, restoring settings/rule afterward and archiving its test product. Test orders/users remain intentionally for inspection. Never run against production, JShop or a shared staging shop. Missing variables cause an explicit skipped test, not a false pass.

## 8. Start production build

```powershell
npm run build
npm start
```

Deploy on a supported Next.js Node hosting platform with HTTPS, environment variables set through its secret manager, the correct proxy/origin configuration, database backups, logging and monitoring. See the launch checklist. No deployment was performed by this implementation.
