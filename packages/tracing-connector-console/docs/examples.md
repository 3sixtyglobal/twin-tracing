# Tracing Connector Console Examples

This connector writes each completed span to the console. It is meant for development and
debugging. It is a pure sink and does not implement `query()`.

## Basic setup

```typescript
import { ConsoleTracingConnector } from '@twin.org/tracing-connector-console';
import { TracingConnectorFactory } from '@twin.org/tracing-models';

TracingConnectorFactory.register('console', () => new ConsoleTracingConnector());
```

Each span produces one line when it ends, with the kind in blue, the name in cyan and the duration in magenta.

```text
SPAN [2026-08-25T09:14:22.318Z] internal notarization/create (42ms) {"notarization.mode":"dynamic"}
```

`startSpan` writes nothing. `recordSpan` writes the span as it stands, so a span which has not
ended yet is written without a duration.

## Errors

A span which ends with an error status is written with `console.error`,
and its `exception.message` attribute is appended in red, so failures stand out and can be
filtered by stream.

## Showing the ids

The trace and span ids are omitted by default to keep the line readable. Turn them on when
correlating what you see locally against a backend; a child span appends its parent span id,
so the output reads `traceId:spanId:parentSpanId`.

```typescript
new ConsoleTracingConnector({ config: { includeIds: true } });
```

## Narrowing what is shown

An instrumented node produces a lot of spans. `kinds` restricts the output to the ones you care
about, for example only the inbound requests.

```typescript
import { SpanKind } from '@twin.org/tracing-models';

new ConsoleTracingConnector({ config: { kinds: [SpanKind.Server] } });
```

## Alongside another connector

Register both connectors and put a `MultiTracingConnector` in front to watch spans locally while
still exporting them. The span context is minted once and replicated, so the ids match on both
sides.

```typescript
import { MultiTracingConnector, TracingConnectorFactory } from '@twin.org/tracing-models';

TracingConnectorFactory.register('console', () => new ConsoleTracingConnector());
TracingConnectorFactory.register('opentelemetry', () => otelConnector);
TracingConnectorFactory.register(
  'tracing',
  () =>
    new MultiTracingConnector({
      tracingConnectorTypes: ['console', 'opentelemetry']
    })
);
```

## Production use

This connector is for development.
