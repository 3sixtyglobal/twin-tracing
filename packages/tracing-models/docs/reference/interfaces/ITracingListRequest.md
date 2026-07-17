# Interface: ITracingListRequest

Request parameters for retrieving a list of spans.

## Properties

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### traceId?

> `optional` **traceId?**: `string`

The id of the trace to filter by.

#### spanId?

> `optional` **spanId?**: `string`

The id of the span to filter by.

#### status?

> `optional` **status?**: [`SpanStatus`](../type-aliases/SpanStatus.md)

The status to filter by.

#### kind?

> `optional` **kind?**: [`SpanKind`](../type-aliases/SpanKind.md)

The kind to filter by.

#### timeStart?

> `optional` **timeStart?**: `string`

The inclusive start time to filter the span start by, as a timestamp in ms.

#### timeEnd?

> `optional` **timeEnd?**: `string`

The inclusive end time to filter the span start by, as a timestamp in ms.

#### cursor?

> `optional` **cursor?**: `string`

The optional cursor to get next chunk.

#### limit?

> `optional` **limit?**: `string`

Limit the number of entities to return.
