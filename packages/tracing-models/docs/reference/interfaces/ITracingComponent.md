# Interface: ITracingComponent

Interface describing a tracing component contract.

## Extends

- `IComponent`

## Methods

### startSpan() {#startspan}

> **startSpan**(`name`, `options?`): `Promise`\<[`ISpan`](ISpan.md)\>

Start a new span.

#### Parameters

##### name

`string`

The name of the span.

##### options?

[`ISpanOptions`](ISpanOptions.md)

The options for the span.

#### Returns

`Promise`\<[`ISpan`](ISpan.md)\>

The started span, including its minted context.

***

### endSpan() {#endspan}

> **endSpan**(`span`, `status?`): `Promise`\<`void`\>

End a span, finalizing its status and duration.

#### Parameters

##### span

[`ISpan`](ISpan.md)

The span to end.

##### status?

[`SpanStatus`](../type-aliases/SpanStatus.md)

The status to set on the span, defaults to ok.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been ended.

***

### query() {#query}

> **query**(`traceId?`, `spanId?`, `status?`, `kind?`, `timeStart?`, `timeEnd?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`ISpan`](ISpan.md)[]; `cursor?`: `string`; \}\>

Query the spans.

#### Parameters

##### traceId?

`string`

The id of the trace to filter by.

##### spanId?

`string`

The id of the span to filter by.

##### status?

[`SpanStatus`](../type-aliases/SpanStatus.md)

The status to filter by.

##### kind?

[`SpanKind`](../type-aliases/SpanKind.md)

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

`Promise`\<\{ `entities`: [`ISpan`](ISpan.md)[]; `cursor?`: `string`; \}\>

All the entities for the storage matching the conditions,
and a cursor which can be used to request more entities.

***

### getTrace() {#gettrace}

> **getTrace**(`traceId`): `Promise`\<[`ISpan`](ISpan.md)[]\>

Get all the spans belonging to a trace, ordered by their start time.

#### Parameters

##### traceId

`string`

The id of the trace to retrieve.

#### Returns

`Promise`\<[`ISpan`](ISpan.md)[]\>

The spans belonging to the trace, ordered by their start time ascending.
