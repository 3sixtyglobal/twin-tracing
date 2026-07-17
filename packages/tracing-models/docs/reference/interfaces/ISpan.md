# Interface: ISpan

A span representing a timed unit of work within a trace.

## Properties

### name {#name}

> **name**: `string`

The name of the span, should be a stable low-cardinality label.

***

### kind {#kind}

> **kind**: [`SpanKind`](../type-aliases/SpanKind.md)

The kind of the span.

***

### status {#status}

> **status**: [`SpanStatus`](../type-aliases/SpanStatus.md)

The status of the span.

***

### context {#context}

> **context**: [`ISpanContext`](ISpanContext.md)

The context which uniquely identifies the span within its trace.

***

### parentSpanId? {#parentspanid}

> `optional` **parentSpanId?**: `string`

The id of the parent span, when the span is not the root of the trace.

***

### startTs {#startts}

> **startTs**: `number`

The time the span started as milliseconds since the epoch.

***

### endTs? {#endts}

> `optional` **endTs?**: `number`

The time the span ended as milliseconds since the epoch, undefined while the span is in-flight.

***

### durationMs? {#durationms}

> `optional` **durationMs?**: `number`

The duration of the span in milliseconds, populated when the span ends.

***

### attributes? {#attributes}

> `optional` **attributes?**: `object`

The key-value attributes describing the span.

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### events? {#events}

> `optional` **events?**: [`ISpanEvent`](ISpanEvent.md)[]

The events recorded within the span.

***

### links? {#links}

> `optional` **links?**: [`ISpanLink`](ISpanLink.md)[]

The links to other spans.
