/**
 * Hand-written invariants that the schema languages cannot express.
 *
 * The OpenAPI and AsyncAPI documents in this package are the contract. This module
 * carries only the constants and guards that both sides must agree on and that a
 * schema cannot enforce — batch caps, staleness budgets, and the shape of a degraded
 * response. Generated types live in ./generated and are produced by `pnpm generate`.
 */

/** Maximum lines accepted by a single bulk read-through call (ADR 0003). */
export const BULK_LINE_CAP = 100;

/** Maximum rows returned by a single catalogue delta page (ADR 0003). */
export const CATALOGUE_PAGE_CAP = 1000;

/**
 * Staleness budgets in seconds, per projected flow (ADR 0002).
 *
 * A projection that exceeds its budget must report itself degraded rather than serving
 * silently stale data. These values are asserted by the projection's own lag metric.
 */
export const STALENESS_BUDGET_SECONDS = {
  catalogueItems: 15 * 60,
  categoryTree: 60 * 60,
  listPrices: 15 * 60,
  assortment: 60 * 60,
  stockBand: 15 * 60,
  orderStatus: 5 * 60,
  customerMaster: 15 * 60,
} as const;

export type ProjectedFlow = keyof typeof STALENESS_BUDGET_SECONDS;

/** Provenance carried by every read-through response (ADR 0004). */
export interface Envelope {
  source: 'live' | 'cached';
  asOf: string;
  degraded: boolean;
}

/** True when a projected value has outlived its budget and must be labelled stale. */
export function isStale(flow: ProjectedFlow, asOf: Date, now: Date = new Date()): boolean {
  const ageSeconds = (now.getTime() - asOf.getTime()) / 1000;
  return ageSeconds > STALENESS_BUDGET_SECONDS[flow];
}

/**
 * Guard for the one rule that outranks every other in this system: a value the platform
 * could not verify is never presented as one it did. Callers must branch on this before
 * showing a price or granting credit.
 */
export function mustNotTransactOn(envelope: Envelope): boolean {
  return envelope.degraded || envelope.source !== 'live';
}
