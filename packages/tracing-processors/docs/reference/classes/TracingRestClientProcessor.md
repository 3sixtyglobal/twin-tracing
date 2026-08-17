# Class: TracingRestClientProcessor

Records a span for each outbound REST request and carries the trace via traceparent header.

## Implements

- `IRestClientProcessor`

## Constructors

### Constructor

> **new TracingRestClientProcessor**(`options?`): `TracingRestClientProcessor`

Create a new instance of TracingRestClientProcessor.

#### Parameters

##### options?

[`ITracingRestClientProcessorConstructorOptions`](../interfaces/ITracingRestClientProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`TracingRestClientProcessor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IRestClientProcessor.className`

***

### pre() {#pre}

> **pre**(`context`, `next`): `Promise`\<`Response`\>

Wrap the request in a client span, sending the current span as the traceparent so the
receiving service continues this trace.

#### Parameters

##### context

`IRestClientProcessorContext`

The details of the request being made.

##### next

() => `Promise`\<`Response`\>

Performs the request.

#### Returns

`Promise`\<`Response`\>

The response.

#### Implementation of

`IRestClientProcessor.pre`
