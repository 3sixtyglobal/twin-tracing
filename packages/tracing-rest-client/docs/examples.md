# Tracing Rest Client Examples

The client implements the tracing component contract against a remote tracing service.

## Construct the client

```typescript
import { TracingRestClient } from '@3sixty/tracing-rest-client';

const client = new TracingRestClient({ endpoint: 'https://localhost' });
```

## Record and query spans

```typescript
import { SpanKind, SpanStatus } from '@3sixty/tracing-models';

const span = await client.startSpan('handle-request', { kind: SpanKind.Server });

await client.endSpan(span, SpanStatus.Ok);

const spans = await client.query(span.context.traceId);

const trace = await client.getTrace(span.context.traceId);
```
