# Class: TracingRouteProcessor

Process the REST request and record it as a span.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new TracingRouteProcessor**(`options?`): `TracingRouteProcessor`

Create a new instance of TracingRouteProcessor.

#### Parameters

##### options?

[`ITracingRouteProcessorConstructorOptions`](../interfaces/ITracingRouteProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`TracingRouteProcessor`

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

`IBaseRouteProcessor.className`

***

### pre() {#pre}

> **pre**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Pre process the REST request for the specified route, opening the span for the request.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been started.

#### Implementation of

`IBaseRouteProcessor.pre`

***

### post() {#post}

> **post**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Post process the REST request for the specified route, ending the span for the request.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the span has been ended.

#### Implementation of

`IBaseRouteProcessor.post`
