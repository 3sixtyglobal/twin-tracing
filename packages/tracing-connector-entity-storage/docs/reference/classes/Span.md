# Class: Span

Class defining a span held in entity storage.

## Constructors

### Constructor

> **new Span**(): `Span`

#### Returns

`Span`

## Properties

### spanId {#spanid}

> **spanId**: `string`

The id of the span, used as the primary key.

***

### traceId {#traceid}

> **traceId**: `string`

The id of the trace the span belongs to.

***

### parentSpanId? {#parentspanid}

> `optional` **parentSpanId?**: `string`

The id of the parent span, when the span is not the root of the trace.

***

### name {#name}

> **name**: `string`

The name of the span.

***

### kind {#kind}

> **kind**: `SpanKind`

The kind of the span.

***

### status {#status}

> **status**: `SpanStatus`

The status of the span.

***

### traceFlags {#traceflags}

> **traceFlags**: `number`

The trace flags bitfield.

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

> `optional` **events?**: [`SpanEvent`](SpanEvent.md)[]

The events recorded within the span.

***

### links? {#links}

> `optional` **links?**: [`SpanLink`](SpanLink.md)[]

The links to other spans.
