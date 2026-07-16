# Interface: ITracingListResponse

Response for span list request.

## Properties

### body {#body}

> **body**: `object`

The response payload.

#### entities

> **entities**: [`ISpan`](ISpan.md)[]

The spans matching the query conditions.

#### cursor?

> `optional` **cursor?**: `string`

An optional cursor, when defined can be used to call query to get more entities.
