# Interface: IOpenTelemetryExporterConfig

Configuration for a span exporter, sending spans as OTLP over HTTP with a protobuf payload.

## Properties

### endpoint {#endpoint}

> **endpoint**: `string`

The full URL of the OTLP traces endpoint to push spans to, e.g.
"http://localhost:4318/v1/traces". Required: a missing endpoint is rejected at start().

***

### headers? {#headers}

> `optional` **headers?**: `object`

Additional headers to send with each export request, e.g. for authenticating to a hosted
collector.

#### Index Signature

\[`key`: `string`\]: `string`

***

### processor? {#processor}

> `optional` **processor?**: [`OpenTelemetryProcessorTypes`](../type-aliases/OpenTelemetryProcessorTypes.md)

The span processor which feeds this exporter.

#### Default

```ts
batch
```

***

### scheduledDelayMs? {#scheduleddelayms}

> `optional` **scheduledDelayMs?**: `number`

The delay between two consecutive batch exports in milliseconds, batch processor only.

#### Default

```ts
5000
```

***

### maxExportBatchSize? {#maxexportbatchsize}

> `optional` **maxExportBatchSize?**: `number`

The maximum number of spans in a single export, batch processor only.

#### Default

```ts
512
```

***

### maxQueueSize? {#maxqueuesize}

> `optional` **maxQueueSize?**: `number`

The maximum number of spans buffered before spans are dropped, batch processor only.

#### Default

```ts
2048
```

***

### exportTimeoutMs? {#exporttimeoutms}

> `optional` **exportTimeoutMs?**: `number`

How long an export is allowed to run before it is cancelled in milliseconds, batch
processor only.

#### Default

```ts
30000
```

***

### concurrencyLimit? {#concurrencylimit}

> `optional` **concurrencyLimit?**: `number`

The maximum number of export requests which can be in flight at once.

***

### timeoutMs? {#timeoutms}

> `optional` **timeoutMs?**: `number`

The timeout for a single export request in milliseconds.
