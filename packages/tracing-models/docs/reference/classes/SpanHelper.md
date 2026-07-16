# Class: SpanHelper

Helper methods for creating and finalizing spans.

## Constructors

### Constructor

> **new SpanHelper**(): `SpanHelper`

#### Returns

`SpanHelper`

## Properties

### TRACE\_FLAG\_SAMPLED {#trace_flag_sampled}

> `readonly` `static` **TRACE\_FLAG\_SAMPLED**: `number` = `1`

The trace flag indicating a span is sampled.

## Methods

### createContext() {#createcontext}

> `static` **createContext**(`parentContext?`): [`ISpanContext`](../interfaces/ISpanContext.md)

Create a new span context, following the W3C Trace Context id formats.

#### Parameters

##### parentContext?

[`ISpanContext`](../interfaces/ISpanContext.md)

The optional parent context, when supplied the trace id is inherited.

#### Returns

[`ISpanContext`](../interfaces/ISpanContext.md)

The new span context.

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

The end time as milliseconds since the epoch, defaults to the current time.

#### Returns

`void`
