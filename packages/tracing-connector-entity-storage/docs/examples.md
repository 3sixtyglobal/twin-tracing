# Tracing Connector Entity Storage Examples

Register the entity schema and a storage connector, then start, end, and query spans.

## Setup

```typescript
import { MemoryEntityStorageConnector } from '@twin.org/entity-storage-connector-memory';
import { EntityStorageConnectorFactory } from '@twin.org/entity-storage-models';
import { nameof } from '@twin.org/nameof';
import {
  EntityStorageTracingConnector,
  SpanEntity,
  initSchema
} from '@twin.org/tracing-connector-entity-storage';

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
import { SpanKind, SpanStatus } from '@twin.org/tracing-models';

const span = await connector.startSpan('process-order', { kind: SpanKind.Server });

span.attributes = { orderId: 'ord-1' };
span.events = [{ name: 'validated', ts: Date.now() }];

await connector.endSpan(span, SpanStatus.Ok);
```

## Query spans by trace

```typescript
import { ComparisonOperator, LogicalOperator } from '@twin.org/entity';

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
retention to take effect and `stop` clears the timer. Age-based cleanup runs first, then
count-based, and both delete the oldest spans in pages of `retentionBatchSize`.

```typescript
const connector = new EntityStorageTracingConnector({
  config: {
    retainForMs: 172800000, // remove spans that started more than 2 days ago, 0 disables
    maxEntries: 10000, // keep at most this many spans, 0 disables
    retentionIntervalMs: 300000, // how often the cleanup runs, 0 disables
    retentionBatchSize: 1000 // spans deleted per removeBatch call
  }
});

await connector.start();
```
