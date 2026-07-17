# Function: tracingSpanStart()

> **tracingSpanStart**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`ITracingSpanStartResponse`\>

Start a new span.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`ITracingSpanStartRequest`

The request.

## Returns

`Promise`\<`ITracingSpanStartResponse`\>

A promise that resolves to the started span.
