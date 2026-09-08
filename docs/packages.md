# Tracing Packages

## tracing-models

The package provides the shared domain contracts for tracing across this repository, including the span structures and interfaces that connectors and services depend on. It establishes a consistent, OpenTelemetry-aligned foundation so tracing components can interoperate without duplicating core definitions.

- [README](../packages/tracing-models/README.md)
- [Examples](../packages/tracing-models/docs/examples.md)
- [Changelog](../packages/tracing-models/docs/changelog.md)

## tracing-connector-entity-storage

This package provides an entity-storage-backed tracing connector for durable span persistence. It supports scenarios where spans need to be retained, queried, and integrated with broader storage and processing workflows.

- [README](../packages/tracing-connector-entity-storage/README.md)
- [Examples](../packages/tracing-connector-entity-storage/docs/examples.md)
- [Changelog](../packages/tracing-connector-entity-storage/docs/changelog.md)

## tracing-connector-opentelemetry

This package provides an OpenTelemetry tracing connector which exports completed spans to an OTLP compatible receiver such as the OpenTelemetry Collector, Grafana Alloy or Tempo.

- [README](../packages/tracing-connector-opentelemetry/README.md)
- [Examples](../packages/tracing-connector-opentelemetry/docs/examples.md)
- [Changelog](../packages/tracing-connector-opentelemetry/docs/changelog.md)

## tracing-connector-console

This package provides a tracing connector which writes each completed span to the console. It is intended for development and debugging.

- [README](../packages/tracing-connector-console/README.md)
- [Examples](../packages/tracing-connector-console/docs/examples.md)
- [Changelog](../packages/tracing-connector-console/docs/changelog.md)

## tracing-service

This package exposes tracing operations through service routes and API contracts for server-side integration. It implements the tracing component contract and resolves a tracing connector through the factory pattern.

- [README](../packages/tracing-service/README.md)
- [Examples](../packages/tracing-service/docs/examples.md)
- [Changelog](../packages/tracing-service/docs/changelog.md)

## tracing-rest-client

This package provides a client for interacting with tracing service endpoints from applications and services. It implements the same tracing component contract as the service, enabling remote span creation, completion, and querying.

- [README](../packages/tracing-rest-client/README.md)
- [Examples](../packages/tracing-rest-client/docs/examples.md)
- [Changelog](../packages/tracing-rest-client/docs/changelog.md)

## tracing-processors

This package provides the processors which trace the HTTP boundary. A route processor records a span for each inbound request, continuing the trace from the `traceparent` header, and a REST client processor records a span for each outbound request, sending the `traceparent` header so the service being called continues the same trace.

- [README](../packages/tracing-processors/README.md)
- [Examples](../packages/tracing-processors/docs/examples.md)
- [Changelog](../packages/tracing-processors/docs/changelog.md)

## tracing-facades

This package provides a tracing facade which records a span for each method called on a factory produced component, so a component can be traced without being modified. It builds on the facade support in the component factories.

- [README](../packages/tracing-facades/README.md)
- [Examples](../packages/tracing-facades/docs/examples.md)
- [Changelog](../packages/tracing-facades/docs/changelog.md)
