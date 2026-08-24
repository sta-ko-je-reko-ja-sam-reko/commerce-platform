# @commerce/contracts

The interface between the commerce platform, the integration layer and Business Central. This package is the single source of truth for all three; nothing else defines the shape of a cross-boundary call.

| File | What it defines |
|---|---|
| [`openapi/erp-commerce-v1.yaml`](openapi/erp-commerce-v1.yaml) | Synchronous surface — catalogue delta feeds, bulk price resolution, availability, credit, order intake |
| [`asyncapi/erp-events-v1.yaml`](asyncapi/erp-events-v1.yaml) | Events published by Business Central and distributed over Service Bus |
| [`src/index.ts`](src/index.ts) | Invariants a schema cannot express — batch caps, staleness budgets, the guard on transacting from a degraded value |
| [`scripts/validate.mjs`](scripts/validate.mjs) | The gate. Asserts the structural rules the ADRs depend on |

## How the three repositories stay in step

Contracts are a **released artefact**, not a shared folder. Tagging `contracts-v<semver>` publishes both specs to a GitHub release. `commerce-integration` and `commerce-connector-bc` pin a tag and validate against it in their own pipelines.

The effect is that a breaking change fails the pipeline of the repository that broke it, rather than the storefront on a Monday morning.

## The gate

`pnpm validate` asserts more than "the YAML parses". It enforces the decisions that a well-meaning change silently reverses:

- Bulk operations cap at 100 lines and have no single-line variant — the shape that prevents N+1 against the ERP
- Catalogue feeds page by cursor; an `offset`, `skip` or `page` parameter is rejected outright
- Read-through responses compose the provenance `Envelope`, so a caller cannot mistake a fallback for a live value
- The order path keeps its required `Idempotency-Key` and its `202`/`received` distinction
- Projected stock stays a band; an exact quantity on a projected surface or a stock event is rejected

Each rule names the ADR it protects. A change that needs to break one changes the ADR first.

## Changing a contract

1. Edit the spec.
2. `pnpm validate` — if it fails on an invariant, decide whether the invariant or the change is wrong. Do not weaken a rule to make a change pass.
3. `pnpm generate` — regenerate types. CI fails on drift between spec and generated output.
4. Version by impact: additive is a minor, anything a consumer must react to is a major.
5. Raise the pin downstream in the same working session. A published breaking change with unpinned consumers is an outage waiting for traffic.

## Design notes

Decisions behind these shapes are recorded in [`docs/adr/`](../../docs/adr/) — the read-through versus projection split (0002), catalogue scale (0003), degradation (0004), and single-writer idempotency (0005). The specs reference them by number so a reader of the contract can find out why a field exists.
