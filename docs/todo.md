# Next steps — commerce-platform

Ordered. Each item states what "done" means, so it can be picked up cold.

## 1. Contract additions for phase 1

The projection needs two feeds the contract does not yet describe.

- [ ] Add a **stock feed** to `openapi/erp-commerce-v1.yaml` — cursor-paged, band per item and location, never a quantity. The `StockBand` schema already exists.
- [ ] Extend `scripts/validate.mjs` with a rule asserting the stock feed exposes no quantity field, the same way `Item` is already asserted.
- [ ] Version as **1.1.0** (additive), tag `contracts-v1.1.0`, then raise `CONTRACT_PIN` in `commerce-integration`.

Done when: `pnpm contracts:validate` passes with the new rule, the tag is published, and the integration pin check passes against it.

## 2. Catalogue read model

- [ ] `services/catalogue` — Postgres schema for items, variants, attributes, categories, media references and list prices. Cursor watermark table.
- [ ] Idempotent upsert. Re-applying a row must be a no-op; this is what makes at-least-once delivery safe.
- [ ] Content-hash column so the nightly reconcile can compare without refetching everything.

Done when: applying the same delta page twice produces identical rows and no duplicate keys, proven by a test.

## 3. Search projection

- [ ] Denormalized product document carrying the materialized category path, so facet filtering is one term query.
- [ ] Index to an alias, swap on completion. Reindexing must stay online.
- [ ] Facet counts from engine aggregations at query time — never counted per category in application code.

Done when: the index can be rebuilt from Postgres alone, and the swap causes no failed request.

## 4. BFF read endpoints

- [ ] Listing with facets, search, product detail. All served from the projection.
- [ ] Every response carries `asOf`; a projection past its staleness budget marks itself degraded.

Done when: an integration test with the connector unreachable still serves browse, search and detail.

## 5. Storefront

- [ ] Listing, facets, search, product detail pages. SSR with edge caching.
- [ ] Accessibility and Core Web Vitals in the definition of done, not a later epic.

## Not yet started, deliberately

Quote, scheduling, configurator and checkout services exist as folders in the plan only. Phases 2–4. Do not start them before the catalogue is serving.

## Housekeeping

- [ ] `pnpm lint` currently executes no task — no linter is configured. Add one, or drop the script so the CI step stops implying a check that is not happening.
