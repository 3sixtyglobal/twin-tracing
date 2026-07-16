# Interface: ISpanOptions

The options used when starting a span.

## Properties

### kind? {#kind}

> `optional` **kind?**: [`SpanKind`](../type-aliases/SpanKind.md)

The kind of the span, defaults to internal.

***

### parentContext? {#parentcontext}

> `optional` **parentContext?**: [`ISpanContext`](ISpanContext.md)

The context of the parent span, when supplied the new span continues the parent's trace and
records the parent's span id.

***

### startTs? {#startts}

> `optional` **startTs?**: `number`

The time the span started as milliseconds since the epoch, defaults to the current time.

***

### attributes? {#attributes}

> `optional` **attributes?**: `object`

The key-value attributes to record on the span at creation.

#### Index Signature

\[`key`: `string`\]: `unknown`

***

### links? {#links}

> `optional` **links?**: [`ISpanLink`](ISpanLink.md)[]

The links to other spans to record on the span at creation.
