# Variable: SpanKind

> `const` **SpanKind**: `object`

The kind of span, describing the role the operation plays in the overall flow.

## Type Declaration

### Internal {#internal}

> `readonly` **Internal**: `"internal"` = `"internal"`

A span representing pure in-process work.

### Client {#client}

> `readonly` **Client**: `"client"` = `"client"`

A span representing an outbound request to another service or dependency.

### Server {#server}

> `readonly` **Server**: `"server"` = `"server"`

A span representing the handling of an inbound request.

### Producer {#producer}

> `readonly` **Producer**: `"producer"` = `"producer"`

A span representing the publishing of a message to a broker or queue.

### Consumer {#consumer}

> `readonly` **Consumer**: `"consumer"` = `"consumer"`

A span representing the processing of a message from a broker or queue.
