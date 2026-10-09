# Tracing Connector OpenTelemetry Examples

This connector is a pure forwarder. It sends completed spans to an OTLP compatible receiver such
as the OpenTelemetry Collector, Grafana Alloy or Tempo, it does not implement `query()`.

## Basic setup with an OTLP exporter

```typescript
import { OpenTelemetryTracingConnector } from '@3sixty/tracing-connector-opentelemetry';

const connector = new OpenTelemetryTracingConnector({
  config: {
    resourceAttributes: {
      'service.name': 'twin-node',
      'service.namespace': 'twin-nodes-kitsune',
      'deployment.environment.name': 'staging'
    },
    exporters: {
      collector: {
        endpoint: 'http://otel-collector:4318/v1/traces'
      }
    }
  }
});

await connector.start();
```

Spans are sent as OTLP over HTTP with a protobuf payload. `endpoint` is required; a missing one is rejected by `start()`.

## Recording spans

Spans are exported when they end, because an OTLP receiver only accepts completed spans.

```typescript
import { SpanKind, SpanStatus } from '@3sixty/tracing-models';

const span = await connector.startSpan('handle-request', { kind: SpanKind.Server });

await connector.endSpan(span, SpanStatus.Ok);
```

## Node and tenant

The active `ContextIdStore` context is read when a span is exported, and its node and tenant are
added as `node` and `tenant` span attributes.

```typescript
await ContextIdStore.run({ [ContextIdKeys.Tenant]: 'tenant-a' }, async () => {
  const span = await connector.startSpan('handle-request');
  await connector.endSpan(span);
});
```

## Shutting down

Always call `stop()` during a graceful shutdown. Shutting the processors down flushes any spans
still buffered by the batch processor, so skipping it loses them.

```typescript
await connector.stop();
```

## Immediate export for local development

The batch processor buffers spans and exports them every five seconds by default. Use the simple
processor to export each span as soon as it ends.

```typescript
exporters: {
  collector: {
        endpoint: 'http://localhost:4318/v1/traces',
    processor: 'simple'
  }
}
```

## Sampling

`sampleRatio` exports a deterministic proportion of traces, decided from the trace id so every
span in a trace shares the same outcome. Spans whose context is already marked as not sampled are
never exported regardless of this value.

```typescript
config: {
  sampleRatio: 0.1,
  exporters: {
    /* ... */
  }
}
```

## Environment variables

Configuration supplied through the options above always wins. Where it is omitted, the standard
OpenTelemetry environment variables still apply:

| Variable                     | Effect                               |
| ---------------------------- | ------------------------------------ |
| `OTEL_SERVICE_NAME`          | Sets `service.name` on the resource. |
| `OTEL_RESOURCE_ATTRIBUTES`   | Adds further resource attributes.    |
| `OTEL_EXPORTER_OTLP_HEADERS` | Adds headers to export requests.     |

## Exporting and persisting together

To keep the tracing API readable while also shipping traces out, register both connectors and put
a `MultiTracingConnector` in front. It mints the span context once and replicates it to both, so
the ids match on either side.

```typescript
import { TracingConnectorFactory, MultiTracingConnector } from '@3sixty/tracing-models';
import { EntityStorageTracingConnector } from '@3sixty/tracing-connector-entity-storage';
import { OpenTelemetryTracingConnector } from '@3sixty/tracing-connector-opentelemetry';

TracingConnectorFactory.register('entity-storage', () => new EntityStorageTracingConnector());
TracingConnectorFactory.register('opentelemetry', () => connector);
TracingConnectorFactory.register(
  'tracing',
  () =>
    new MultiTracingConnector({
      tracingConnectorTypes: ['entity-storage', 'opentelemetry']
    })
);
```
