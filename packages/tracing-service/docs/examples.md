# Tracing Service Examples

The service implements the tracing component contract and resolves a connector from the factory.

## Construct the service

```typescript
import { TracingConnectorFactory } from '@twin.org/tracing-models';
import { EntityStorageTracingConnector } from '@twin.org/tracing-connector-entity-storage';
import { TracingService } from '@twin.org/tracing-service';

TracingConnectorFactory.register('tracing', () => new EntityStorageTracingConnector());

const service = new TracingService();
```

## Record and query spans

```typescript
import { SpanKind, SpanStatus } from '@twin.org/tracing-models';

const span = await service.startSpan('handle-request', { kind: SpanKind.Server });

await service.endSpan(span, SpanStatus.Ok);

const spans = await service.query(span.context.traceId);

const trace = await service.getTrace(span.context.traceId);
```

## Register the REST routes

```typescript
import { generateRestRoutesTracing, tagsTracing } from '@twin.org/tracing-service';

const routes = generateRestRoutesTracing('tracing', 'tracing');
```
