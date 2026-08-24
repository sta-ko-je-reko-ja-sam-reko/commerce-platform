# commerce-platform

Headless commerce platform for B2B distribution, built on a **Microsoft Dynamics 365 Business Central** system of record.

The premise: buy the commodity layers, build the commercial logic. Storefront rendering, search, payments and identity are bought. Price resolution, availability, quoting and service scheduling are built, because they sit closest to the ERP and are where a distribution business actually differs from its competitors.

## Architecture position

```
CDN / WAF → Storefront (SSR) → BFF
                                 ├── catalogue     (read model + search index)
                                 ├── pricing       (customer price, read-through)
                                 ├── availability  (ATP by location and date)
                                 ├── quote         (quotes, projects, revisions)
                                 ├── scheduling    (delivery and service capacity)
                                 ├── configurator  (dependent-option rules)
                                 └── order-gateway (sole writer into BC)
                                        │
                          commerce-integration  →  Business Central
```

Companion repositories: [commerce-integration](https://github.com/sta-ko-je-reko-ja-sam-reko/commerce-integration) (Azure integration layer) and [commerce-connector-bc](https://github.com/sta-ko-je-reko-ja-sam-reko/commerce-connector-bc) (AL extension).

## Governing rules

- **The shop never decides money or stock.** It reads both from BC, caches them under an explicit staleness budget, and degrades visibly when it cannot.
- **Public pages never touch BC.** Catalogue and list prices are served from a local read model, projected from BC events and reconciled nightly.
- **Customer price, ATP and credit are read-through** at cart and checkout only, where correctness outranks latency.
- **One writer.** `order-gateway` is the only service that writes to BC, with idempotency keys and a staged outbox.
- **Anti-corruption layer.** No BC table, field or enum name appears in a domain service. Mapping lives in `commerce-integration`.

## Planned layout

```
apps/       storefront, ops-console
services/   bff, catalogue, pricing, availability, quote, scheduling, configurator, order-gateway
packages/   contracts (OpenAPI/AsyncAPI + generated types), ui, config, testing
infra/      Bicep modules and per-environment parameters
docs/       architecture decision records, integration contracts, staleness budgets
```

Monorepo on pnpm workspaces with path-filtered CI, because the highest-frequency change is a contract change that touches several services at once.

## Status

Early design. No runtime code yet — architecture decisions and interface contracts land first.

## Licence

MIT
