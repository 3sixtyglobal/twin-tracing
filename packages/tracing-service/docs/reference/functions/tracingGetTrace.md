# Function: tracingGetTrace()

> **tracingGetTrace**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`ITracingGetTraceResponse`\>

Get all the spans belonging to a trace.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`ITracingGetTraceRequest`

The request.

## Returns

`Promise`\<`ITracingGetTraceResponse`\>

A promise that resolves to the spans belonging to the trace.
