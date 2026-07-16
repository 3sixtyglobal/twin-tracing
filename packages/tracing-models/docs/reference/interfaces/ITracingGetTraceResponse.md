# Interface: ITracingGetTraceResponse

Response for a get trace request.

## Properties

### body {#body}

> **body**: `object`

The response payload.

#### spans

> **spans**: [`ISpan`](ISpan.md)[]

The spans belonging to the trace, ordered by their start time ascending.
