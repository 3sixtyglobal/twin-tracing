# Interface: ITracingSpanEndRequest

End a span, finalizing its status and duration.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### spanId

> **spanId**: `string`

The id of the span to end.

***

### body {#body}

> **body**: [`ISpan`](ISpan.md)

The finalized span to persist, carrying any attributes and events accrued during its lifetime.
