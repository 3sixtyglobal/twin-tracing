# Tracing Processors Examples

These two processors trace the HTTP boundary. Together they join the spans of separate services
into a single trace, via W3C `traceparent` header: the client processor sends the span it
opens, and the route processor on the receiving side continues from it.

## Tracing inbound requests

`TracingRouteProcessor` records a span for each request the server handles. Register it and add it
to the route processor types of the server.

```typescript
import { ComponentFactory } from '@twin.org/core';
import { TracingRouteProcessor } from '@twin.org/tracing-processors';

ComponentFactory.register(
  'tracing-route-processor',
  () => new TracingRouteProcessor({ tracingComponentType: 'tracing' })
);
```

The span is named from the route `operationId`, falling back to its path, and carries `http.method`,
`http.route` and `http.status_code` attributes. A status of 400 or above ends the span with an error
status.

Without a `tracingComponentType` which resolves, the processor does nothing, so it is safe to
register unconditionally.

## Continuing a trace from the caller

When the request arrives with a `traceparent` header, the span becomes a child of the caller's span
and stays in the same trace. A missing or malformed header starts a new trace.

The span ids are written into the request `contextIds`, so anything the handler does through
`TracingHelper.withSpan` nests underneath the request span automatically.

## Excluding paths

Requests to the tracing API itself are skipped by default, otherwise reading spans would create
spans. Supply `excludePaths` to change this.

```typescript
new TracingRouteProcessor({
  tracingComponentType: 'tracing',
  config: { excludePaths: ['/tracing', '/health'] }
});
```

## Tracing outbound requests

`TracingRestClientProcessor` records a span for each request a REST client makes, and sends the
`traceparent` header so the service being called continues the same trace.

```typescript
import { RestClientProcessorFactory } from '@twin.org/api-models';
import { TracingRestClientProcessor } from '@twin.org/tracing-processors';

RestClientProcessorFactory.register(
  'tracing-client-processor',
  () => new TracingRestClientProcessor({ tracingComponentType: 'tracing' })
);
```

Then name it in the configuration of any client which should be traced.

```typescript
const client = new BlobStorageClient({
  endpoint: 'https://example.com',
  processorTypes: ['tracing-client-processor']
});
```

## Avoiding a loop when the tracing client is itself traced

A REST client which reports spans over HTTP must not be traced, or recording a span would make
another request, which would record another span. A client is only traced when it names a processor
type, so leaving `processorTypes` off the tracing client is all that is needed.

## The two ends together

With both processors in place, a request arriving at service A and passed on to service B produces
one trace with a server span in A, a client span beneath it, and a server span in B beneath that.

```text
GET /blob                       (A, server)
└── BlobStorageClient/blob      (A, client)
    └── blobStorageGet          (B, server)
```
