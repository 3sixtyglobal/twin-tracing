# Class: SpanHelper

Helper methods for creating and finalizing spans.

## Constructors

### Constructor

> **new SpanHelper**(): `SpanHelper`

#### Returns

`SpanHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### TRACE\_FLAG\_SAMPLED {#trace_flag_sampled}

> `readonly` `static` **TRACE\_FLAG\_SAMPLED**: `number` = `1`

The trace flag indicating a span is sampled.

***

### MAX\_TRACE\_FLAGS {#max_trace_flags}

> `readonly` `static` **MAX\_TRACE\_FLAGS**: `number` = `255`

The maximum value of the trace flags, which is a single byte bitfield.

***

### TRACE\_ID\_LENGTH {#trace_id_length}

> `readonly` `static` **TRACE\_ID\_LENGTH**: `number` = `32`

The number of hex characters in a W3C trace id (16 bytes).

***

### SPAN\_ID\_LENGTH {#span_id_length}

> `readonly` `static` **SPAN\_ID\_LENGTH**: `number` = `16`

The number of hex characters in a W3C span id (8 bytes).

## Methods

### createContext() {#createcontext}

> `static` **createContext**(`parentContext?`): [`ISpanContext`](../interfaces/ISpanContext.md)

Create a new span context, following the W3C Trace Context id formats.
When a parent context is supplied its values are validated so malformed ids are not
inherited into (and persisted as part of) the minted context.

#### Parameters

##### parentContext?

[`ISpanContext`](../interfaces/ISpanContext.md)

The optional parent context, when supplied the trace id is inherited.

#### Returns

[`ISpanContext`](../interfaces/ISpanContext.md)

The new span context.

#### Throws

GuardError if a supplied parent context id is not a valid hex string, or GeneralError
if its traceFlags is outside the valid range.

***

### startSpan() {#startspan}

> `static` **startSpan**(`name`, `options?`): [`ISpan`](../interfaces/ISpan.md)

Build a new in-flight span from the supplied name and options.

#### Parameters

##### name

`string`

The name of the span.

##### options?

[`ISpanOptions`](../interfaces/ISpanOptions.md)

The options for the span.

#### Returns

[`ISpan`](../interfaces/ISpan.md)

The new span with a minted context and an unset status.

***

### endSpan() {#endspan}

> `static` **endSpan**(`span`, `status?`, `endTs?`): `void`

Finalize a span in place, setting its status, end time and duration.

#### Parameters

##### span

[`ISpan`](../interfaces/ISpan.md)

The span to finalize.

##### status?

[`SpanStatus`](../type-aliases/SpanStatus.md)

The status to set on the span, defaults to ok.

##### endTs?

`number`

The end time as milliseconds since the epoch, defaults to an already-set
`endTs` on the span, otherwise the current time. Honouring an existing value keeps a double
end idempotent and preserves a client-measured end time.

#### Returns

`void`
