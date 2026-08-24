# Architecture decision records

One file per decision, numbered, immutable once accepted. A decision that changes gets a new record that supersedes the old one — records are not edited to match what the code became.

| # | Decision | Status |
|---|---|---|
| [0001](0001-repository-split.md) | Repository split and boundaries | accepted |
| [0002](0002-read-through-vs-projection.md) | Read-through versus projected read model, per flow | accepted |
| [0003](0003-catalogue-scale.md) | Catalogue scale: tens of thousands of items across dozens of categories | accepted |
| [0004](0004-degradation-modes.md) | Degradation modes | accepted |
| [0005](0005-single-writer-and-idempotency.md) | Single writer into the ERP, and idempotency | accepted |

## Why these five first

They are the decisions that are cheap now and expensive later. Each one, if deferred, gets made implicitly by the first person who writes code in that area — and then costs a rewrite to change:

- **0002 and 0003** determine whether the storefront can serve a catalogue of this size at all. A system that queries the ERP on a listing page cannot be incrementally fixed into one that does not.
- **0004** has to exist before the first feature, because degradation is a property of every code path, not a component that can be added.
- **0005** decides the shape of the order API. A synchronous order number promised in the first UI screen is a rewrite to walk back.
- **0001** is the cheapest to revisit and is recorded mainly so the trigger for revisiting it is written down.

Each record states what was rejected and why. That section is the useful one when the question comes back.
