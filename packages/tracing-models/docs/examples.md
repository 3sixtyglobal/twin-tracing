# Tracing Models Examples

Use these examples to register connectors, mint span contexts, and build spans.

## SpanHelper

```typescript
import { SpanHelper, SpanKind, SpanStatus } from '@twin.org/tracing-models';

const root = SpanHelper.startSpan('process-order', {
  kind: SpanKind.Server,
  attributes: { orderId: 'ord-1' }
});

const child = SpanHelper.startSpan('validate-order', {
  kind: SpanKind.Internal,
  parentContext: root.context
});

SpanHelper.endSpan(child, SpanStatus.Ok);
SpanHelper.endSpan(root, SpanStatus.Ok);
```

## SilentTracingConnector

```typescript
import { SilentTracingConnector, SpanStatus } from '@twin.org/tracing-models';

const connector = new SilentTracingConnector();

const span = await connector.startSpan('background-job');

await connector.endSpan(span, SpanStatus.Ok);
```

## TracingConnectorFactory

```typescript
import { SilentTracingConnector, TracingConnectorFactory } from '@twin.org/tracing-models';

TracingConnectorFactory.register('silent', () => new SilentTracingConnector());

const connector = TracingConnectorFactory.get('silent');
```

## TracingHelper

`withSpan` runs an operation inside a span and ends it however the operation finishes. The parent
is taken from the span currently in scope, so nested calls form a tree.

```typescript
import { SpanKind, TracingHelper } from '@twin.org/tracing-models';

await TracingHelper.withSpan(
  tracingComponent,
  'OrderService/create',
  { kind: SpanKind.Internal },
  async span => {
    span?.attributes && (span.attributes['entity.type'] = 'Order');

    // Any span started in here becomes a child of the one above.
    return TracingHelper.withSpan(tracingComponent, 'OrderService/validate', undefined, async () =>
      validate(order)
    );
  }
);
```

When the callback throws, the span is ended with `SpanStatus.Error`, the message is recorded as an
`exception.message` attribute, and the error is rethrown unchanged.

When no tracing component is supplied the callback runs directly and no span is created.

To reattach a trace after it has crossed a process or thread boundary, supply the parent
explicitly. An explicit parent always wins over the one in scope.

```typescript
await TracingHelper.withSpan(tracingComponent, 'Worker/process', { parentContext }, async () =>
  handler(payload)
);
```

## TraceparentHelper

Converts between a span context and the W3C `traceparent` header, which is how a trace is carried
between services.

```typescript
import { TraceparentHelper, TracingHelper } from '@twin.org/tracing-models';

// Outbound: send the span in scope to the next service.
const current = await TracingHelper.getCurrentSpanContext();
const headers = current ? { traceparent: TraceparentHelper.format(current) } : {};

// Inbound: continue the caller's trace.
const parentContext = TraceparentHelper.parse(request.headers.traceparent);
```

`parse` returns `undefined` for a missing or malformed header rather than throwing, so a bad value
from a remote caller starts a new trace instead of failing the request.

## Reading the trace from the context

The parts of the current span are held as context ids.

```typescript
import { ContextIdStore } from '@twin.org/context';
import { TracingContextIdKeys } from '@twin.org/tracing-models';

const contextIds = await ContextIdStore.getContextIds();

const traceId = contextIds?.[TracingContextIdKeys.TraceId];
```
