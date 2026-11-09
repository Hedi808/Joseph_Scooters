# Source audit and reuse

## Provenance and isolation

- Reference: https://github.com/Hedi808/jshop.git
- Pinned source commit: **`bcbe3018f7775531b76a3fb07ac122437eafcbc0`**.
- Git was not installed/on PATH. The commit was resolved through GitHub's API, then its source archive was downloaded to `C:\Users\dadi2\AppData\Local\Temp\opencode\jshop-audit\Hedi808-jshop-bcbe301`.
- The initial working directory was empty. The new application lives only in `josheph-scooters/`.
- No original repository files were edited. No push, original environment import, original database connection or original seed was performed. The archive contained `.env.example`, not a copied live environment.
- Git milestones could not be committed because Git is unavailable and the workspace is not a Git repository.

## Files inspected

`AGENTS.md`, `package.json`, `README.md`, `app/(shop)/page.tsx`, `app/(shop)/layout.tsx`, `app/globals.css`, `components/home/hero.tsx`, `components/layout/header.tsx`, `components/product/product-card.tsx`, `lib/auth.ts`, `lib/supabase.ts`, the opening data/query/type sections of `lib/data.ts`, `lib/catalog.ts`, `lib/i18n.ts`, the seed setup in `scripts/seed.ts`, initial schema definitions and customer-session migration. Partial reads are not a claim of a complete source security audit.

The reference's `AGENTS.md` requires installed version-specific Next.js docs. The new app's installed Next.js docs for async page parameters, cookies, server actions and `proxy.ts` were read before application code was written.

## Reuse map

| Source | Retained concept | New implementation |
|---|---|---|
| `app/globals.css` | `#FF6500`, `#0A0A0A`, `#151515`, white/gray surfaces, Arial/Helvetica, uppercase tight headings, shell layout, reduced motion | `app/globals.css`, purpose-built responsive mobility showroom |
| `components/home/hero.tsx`, home page | dark editorial hero, orange CTAs, fine grid, sectional hierarchy | `app/page.tsx`, local conceptual mobility SVGs |
| `components/layout/header.tsx` | search, category navigation, account/wishlist/cart badge | `components/header.tsx`, native accessible mobile disclosure and cart dialog |
| `components/product/product-card.tsx` | rounded product image surface, brand, price, hover zoom, saved items | product cards with vehicle specs, comparison and no fabricated reviews |
| `lib/i18n.ts` | validated locale cookie, French fallback, FR/EN/AR and RTL | `lib/locale.ts`, `lib/i18n.ts`, `StoreProvider` |
| catalogue/cart/account concepts | reusable products/categories, guest persistence, private order history | new typed models, local state and RLS-backed account routes |
| SQL entities | category/product/variant/order/item concepts | independent lowercase UUID schema, no reference migrations copied |

This is **design and pattern reuse, not a wholesale copy**. Most implementation code is new because the reference commerce security model was unsuitable for production reuse.

## Findings and deliberate replacements

- Reference `lib/auth.ts` uses custom password hashes and a custom `Session` table/cookie. Replaced with Supabase Auth identities and SSR session refresh. No migration by matching arbitrary email addresses.
- Reference `lib/supabase.ts` exposes only a server secret-backed client to its data layer. Replaced application requests with publishable-key SSR clients and RLS. Elevated keys are restricted to explicit development seed/integration scripts.
- README explicitly states admin authorization, durable rate limiting, verification and recovery must be added. New admin layout, page loader, action and RPC authorization are implemented. Supabase verification/recovery flows are wired.
- Reference catalogue seed includes generated sales/review counts, endorsements, discounts, warranties and broad shipping assumptions. None were copied. Demo products are visibly fictional; no customer data is seeded.
- Reference homepage downloads a catalogue and sorts/filters it. New real-catalog queries use PostgreSQL full-text search, database filtering and bounded pagination.
- Original 7/15 TND shipping and card option were not copied. Shipping has no initial fees; COD defaults off; no unconnected card payment is shown.

Remaining limitations are tracked in `DELIVERY_REPORT.md`, not hidden behind claims of production completeness.
