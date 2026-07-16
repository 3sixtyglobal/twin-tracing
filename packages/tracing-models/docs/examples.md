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
