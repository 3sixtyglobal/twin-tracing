# Interface: IOpenTelemetryTracingConnectorConfig

Configuration for the OpenTelemetry tracing connector.

## Properties

### tracerName? {#tracername}

> `optional` **tracerName?**: `string`

The name of the instrumentation scope reported on exported spans.

#### Default

```ts
twin-tracing
```

***

### tracerVersion? {#tracerversion}

> `optional` **tracerVersion?**: `string`

The version of the instrumentation scope reported on exported spans.

#### Default

```ts
1.0.0
```

***

### resourceAttributes? {#resourceattributes}

> `optional` **resourceAttributes?**: `object`

Attributes describing the entity producing the spans, attached to the OpenTelemetry
resource so backends can group traces by service, e.g. `{ "service.name": "twin-node" }`.

#### Index Signature

\[`key`: `string`\]: `string` \| `number` \| `boolean`

***

### sampleRatio? {#sampleratio}

> `optional` **sampleRatio?**: `number`

The proportion of traces to export, between 0 and 1, applied deterministically to the trace
id so every span in a trace shares the same decision. Spans whose context is already marked
as not sampled are never exported regardless of this value.

#### Default

```ts
1
```

***

### exporters? {#exporters}

> `optional` **exporters?**: `object`

Named exporter configurations keyed by an arbitrary id. Omit or pass an empty object to
disable export entirely.

#### Index Signature

\[`id`: `string`\]: [`IOpenTelemetryExporterConfig`](IOpenTelemetryExporterConfig.md)
