# Interface: ISpanEvent

A timestamped annotation recorded within a span to mark a milestone.

## Properties

### name {#name}

> **name**: `string`

The name of the event.

***

### ts {#ts}

> **ts**: `number`

The timestamp of the event as milliseconds since the epoch.

***

### attributes? {#attributes}

> `optional` **attributes?**: `object`

The optional attributes associated with the event.

#### Index Signature

\[`key`: `string`\]: `unknown`
