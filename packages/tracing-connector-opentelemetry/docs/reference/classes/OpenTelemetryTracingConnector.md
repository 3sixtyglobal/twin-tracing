# Class: OpenTelemetryTracingConnector

Class for exporting spans to an OTLP compatible endpoint using OpenTelemetry.

The connector is a pure forwarder, it does not persist spans and therefore does not implement
`query()`.

## Implements

- `ITracingConnector`

## Constructors

### Constructor

> **new OpenTelemetryTracingConnector**(`options?`): `OpenTelemetryTracingConnector`

Create a new instance of OpenTelemetryTracingConnector.

#### Parameters

##### options?

[`IOpenTelemetryTracingConnectorConstructorOptions`](../interfaces/IOpenTelemetryTracingConnectorConstructorOptions.md)

The options for the tracing connector.

#### Returns

`OpenTelemetryTracingConnector`

#### Throws

GuardError if a configured processor is not a supported value, or GeneralError if the
sample ratio is outside the range 0 to 1.

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"opentelemetry"`

The namespace for the tracing connector.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`ITracingConnector.className`

***

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

Build the exporters and the resource, and mark the connector as running. Calling start() on a
connector that has already been started is a no-op.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the connector is ready to export spans.

#### Throws

GuardError if an exporter has no endpoint.

#### Implementation of

`ITracingConnector.start`

***

### stop() {#stop}

> **stop**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

Shut down the span processors and release resources. Shutting a processor down flushes any
spans it still has buffered, so this must be called during a graceful shutdown to avoid losing
them. Calling stop() on a connector that has not been started is a no-op.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all processors have shut down.

#### Implementation of

`ITracingConnector.stop`

***

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<`ISpan`\>

Start a new span. Nothing is exported yet, an OTLP receiver only accepts completed spans, so
the span is exported when it ends.

#### Parameters

##### name

`string`

The name of the span.

##### options?

`ISpanOptions`

The options for the span.

#### Returns

`Promise`\<`ISpan`\>

The started span, including its minted context.

#### Implementation of

`ITracingConnector.startSpan`

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration and exporting it.

#### Parameters

##### span

`ISpan`

The span to end.

##### status?

`SpanStatus`

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been queued for export.

#### Implementation of

`ITracingConnector.endSpan`

***

### recordSpan() {#recordspan}

> **recordSpan**(`span`): `Promise`\<`void`\>

Record a pre-built span verbatim. Completed spans are exported, open spans are ignored since
they cannot be represented over OTLP; the span will be exported when it is recorded again with
an end time.

#### Parameters

##### span

`ISpan`

The span to record.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been queued for export.

#### Implementation of

`ITracingConnector.recordSpan`
