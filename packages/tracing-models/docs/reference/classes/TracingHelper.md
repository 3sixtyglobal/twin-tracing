# Class: TracingHelper

Helper methods for running operations inside a span.

## Constructors

### Constructor

> **new TracingHelper**(): `TracingHelper`

#### Returns

`TracingHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### withSpan() {#withspan}

> `static` **withSpan**\<`T`\>(`tracingComponent`, `name`, `options`, `callback`): `Promise`\<`T`\>

Run an operation inside a span, ending the span however the operation finishes.

The parent is taken from the tracing context ids held in the current context, so nested calls
form a tree. Supply `options.parentContext` to override the ambient parent.

#### Type Parameters

##### T

`T`

#### Parameters

##### tracingComponent

[`ITracingComponent`](../interfaces/ITracingComponent.md) \| `undefined`

The tracing component.

##### name

`string`

The name of the span.

##### options

[`ISpanOptions`](../interfaces/ISpanOptions.md) \| `undefined`

The options for the span.

##### callback

(`span?`) => `Promise`\<`T`\>

The operation to run.

#### Returns

`Promise`\<`T`\>

The result of the callback.

#### Throws

Whatever the callback throws, after ending the span with an error status.

***

### getCurrentSpanContext() {#getcurrentspancontext}

> `static` **getCurrentSpanContext**(): `Promise`\<[`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`\>

Get the span context currently in scope.

#### Returns

`Promise`\<[`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`\>

The span context, or undefined when no span is in scope.

***

### spanContextFromContextIds() {#spancontextfromcontextids}

> `static` **spanContextFromContextIds**(`contextIds`): [`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

Build a span context from the tracing context ids.

#### Parameters

##### contextIds

`IContextIds`

The context ids to read.

#### Returns

[`ISpanContext`](../interfaces/ISpanContext.md) \| `undefined`

The span context, or undefined when the ids are absent or not valid.

***

### spanContextToContextIds() {#spancontexttocontextids}

> `static` **spanContextToContextIds**(`spanContext`): `IContextIds`

Map a span context to tracing context ids.

#### Parameters

##### spanContext

[`ISpanContext`](../interfaces/ISpanContext.md)

The span context to map.

#### Returns

`IContextIds`

The context ids for the span.
