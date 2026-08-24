## What changed

<!-- One paragraph. What this does, not how. -->

## Contract impact

- [ ] No change to `packages/contracts`
- [ ] Additive change (new optional field, new endpoint) — no consumer action needed
- [ ] **Breaking change** — the downstream pin must be raised in `commerce-integration` and `commerce-connector-bc`, and the migration is described below

## Checks

- [ ] ADRs still describe the system after this change; a new decision has its own ADR
- [ ] Read-through paths carry the provenance envelope (ADR 0004)
- [ ] No offset paging, no single-line variant of a bulk operation (ADR 0003)
- [ ] Writes to Business Central go through `order-gateway` with an idempotency key (ADR 0005)
- [ ] No customer names, customer data or client-specific business rules
