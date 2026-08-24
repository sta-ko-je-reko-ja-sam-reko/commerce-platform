---
name: contract-change
description: Change the ERP contract in packages/contracts safely - edit the spec, keep the invariant gate honest, regenerate types, version by impact, publish the release and raise the pins in commerce-integration and commerce-connector-bc. Use whenever a field, endpoint, cap or event shape changes.
---

# Changing the ERP contract

`packages/contracts` is consumed by two other repositories that pin a release tag. A change here that is not versioned and re-pinned is an outage waiting for traffic.

## Steps

1. **Edit the spec.** `openapi/erp-commerce-v1.yaml` for synchronous surface, `asyncapi/erp-events-v1.yaml` for events.

2. **Run the gate.**
   ```bash
   pnpm --filter @commerce/contracts validate
   ```
   If it fails on an invariant, stop and decide which is wrong — the invariant or the change. **Do not weaken a rule to make a change pass.** Each rule names the ADR it protects; breaking one means changing that ADR first, in the same pull request.

3. **Add a rule if the change introduces a new invariant.** The gate is the only thing standing between a well-meaning edit and a silently reversed decision. A new cap, a new required header, a new "never expose this" — encode it.

4. **Regenerate types.**
   ```bash
   pnpm --filter @commerce/contracts generate
   ```
   CI fails on drift between spec and generated output, so the regenerated file must be committed.

5. **Version by impact.**
   - Additive — new optional field, new endpoint — is a **minor**.
   - Anything a consumer must react to is a **major**.
   Update `version` in both `info.version` and `packages/contracts/package.json`.

6. **Publish.**
   ```bash
   git tag -a contracts-v<X.Y.Z> -m "Contract release <X.Y.Z>"
   git push origin contracts-v<X.Y.Z>
   ```
   The `publish-contracts` workflow attaches both specs to the release.

7. **Raise the pins in the same session.** In `commerce-integration`, update `CONTRACT_PIN` and run `npm run contract:check`. In `commerce-connector-bc`, confirm the API surface still matches.

## What the gate already enforces

Cursor paging with no `offset`/`skip`/`page` parameter · bulk operations capped at 100 with no single-line variant · provenance envelope composed into every read-through response · required `Idempotency-Key` and the `202`/`received` distinction on the write path · stock as a band, never a quantity, on projected surfaces and stock events.

## Verify the gate can still fail

After adding a rule, break the spec deliberately and confirm the gate reports it, then restore. A validator that cannot fail is not a gate.
