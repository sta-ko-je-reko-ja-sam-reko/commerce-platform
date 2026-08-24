---
name: new-adr
description: Add an architecture decision record to docs/adr. Use when a decision is being made that would be expensive to reverse, or when an existing record no longer matches reality and must be superseded rather than edited.
---

# Adding an architecture decision record

## When a decision deserves a record

It is cheap to make now and expensive to reverse later; or it will otherwise be made implicitly by whoever writes code in that area first. If neither is true, it is not an ADR — put it in a design note under `docs/`.

## Rules

- **Records are immutable once accepted.** A decision that changes gets a **new** record that supersedes the old one. Never edit an accepted record to match what the code became — the history of why is the value.
- **Sharpening is allowed.** Making a record more precise about what was already decided is an edit; changing what was decided is a new record.
- **State what was rejected and why.** That section is the useful one when the question comes back, which it will.

## Template

```markdown
# ADR NNNN — <decision>

- Status: accepted
- Date: YYYY-MM-DD

## Context
What forces this decision, and what breaks if it is deferred.

## Decision
What was decided. Specific enough to implement from — a predicate, a cap, a shape,
not "we will be careful about paging".

## Consequences
What this now costs, what it makes possible, what it forecloses.

## Alternatives rejected
Each with the reason. Especially the ones that look correct.
```

## After writing

1. Add the row to `docs/adr/README.md`.
2. If the decision is enforceable, add a rule to `packages/contracts/scripts/validate.mjs` naming the ADR number. A decision nothing checks is a decision that erodes.
3. Reference it from the affected `CLAUDE.md` rule if it changes how work is done.
