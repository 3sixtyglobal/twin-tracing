# Interface: IConsoleTracingConnectorConfig

Configuration for the Console Tracing Connector.

## Properties

### kinds? {#kinds}

> `optional` **kinds?**: `SpanKind`[]

The span kinds to display, will default to all.

***

### includeIds? {#includeids}

> `optional` **includeIds?**: `boolean`

Include the trace, span, and parent span ids in the output.

#### Default

```ts
false
```

***

### disableColor? {#disablecolor}

> `optional` **disableColor?**: `boolean`

Disable colour in the output.

#### Default

```ts
false
```
