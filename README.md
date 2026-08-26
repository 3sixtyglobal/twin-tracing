# TWIN Tracing

This repository provides reusable distributed-tracing building blocks for applications and services across the TWIN ecosystem. The packages are designed to work together so teams can model traces and spans consistently, persist them to different destinations, and expose or consume tracing capabilities through service interfaces.

The model interfaces align to OpenTelemetry span concepts: a trace represents the full journey of a request across services, and a span is a timed unit of work within that journey carrying a name, kind, status, attributes, events, links, and a context (`traceId`, `spanId`, `traceFlags`). Together, these components help standardise how causal chains and latency are captured, transported, and persisted, supporting clearer observability and easier integration between services.

## Packages

- [tracing-models](packages/tracing-models/README.md) - Defines shared tracing contracts, span shapes, and connector interfaces used across the repository.
- [tracing-connector-entity-storage](packages/tracing-connector-entity-storage/README.md) - Persists spans to entity storage for durable retention, querying, and downstream processing.
- [tracing-connector-opentelemetry](packages/tracing-connector-opentelemetry/README.md) - Exports spans to an OTLP compatible endpoint using OpenTelemetry for consumption by observability backends.
- [tracing-connector-console](packages/tracing-connector-console/README.md) - Writes completed spans to the console.
- [tracing-service](packages/tracing-service/README.md) - Exposes tracing operations through service routes and API contracts for server-side integration.
- [tracing-rest-client](packages/tracing-rest-client/README.md) - Provides a client for interacting with tracing service endpoints from applications and services.
- [tracing-processors](packages/tracing-processors/README.md) - Traces the HTTP boundary, recording spans for inbound routes and outbound REST requests and carrying the trace between services.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)
