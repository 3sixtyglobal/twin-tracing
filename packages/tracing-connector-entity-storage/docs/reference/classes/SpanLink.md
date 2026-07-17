# Class: SpanLink

Class defining a causal link to another span, with the linked span context flattened.

## Constructors

### Constructor

> **new SpanLink**(): `SpanLink`

#### Returns

`SpanLink`

## Properties

### traceId {#traceid}

> **traceId**: `string`

The id of the trace the linked span belongs to.

***

### spanId {#spanid}

> **spanId**: `string`

The id of the linked span.

***

### traceFlags? {#traceflags}

> `optional` **traceFlags?**: `number`

The trace flags of the linked span context.

***

### attributes? {#attributes}

> `optional` **attributes?**: `object`

The attributes describing the link.

#### Index Signature

\[`key`: `string`\]: `unknown`
