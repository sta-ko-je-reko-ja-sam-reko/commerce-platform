# ADR 0001 — Repository split and boundaries

- Status: accepted
- Date: 2026-08-24

## Context

The platform spans three technology stacks with different build tooling, artefacts and release cadences: a TypeScript web estate, an Azure integration estate, and an AL extension for Business Central. A single repository cannot hold all three without one toolchain dictating the others; a repository per service fragments the change that happens most often.

## Decision

Three repositories.

| Repository | Scope |
|---|---|
| `commerce-platform` | Storefront, BFF, domain services, contracts, IaC for the web estate, architecture documentation |
| `commerce-integration` | API Management policies, Functions, Service Bus topology, canonical mappings, IaC for the integration estate |
| `commerce-connector-bc` | The AL extension inside Business Central |

The web estate is a **monorepo**, not one repository per service.

## Rationale

The highest-frequency change in this system is a contract change that touches the BFF, two or three domain services and the storefront in one edit. In a repository-per-service layout that is four pull requests in a forced order, and the practical consequence is that contracts stop being refactored. A monorepo makes it one atomic change with one CI run.

The AL extension is separate because it shares nothing: a different compiler, a different artefact (`.app`), version stamping tied to the monthly Business Central release train, branch-per-BC-version, and a different review population. Forcing it into the monorepo would make every web pull request run an AL build.

The integration estate is separate because it is the layer whose whole purpose is to be independently deployable. It fronts Business Central for consumers other than the storefront, and it must be able to release without a storefront release.

## Consequences

- Contracts are a published artefact, not a shared folder. `packages/contracts` releases a semantic version; the other two repositories pin it and validate against it in their own pipelines. Drift fails a build rather than a checkout.
- A cross-repository change needs coordination. This is the accepted cost, and it is bounded: only contract changes cross the boundary.
- Splitting a service out of the monorepo later is a supported move. The trigger is a service needing an independent release train or an independent on-call rotation — not code size, and not a preference for smaller repositories.

## Alternatives rejected

**Single repository for all three.** Rejected: AL and Node share no build, and the AL app needs branch-per-BC-version, which would fork the web estate's history for reasons unrelated to it.

**One repository per service.** Rejected: at this team size the coordination cost of a contract change exceeds the isolation benefit, and the isolation benefit is largely available inside a monorepo through path-filtered CI and code owners.
