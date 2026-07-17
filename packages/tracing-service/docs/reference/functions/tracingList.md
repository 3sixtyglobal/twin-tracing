# Function: tracingList()

> **tracingList**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`ITracingListResponse`\>

Get a list of the spans.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`ITracingListRequest`

The request.

## Returns

`Promise`\<`ITracingListResponse`\>

A promise that resolves to the matching spans and an optional pagination cursor.
