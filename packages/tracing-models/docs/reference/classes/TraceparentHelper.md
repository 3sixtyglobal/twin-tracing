# Class: TraceparentHelper

Helper methods for converting between a span context and the W3C traceparent header.

## Constructors

### Constructor

> **new TraceparentHelper**(): `TraceparentHelper`

#### Returns

`TraceparentHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### HEADER\_NAME {#header_name}

> `readonly` `static` **HEADER\_NAME**: `string` = `"traceparent"`

The name of the header carrying the traceparent.

***

### SAMPLED\_FLAGS {#sampled_flags}

> `readonly` `static` **SAMPLED\_FLAGS**: `string` = `"01"`

The trace flags marking a trace as sampled, assumed when flags are not supplied.

## Methods

### parse() {#parse}

> `static` **parse**(`traceparent?`): [`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

Parse a traceparent header into a span context.

#### Parameters

##### traceparent?

`string`

The value of the traceparent header.

#### Returns

[`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

The span context, or undefined when the header is missing or not valid.

***

### fromParts() {#fromparts}

> `static` **fromParts**(`traceId?`, `spanId?`, `traceFlags?`): [`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

Build a span context from its parts.

#### Parameters

##### traceId?

`string`

The id of the trace, as a 32 character hex string.

##### spanId?

`string`

The id of the span, as a 16 character hex string.

##### traceFlags?

`string`

The trace flags, as a 2 character hex string, defaults to sampled.

#### Returns

[`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

The span context, or undefined when any part is not valid.

***

### format() {#format}

> `static` **format**(`spanContext`): `string`

Format a span context as a traceparent header.

#### Parameters

##### spanContext

[`ISpanContext`](../interfaces/ISpanContext.md)

The span context to format.

#### Returns

`string`

The traceparent header value.
