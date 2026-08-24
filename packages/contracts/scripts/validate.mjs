/**
 * Contract gate.
 *
 * Runs in this repository's CI and, via the published spec, in the CI of every repository
 * that pins this contract. It asserts the structural invariants the ADRs depend on — the
 * ones a breaking change silently violates and a schema linter does not notice.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const openapi = parse(readFileSync(resolve(here, '../openapi/erp-commerce-v1.yaml'), 'utf8'));
const asyncapi = parse(readFileSync(resolve(here, '../asyncapi/erp-events-v1.yaml'), 'utf8'));

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const collectRefs = (node, found = new Set()) => {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, found));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') found.add(value);
      else collectRefs(value, found);
    }
  }
  return found;
};

// Every $ref resolves. A dangling ref generates types that compile and requests that 404.
for (const [name, doc] of [['openapi', openapi], ['asyncapi', asyncapi]]) {
  for (const ref of collectRefs(doc)) {
    const path = ref.replace(/^#\//, '').split('/');
    let node = doc;
    for (const segment of path) node = node?.[segment];
    check(node !== undefined, `${name}: dangling $ref ${ref}`);
  }
}

// ADR 0003 — bulk read-through operations are capped, and no single-line variant exists.
for (const path of ['/pricing/resolve', '/availability/check']) {
  const schemaRef = openapi.paths[path]?.post?.requestBody?.content?.['application/json']?.schema?.$ref;
  check(Boolean(schemaRef), `${path}: request body schema missing`);
  const schema = openapi.components.schemas[schemaRef?.split('/').pop()];
  check(schema?.properties?.lines?.maxItems === 100, `${path}: lines must cap at 100 (ADR 0003)`);
  check(schema?.properties?.lines?.minItems === 1, `${path}: lines must require at least one entry`);
}

// ADR 0003 — catalogue feeds page by cursor. An offset parameter reintroduces deep paging.
for (const path of ['/catalogue/items', '/catalogue/prices', '/catalogue/reconciliation']) {
  const params = (openapi.paths[path]?.get?.parameters ?? []).map((p) => p.name);
  check(params.includes('cursor'), `${path}: must expose a cursor parameter (ADR 0003)`);
  for (const banned of ['skip', '$skip', 'offset', 'page']) {
    check(!params.includes(banned), `${path}: offset-style paging parameter "${banned}" is forbidden (ADR 0003)`);
  }
  const pageSize = (openapi.paths[path]?.get?.parameters ?? []).find((p) => p.name === 'pageSize');
  check((pageSize?.schema?.maximum ?? Infinity) <= 1000, `${path}: pageSize must cap at 1000 (ADR 0003)`);
}

// ADR 0004 — every read-through response carries provenance.
for (const schemaName of ['PriceResponse', 'AvailabilityResponse', 'CreditStandingEnvelope']) {
  const schema = openapi.components.schemas[schemaName];
  const composed = JSON.stringify(schema?.allOf ?? []);
  check(composed.includes('#/components/schemas/Envelope'),
    `${schemaName}: must compose Envelope so callers can see source/asOf/degraded (ADR 0004)`);
}

// ADR 0005 — the write path is idempotent and asynchronous.
const orderParams = (openapi.paths['/orders']?.post?.parameters ?? []);
const idempotency = orderParams.find((p) => p.name === 'Idempotency-Key');
check(idempotency?.required === true, '/orders: Idempotency-Key must be a required header (ADR 0005)');
check(Boolean(openapi.paths['/orders']?.post?.responses?.['202']),
  '/orders: must return 202 — order creation is asynchronous (ADR 0005)');
check(openapi.components.schemas.OrderAccepted?.properties?.status?.enum?.includes('received'),
  '/orders: accepted status must distinguish "received" from "created" (ADR 0005)');

// ADR 0002 — projected stock is a band, never a quantity.
check(openapi.components.schemas.StockBand?.enum?.length > 0, 'StockBand enum missing (ADR 0002)');
check(!('availableQuantity' in (openapi.components.schemas.Item?.properties ?? {})),
  'Item: must not expose an exact quantity on a projected surface (ADR 0002)');

const stockEvent = asyncapi.components.messages.StockChanged?.payload?.allOf?.at(-1)?.properties ?? {};
check('band' in stockEvent, 'StockChanged: must publish a band (ADR 0002)');
check(!('quantity' in stockEvent), 'StockChanged: must not publish an exact quantity (ADR 0002)');

// Events must be idempotently consumable.
const envelope = asyncapi.components.schemas.EventEnvelope?.required ?? [];
for (const field of ['eventId', 'occurredAt', 'correlationId']) {
  check(envelope.includes(field), `EventEnvelope: ${field} is required for idempotent consumption`);
}

if (failures.length > 0) {
  console.error(`Contract validation failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Contract validation passed.');
console.log(`  openapi  ${openapi.info.version}  ${Object.keys(openapi.paths).length} paths, ${Object.keys(openapi.components.schemas).length} schemas`);
console.log(`  asyncapi ${asyncapi.info.version}  ${Object.keys(asyncapi.channels).length} channels`);
