# ADR 0003 — Catalogue scale: tens of thousands of items across dozens of categories

- Status: accepted
- Date: 2026-08-24

## Context

The catalogue is sized in the tens of thousands of sellable items, spread across dozens of categories, with variants multiplying the item count and every item carrying attributes, media references and per-customer-group pricing. Browse and search are the dominant traffic. Business Central is a transactional ERP: it is the correct system of record for this data and the wrong system to serve a faceted category listing from.

Two failure modes have to be designed out before any code exists, because both are expensive to retrofit:

1. **Deep paging.** Synchronising a large catalogue with `$skip`/`$top` degrades quadratically — the ERP re-scans and discards a growing prefix on every page. It works in a demo with two hundred items and collapses at forty thousand.
2. **N+1 at the line level.** One price call and one availability call per basket line turns a twenty-line quote into forty ERP round trips.

## Decision

### The projection is the query engine

Business Central is never queried by a browse request. The catalogue lives in two local stores:

- **Postgres** — the durable projection and the reconciliation source. Full item, variant, attribute, category, media-reference and list-price rows.
- **A search index** (OpenSearch or equivalent) — the query surface for listing, search, faceting and sorting. Rebuildable from Postgres at any time, and therefore never authoritative.

A category listing, a search, a facet count and a product detail page are all served from the index and the projection. No ERP call participates.

### Synchronisation is watermark-based, never offset-based

Delta pulls order by a monotonic change marker and page forward on a **cursor**, never `$skip`:

```
GET /catalogue/items?changedAfter=<watermark>&afterId=<lastSystemId>&pageSize=1000
```

The connector orders by `(SystemModifiedAt, SystemId)` and the caller passes back the last pair it saw. Page cost stays constant regardless of catalogue size or how far through the sync it is. The composite cursor — timestamp *and* id — is what makes the page boundary safe when many rows share a timestamp, which is exactly what a bulk price update produces.

Page size is capped at 1000 rows. Larger pages do not go faster; they raise the cost of a retry and increase the chance of hitting a request timeout.

### Reconciliation is a first-class job, not a repair script

Events and delta pulls are lossy over a long enough window: a hard delete, a failed publish, a restored backup. A nightly reconcile compares a per-item content hash between the projection and the ERP over the full catalogue, in cursor-paged batches, and repairs the difference. It reports the count of corrections as a metric. A rising correction count is the early signal that the event path is broken — long before a customer sees a wrong price.

### Bulk by default, with a hard cap

Every read-through operation is defined over a **collection**:

- `POST /pricing/resolve` — up to 100 lines per call
- `POST /availability/check` — up to 100 lines per call

There is no single-line variant. Offering one guarantees somebody loops over it. A basket larger than the cap is chunked by the caller, and the chunks run concurrently against the cap on inflight ERP requests.

### Throttling is honoured, not retried blindly

Business Central returns `429` with `Retry-After` under load. Every client of the connector implements exponential backoff with jitter that respects that header, and a circuit breaker that opens rather than queueing unboundedly. Sync jobs run at a bounded concurrency and yield to interactive traffic — a catalogue reindex must never be the reason a checkout availability call is throttled.

### The category tree is small, and modelled as such

Dozens of categories is a small tree. It is projected whole, held as a materialized path (`/building/insulation/mineral-wool`), and cached in the index alongside each product document. Facet counts come from the search engine's aggregations, computed at query time over the filtered set — never assembled by counting rows per category in application code.

### Media never passes through the ERP

Business Central holds media **references** — a key or URL — not bytes. Images are served from object storage behind the CDN. Pulling image blobs through the ERP API is the single fastest way to exhaust its throughput budget.

## Consequences

- Adding a searchable attribute means a projection migration and a reindex, not an ERP change. Reindexing is a routine, scripted operation and must stay online: index to a new alias target, then swap.
- The projection can be rebuilt from zero. The bootstrap path is the same cursor-paged pull as the delta path with an empty watermark, so it is exercised continuously rather than only in a disaster.
- The search index is disposable. Nothing may be written only to the index; if it cannot be rebuilt from Postgres, it is a bug.
- The connector must expose the change marker and support the composite cursor. This is a hard requirement on `commerce-connector-bc`, not an optimisation, and it is why the catalogue API is a query object over an indexed key rather than a plain list page.

## Alternatives rejected

**Serve listings live from the ERP with aggressive HTTP caching.** Rejected: facets and sorting across tens of thousands of rows are not a cacheable request shape, cold cache after every publish is a load spike, and it puts the ERP in the path of anonymous crawler traffic.

**Full nightly catalogue reload instead of deltas.** Rejected on freshness: a price change made in the morning would not reach the storefront until the next day. Kept, in cursor-paged form, as the reconciliation pass.

**Search index as the only store.** Rejected: search engines are not durable systems of record for a projection, and rebuilding one requires a source that is not itself the ERP.
