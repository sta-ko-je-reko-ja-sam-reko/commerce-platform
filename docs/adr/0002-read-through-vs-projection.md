# ADR 0002 — Read-through versus projected read model, per flow

- Status: accepted
- Date: 2026-08-24

## Context

Every commerce integration with an ERP resolves the same tension. Reading live from the ERP is always correct and puts the ERP in the request path of the storefront. Projecting into a local store is fast and drifts. Choosing one globally is the mistake: correctness matters at checkout and is irrelevant on a category listing, while latency matters on a listing and is tolerable at checkout.

## Decision

Choose per flow, not per system. Every flow is classified as **projected** or **read-through**, and the classification is part of the contract.

| Flow | Mode | Staleness budget |
|---|---|---|
| Items, attributes, media, category assignment | Projected | 15 min, nightly full reconcile |
| Category tree | Projected | 60 min |
| List prices, price groups, campaign prices | Projected | 15 min |
| Assortment / entitlement per customer group | Projected | 60 min |
| Stock indicator on listings and search results | Projected, banded | 15 min, never an exact number |
| Customer-specific and contract price | Read-through | 60 s cache, cart and authenticated detail page only |
| Availability to promise, exact quantity and date | Read-through | No cache at checkout; 30 s at cart |
| Credit limit and blocked status | Read-through | No cache, hard gate at checkout |
| Order and quote creation | Asynchronous write | Not applicable |
| Order status, shipment, invoice, statement | Projected | 5 min |
| Customer and ship-to master | Projected | 15 min, platform never writes master |

## Rules that follow

- **Public pages never touch Business Central.** Anonymous browse, search, category and product detail are served entirely from the projection. An unauthenticated request must never produce an ERP call, or a crawler becomes a load test.
- **Stock on a listing is a band, not a number.** `in_stock`, `low`, `out_of_stock` against a configured threshold. An exact quantity on a cached listing is a promise the system cannot keep; a band stays true for longer and sets correct expectations.
- **Exactness is bought where it is paid for.** Customer price, exact availability and credit are resolved live at cart and checkout, where request volume is orders of magnitude lower than browse and a hundred milliseconds is affordable.
- **Staleness budgets are written down and asserted.** Each projected flow carries the budget above in its contract, and the projection emits its own lag as a metric. Exceeding budget is an alert, not a discovery.

## Consequences

- Two sources of truth exist for price by design: a projected list price for display and a live customer price for transacting. The storefront must label which one it is showing, and must never show a projected price as the price the customer will pay.
- The projection needs a reconciliation path, not just an event stream. Events are lossy over a long enough window; a nightly full pass is what makes the projection trustworthy. See ADR 0003.
- Business Central availability directly gates checkout. Its latency and its uptime become a checkout dependency, which is why ADR 0004 defines what happens when it is not there.
