# Interface: ISpanLink

A causal reference from one span to another span, which may belong to a different trace.

## Properties

### context {#context}

> **context**: [`ISpanContext`](ISpanContext.md)

The context of the span being linked to.

***

### attributes? {#attributes}

> `optional` **attributes?**: `object`

The optional attributes describing the link.

#### Index Signature

\[`key`: `string`\]: `unknown`
