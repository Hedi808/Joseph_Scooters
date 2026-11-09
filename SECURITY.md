# Security and production status

**Not a security certification or production-ready declaration.** Live Supabase migrations/policies and authenticated workflows have not been executed in this environment. Do not enable public commerce before the checklist and integration tests pass.

## Implemented controls

- No JShop connection/configuration copied. Application never uses a service-role/secret key.
- Supabase Auth owns passwords and identities; no custom password database or client-asserted role.
- SSR PKCE integration, validated Auth users, HTTP-only/lax cookies, secure cookies in production, refresh via Next.js 16 `proxy.ts`.
- Server admin checks on layout, page loader and every admin action; independent database policies and RPC checks. Membership has no customer write policy.
- Zod 4 request validation; database constraints and function checks; parameterized Supabase requests; bounded catalog/page sizes.
- Next Server Actions same-origin protections; external callback destinations are not accepted. Keep proxy origin configuration correct.
- Authoritative database prices/shipping/stock, transactional row locks, stable lock ordering, retry UUID/fingerprint/token checks and immutable order item snapshots.
- Customer private data uses authenticated UUID ownership, not supplied email. Guest confirmation needs a hashed high-entropy scoped cookie token and returns only a minimal summary.
- Native React text rendering for descriptions/policies (no untrusted HTML). Structured JSON escapes `<`.
- MIME/signature/size checks and UUID Storage paths, admin-only writes, no SVG uploads, no private media in public bucket.
- Audit triggers for sensitive catalogue/content changes, status history and inventory movement reasons/actors.
- Durable DB-backed mutation counters, plus Supabase Auth's project-side throttles. Defensive headers for framing, MIME sniffing, referrers and device permissions.
- No fake card payment, no paid COD success, no publicly queryable order/customer list.

## Rate limiting boundaries

`consume_rate` fixes its quota to 10 attempts per hour regardless of caller-supplied maximum/window. Server actions hash action bucket plus `x-forwarded-for` first address (or a shared fallback). Trust that header only behind a controlled ingress which overwrites it. Supabase Auth abuse controls must also be enabled.

Anonymous RPCs enforce an additional fixed global 10/hour checkout/inquiry quota because publishable keys and RPC endpoints are public. This conservative default protects order writes but is **not a scalable per-customer production limiter**: an attacker can exhaust it, and counters inside failed transactions roll back. The public bucket helper cannot prove caller IP. Before launch, implement and load-test trusted edge/WAF throttling and CAPTCHA, size limits and retention/cleanup of rate-limit records. Do not claim the current counters prevent distributed abuse.

## Elevated operations

SQL security-definer functions intentionally elevate narrow workflows. They pin search paths, enforce authorization where needed, accept bounded inputs and have explicit execute grants. Application users cannot directly mutate orders/status/inventory. The **only** JavaScript elevated clients are opt-in seed and disposable integration scripts; never deploy their elevated environment variables to the public application.

## Remaining hardening / known risks

- Execute migrations, verify role grants, RPC failure paths, email delivery and cross-user RLS against a new Supabase project. Static SQL text assertions do not validate PostgreSQL execution or concurrency.
- Add administrator MFA/assurance checks and session revocation procedures.
- Add trusted ingress rate limiting, CAPTCHA, contact spam moderation, rate bucket cleanup and log retention.
- Signature sniffing is not full image decoding/antivirus scanning. Production media may need decoding/re-encoding, dimension limits and orphan cleanup. Storage operations and DB media metadata are not one distributed transaction.
- External HTTPS product images are allowed for admins and bypass Next's remote optimizer; restrict allowed hostnames and use your Storage bucket for launch. No customer-controlled remote image input is accepted.
- No enforced CSP yet. Implement/test a nonce-based CSP rather than adding a policy that breaks Next.js scripts.
- No automatic pending-reservation expiry, notifications, or full returns/refund ledger. Maintain an operator reconciliation procedure.
- Guest local browser cart/wishlist/comparison are display snapshots, not authoritative stock/prices; checkout rejects stale/unavailable data. Session storage retains the short-lived raw retry token so a tab reload can retry; protect against XSS and clear attempts on shared devices. The confirmation cookie is HTTP-only.
- Signed-in wishlist visits hydrate and merge up to 100 local/remote saved products. Verify cross-device synchronization and failure/retry behavior against live Auth; unsynchronized local removals during network failure may reappear after a later merge.
- Language dictionaries/RTL work for primary commerce labels but editorial/legal/errors still include French fallback. Do not advertise complete trilingual coverage yet.
- No penetration test, measured Lighthouse score, accessibility certification or compliance approval is claimed.

Keep dependencies patched. During implementation, Zod was upgraded from vulnerable v3 to v4 and the TypeScript-ESLint minimatch dependency was overridden to the patched v11 range. Run `npm audit` and rerun lint/build/tests before changing that override.
