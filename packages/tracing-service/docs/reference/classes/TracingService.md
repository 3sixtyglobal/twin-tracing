# Class: TracingService

Service for performing tracing operations to a connector.

## Implements

- `ITracingComponent`

## Constructors

### Constructor

> **new TracingService**(`options?`): `TracingService`

Create a new instance of TracingService.

#### Parameters

##### options?

[`ITracingServiceConstructorOptions`](../interfaces/ITracingServiceConstructorOptions.md)

The options for the connector.

#### Returns

`TracingService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### MAX\_GET\_TRACE\_PAGES {#max_get_trace_pages}

> `readonly` `static` **MAX\_GET\_TRACE\_PAGES**: `number` = `1000`

The maximum number of pages `getTrace` will request before stopping. A safety bound that
prevents an unexpectedly large trace or a non-terminating connector cursor from looping
unbounded; with the default page size this still covers very large traces.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`ITracingComponent.className`

***

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<`ISpan`\>

Start a new span.

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

`ITracingComponent.startSpan`

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration.

#### Parameters

##### span

`ISpan`

The span to end.

##### status?

`SpanStatus`

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been ended.

#### Implementation of

`ITracingComponent.endSpan`

***

### query() {#query}

> **query**(`traceId?`, `spanId?`, `status?`, `kind?`, `timeStart?`, `timeEnd?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `ISpan`[]; `cursor?`: `string`; \}\>

Query the spans.

#### Parameters

##### traceId?

`string`

The id of the trace to filter by.

##### spanId?

`string`

The id of the span to filter by.

##### status?

`SpanStatus`

The status to filter by.

##### kind?

`SpanKind`

The kind to filter by.

##### timeStart?

`number`

The inclusive start time to filter the span start by, as a timestamp in ms.

##### timeEnd?

`number`

The inclusive end time to filter the span start by, as a timestamp in ms.

##### cursor?

`string`

The cursor to request the next chunk of entities.

##### limit?

`number`

Limit the number of entities to return.

#### Returns

`Promise`\<\{ `entities`: `ISpan`[]; `cursor?`: `string`; \}\>

All the entities for the storage matching the conditions,
and a cursor which can be used to request more entities.

#### Implementation of

`ITracingComponent.query`

***

### getTrace() {#gettrace}

> **getTrace**(`traceId`): `Promise`\<`ISpan`[]\>

Get all the spans belonging to a trace, ordered by their start time. The whole trace is paged
into memory; paging is bounded by [TracingService.MAX\_GET\_TRACE\_PAGES](#max_get_trace_pages) as a safeguard
against a pathologically large trace or a non-terminating cursor.

#### Parameters

##### traceId

`string`

The id of the trace to retrieve.

#### Returns

`Promise`\<`ISpan`[]\>

The spans belonging to the trace, ordered by their start time ascending.

#### Implementation of

`ITracingComponent.getTrace`
