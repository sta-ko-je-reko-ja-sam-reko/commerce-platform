# Implementation plan

The master plan for all three repositories. Each repository also carries its own scoped slice of this in its `docs/implementation-plan.md`, and its immediate next actions in `docs/todo.md`.

## The three repositories

| Repository | Owns |
|---|---|
| [`commerce-platform`](https://github.com/sta-ko-je-reko-ja-sam-reko/commerce-platform) | Storefront, BFF, domain services, **the contract**, architecture decisions |
| [`commerce-integration`](https://github.com/sta-ko-je-reko-ja-sam-reko/commerce-integration) | API façade, eventing, mapping, orchestration, IaC |
| [`commerce-connector-bc`](https://github.com/sta-ko-je-reko-ja-sam-reko/commerce-connector-bc) | The AL extension inside Business Central |

The contract in `packages/contracts` is the only thing that crosses repository boundaries. It is released as a tag; the other two pin it and validate against it in their own pipelines.

## Build order, and why

```
0  integration layer + read models          ← done
1  anonymous catalogue                       ← next
2  authenticated B2B self-service
3  quote / project + configurator
4  checkout: payments, credit, scheduling
5  punchout, EDI, procurement integrations
```

Anonymous catalogue first because it ships early, earns traffic and carries zero transactional risk. Checkout last because it is the riskiest and the incumbent keeps working until it lands. Phases 0–2 are the ones that must land before a separation deadline; checkout can stay on an incumbent longer than people expect.

## Phase 0 — foundations (complete)

| Item | Where | State |
|---|---|---|
| Architecture decisions 0001–0005 | platform `docs/adr/` | done |
| ERP contract, OpenAPI + AsyncAPI | platform `packages/contracts/` | done, released as `contracts-v1.0.0` |
| Contract validation gate | platform | done, negative-tested |
| Keyset paging | integration `src/catalogue/` | done, 10 tests |
| Throttle-aware retry + circuit breaker | integration `src/shared/` | done, 12 tests |
| Service Bus topology, observability | integration `infra/bicep/` | done, not deployed |
| Setup, catalogue feed, category API | connector | done, compiles clean |
| Order staging, intake, retry | connector | done, compiles clean |
| Change outbox + subscriber proxies | connector | done, compiles clean |
| CI on all three | all | done |
| Real AL compile against BC 27 | connector | done, zero errors, zero warnings |

## Phase 1 — anonymous catalogue

The goal is a public storefront serving browse, search and product detail entirely from a local projection, with Business Central never in a request path.

**Connector.** Publish what the projection needs and nothing more: a stock feed (band, never a quantity), and a price-list delta feed. Add the test app and unit tests over the existing interfaces.

**Integration.** The catalogue sync function: pull the delta with the keyset cursor, map to the canonical model, upsert into the projection. The reconciliation job comparing content hashes. The outbox collector.

**Platform.** The catalogue read model in Postgres, the search index and its projection, the BFF read endpoints, and the storefront pages — listing, facets, search, product detail.

**Definition of done.** A catalogue of tens of thousands of items browses and searches with no ERP call on the request path; killing the connector leaves browse working; the reconcile job reports zero corrections on a steady catalogue.

## Phase 2 — authenticated B2B self-service

Customer-specific price, order history, invoices, statements, reorder. This is where read-through starts: the price service and the availability service, both bulk-only, both behind the circuit breaker, both returning the provenance envelope.

Requires the connector's `CMC IPriceResolver` and `CMC IAvailability` implementations, and the credit endpoint.

## Phase 3 — quote / project and configurator

The differentiator. Quotes with revisions, validity, approval chains and partial conversion to order; the cart is a degenerate quote rather than the other way round. The configurator resolves dependent options into a BOM the ERP can actually post.

## Phase 4 — checkout

Payments through a hosted-fields provider so card data never reaches the origin. The credit gate, which fails closed. Delivery and service slot reservation with expiry. Order submission through the single writer with an idempotency key.

## Phase 5 — punchout and EDI

Per-customer, long lead times. Start the commercial conversations during phase 3, because carrier and procurement integrations have lead times measured in months.

## Standing rules

These are decided and not open for rediscovery. Each has an ADR.

- The shop never decides money or stock. It reads both, caches under a written staleness budget, and degrades visibly.
- Public pages never touch Business Central.
- Read paths degrade, write paths queue, money and credit fail closed.
- One writer into the ERP, always with an idempotency key.
- No BC table, field or enum name appears in a domain service. Mapping lives in the integration layer.
- Catalogue paging is a composite keyset predicate. Not `gt`, not `ge`.
