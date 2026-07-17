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
