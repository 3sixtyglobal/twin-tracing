# Function: tracingSpanEnd()

> **tracingSpanEnd**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

End a span.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`ITracingSpanEndRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

A promise that resolves to a no-content response when the span has been ended.
