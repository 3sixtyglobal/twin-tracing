# Tracing Service Examples

The service implements the tracing component contract and resolves a connector from the factory.

## Construct the service

```typescript
import { TracingConnectorFactory } from '@3sixty/tracing-models';
import { EntityStorageTracingConnector } from '@3sixty/tracing-connector-entity-storage';
import { TracingService } from '@3sixty/tracing-service';

TracingConnectorFactory.register('tracing', () => new EntityStorageTracingConnector());

const service = new TracingService();
```

## Record and query spans

```typescript
import { SpanKind, SpanStatus } from '@3sixty/tracing-models';

const span = await service.startSpan('handle-request', { kind: SpanKind.Server });

await service.endSpan(span, SpanStatus.Ok);

const spans = await service.query(span.context.traceId);

const trace = await service.getTrace(span.context.traceId);
```

## Register the REST routes

```typescript
import { generateRestRoutesTracing, tagsTracing } from '@3sixty/tracing-service';

const routes = generateRestRoutesTracing('tracing', 'tracing');
```
