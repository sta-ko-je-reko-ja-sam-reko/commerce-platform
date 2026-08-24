# commerce-platform

Headless commerce platform on a Business Central system of record. TypeScript monorepo: storefront, BFF, domain services, and **the contract** the other two repositories build against.

## Orientation

Read in this order when picking the work up cold:

1. [`docs/implementation-plan.md`](docs/implementation-plan.md) — the master plan across all three repositories
2. [`docs/todo.md`](docs/todo.md) — the next actions, ordered, each with a definition of done
3. [`docs/adr/`](docs/adr/) — the five decisions that govern everything; read 0002 and 0003 before touching catalogue or pricing
4. [`packages/contracts/README.md`](packages/contracts/README.md) — how a contract change is made safely

## Setup on a fresh machine

```bash
corepack enable            # or: npm install -g pnpm@9.12.0
pnpm install
pnpm contracts:validate
pnpm typecheck && pnpm test
```

Node 22+ (`.nvmrc`). The GitHub CLI is needed to publish a contract release.

## Rules that are not style preferences

Each has an ADR, and the validation gate enforces several of them. A change that needs to break one changes the ADR first — it does not weaken the gate to make itself pass.

- **The shop never decides money or stock.** It reads both from Business Central, caches under a written staleness budget, and degrades visibly (ADR 0002, 0004).
- **Public pages never touch Business Central.** Anonymous browse, search and detail are served entirely from the projection. An unauthenticated request producing an ERP call turns a crawler into a load test (ADR 0003).
- **Catalogue paging is a composite keyset predicate**, never `gt` alone and never `ge`. Both fail silently — `gt` skips rows at a page boundary, `ge` stalls the feed forever when a timestamp collision exceeds a page (ADR 0003, and `commerce-integration/docs/catalogue-paging.md`).
- **Bulk operations cap at 100 lines and have no single-line variant.** Offering one guarantees a caller loops over it (ADR 0003).
- **Read-through responses carry the provenance envelope** — `source`, `asOf`, `degraded`. A caller must be able to tell a live value from a fallback (ADR 0004).
- **One writer into the ERP**, always with a caller-generated idempotency key that is stable across retries of the same business action (ADR 0005).
- **No Business Central table, field or enum name appears in a domain service.** Mapping belongs in `commerce-integration`.

## Changing a contract

Use the `contract-change` skill. Never edit a released spec in place without versioning and re-pinning downstream; a published breaking change with unpinned consumers is an outage waiting for traffic.

## Adding a decision

Use the `new-adr` skill. Records are immutable once accepted — a decision that changes gets a new record superseding the old one, rather than being edited to match what the code became.

## This is a public portfolio repository

No customer names, customer data, client-specific business rules, or material from client projects. Everything here must be generic.
