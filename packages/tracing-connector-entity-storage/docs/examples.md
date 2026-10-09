# Tracing Connector Entity Storage Examples

Register the entity schema and a storage connector, then start, end, and query spans.

## Setup

```typescript
import { MemoryEntityStorageConnector } from '@3sixty/entity-storage-connector-memory';
import { EntityStorageConnectorFactory } from '@3sixty/entity-storage-models';
import { nameof } from '@3sixty/nameof';
import {
  EntityStorageTracingConnector,
  SpanEntity,
  initSchema
} from '@3sixty/tracing-connector-entity-storage';

initSchema();

EntityStorageConnectorFactory.register(
  'span',
  () =>
    new MemoryEntityStorageConnector<SpanEntity>({
      entitySchema: nameof<SpanEntity>(),
      config: { storageKey: 'span' }
    })
);

const connector = new EntityStorageTracingConnector();
```

## Start and end a span

```typescript
import { SpanKind, SpanStatus } from '@3sixty/tracing-models';

const span = await connector.startSpan('process-order', { kind: SpanKind.Server });

span.attributes = { orderId: 'ord-1' };
span.events = [{ name: 'validated', ts: Date.now() }];

await connector.endSpan(span, SpanStatus.Ok);
```

## Query spans by trace

```typescript
import { ComparisonOperator, LogicalOperator } from '@3sixty/entity';

const result = await connector.query({
  logicalOperator: LogicalOperator.And,
  conditions: [
    {
      property: 'traceId',
      comparison: ComparisonOperator.Equals,
      value: span.context.traceId
    }
  ]
});
```

## Retention

The connector trims the span table on a timer while it is running, so `start` must be called for
retention to take effect and `stop` clears the timer. Four independent passes run each tick, all
deleting the oldest matches in pages of `retentionBatchSize`: age-based and count-based retention
only ever remove spans that have already ended, so a span still in progress is never deleted by
either; a separate, more generous age cutoff (`retainOpenForMs`) removes an open span presumed
abandoned - its `endSpan` is realistically never coming; and a count-based safety valve
(`maxOpenEntries`) bounds worst-case growth from spans that never end well before
`retainOpenForMs` would.

```typescript
const connector = new EntityStorageTracingConnector({
  config: {
    retainForMs: 172800000, // remove ended spans that started more than 2 days ago, 0 disables
    retainOpenForMs: 345600000, // remove open spans older than 4 days, presumed abandoned, 0 disables
    maxEntries: 10000, // keep at most this many ended spans, 0 disables
    maxOpenEntries: 1000, // keep at most this many open spans, oldest-first, 0 disables
    retentionIntervalMs: 300000, // how often the cleanup runs, 0 disables
    retentionBatchSize: 1000 // spans deleted per removeBatch call
  }
});

await connector.start();
```
