# Production deployment checklist

## Blocking gates

- [ ] New, isolated Supabase development/staging/production projects; owner confirms none is JShop.
- [ ] All migrations execute successfully on staging; schema/RLS/grants reviewed.
- [ ] Opt-in live integration test passes, including concurrent last-unit checkout, retry idempotency, cancellation release, ownership and admin denial.
- [ ] Authenticated browser tests cover sign-up verification/recovery, account order history and real admin product/order operations.
- [ ] Trusted edge/WAF rate limiting and bot protection replace reliance on conservative global RPC counters; origin/IP forwarding verified.
- [ ] Admin MFA/assurance, minimal membership list and recovery procedures configured.
- [ ] SMTP verification/recovery messages deliver; exact callback allowlist and correct deployment Site URL.
- [ ] Verified identity, contact, address if provided, applicable tax treatment, legal/privacy/terms/returns/warranty policy approved.
- [ ] TND/tax display and shipping rule calculation approved for the business. Configurable currencies, taxes, fulfillment-size rules are not yet implemented.
- [ ] Real products, specs, variants, prices and stock checked. Conceptual assets replaced by authorized imagery; all demo records archived/removed.
- [ ] Full FR/EN/AR content/validation/error translation audit completed; Arabic mobile/desktop flows manually checked.
- [ ] No secrets in committed files, rendered pages, client bundles, logs or public settings. No seed/test elevated credentials on deployment.
- [ ] HTTPS, production cookies, Auth refresh and allowed Server Action origins validated behind final hosting proxy.
- [ ] Media decoding/re-encoding/dimension limits and CSP reviewed for deployment threat model.
- [ ] Stock reconciliation, cancellation SLA, returns/refund accounting and customer notifications operationally defined.

## Deployment and maintenance

- [ ] `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm audit` green on deployment commit.
- [ ] Browser breakpoints 360/390/768/1024/1440 and keyboard/focus/reduced-motion tested on key routes, not homepage alone.
- [ ] Measure Lighthouse and field performance on actual hosting; do not infer scores from a successful build.
- [ ] Check canonical/metadata/sitemap (currently capped at 1,000 product URLs), private robots/noindex, schema accuracy and image alt text.
- [ ] Database backups/PITR, restore drill, monitoring, safe error logs, alerting and data retention configured.
- [ ] Rate counters/media orphan retention jobs and privacy data export/deletion procedures defined.
- [ ] COD enabled only after a controlled real staging checkout, authoritative shipping quote and staff confirmation test.
- [ ] Card payment remains absent until a compliant real provider is implemented and verified.
- [ ] Disable `DEMO_MODE` in production. There is no automatic deployment or claim of successful deployment in this delivery.
