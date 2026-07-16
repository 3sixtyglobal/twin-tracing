# Interface: ITracingSpanStartRequest

Start a new span.

## Properties

### body {#body}

> **body**: `object`

The data to be used to start the span.

#### name

> **name**: `string`

The name of the span.

#### options?

> `optional` **options?**: [`ISpanOptions`](ISpanOptions.md)

The options for the span.
