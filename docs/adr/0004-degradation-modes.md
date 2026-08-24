# ADR 0004 — Degradation modes

- Status: accepted
- Date: 2026-08-24

## Context

Business Central is unavailable on a predictable schedule — monthly platform updates, environment copies, extension deployments — and unpredictably besides. ADR 0002 puts it directly in the checkout path for price, availability and credit. If the behaviour under that outage is not designed, it is discovered, and what gets discovered is a stack trace on a product page.

## Decision

Degradation is a specification, not an incident response. Each capability has a defined behaviour when its dependency is gone, and each is covered by a test that runs the dependency-down path.

| Capability | Dependency present | Dependency down |
|---|---|---|
| Browse, search, category listing | Projection | **Unchanged.** No ERP dependency by design (ADR 0003). |
| Product detail, list price | Projection | **Unchanged**, with an explicit "indicative price" label. |
| Customer-specific price | Read-through | Show list price, labelled *price on request*; never silently substitute. |
| Stock band on listing | Projection | **Unchanged**, band only. |
| Exact availability at cart | Read-through | Show last known band, mark the line as *to be confirmed*. |
| Credit check | Read-through | **Block checkout.** Never assume credit. |
| Add to cart, edit quote | Local | **Unchanged.** Cart and quote are platform-owned state. |
| Checkout submit | Write to ERP | Accept into the outbox and confirm as *received, awaiting confirmation* — never as *order placed*. |
| Order history, invoices | Projection | **Unchanged**, with a staleness notice past budget. |

## Principles

- **Read paths degrade; write paths queue; money and credit fail closed.** A customer may always browse. A customer may always be told the truth about what is uncertain. A customer is never granted credit or a price the system could not verify.
- **Degradation is visible.** Every degraded value carries a label in the API response, not only in the UI, so the state is observable and testable rather than a rendering detail.
- **Never confirm what was not committed.** An order accepted into the outbox is acknowledged as received. The confirmation email is sent when the ERP confirms, not when the queue accepts. The distinction is the difference between a delayed order and an order that silently never existed.
- **Circuit breakers open early and recover slowly.** A breaker that opens after one failure and closes after one success oscillates and amplifies the outage. Open on a failure rate over a window; recover through a half-open probe.

## Consequences

- Every read-through client returns a result envelope carrying `source` (`live` or `cached`), `asOf`, and a `degraded` flag. This is in the contract, not an implementation detail, so consumers cannot ignore it by accident.
- The test suite needs a fault-injection mode for the connector. Dependency-down scenarios are part of the definition of done for each flow, not a separate resilience initiative.
- Support and operations need a single page showing which capabilities are currently degraded. The flags above are its data source.
