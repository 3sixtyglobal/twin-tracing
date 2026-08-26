# Variable: HttpSpanAttributes

> `const` **HttpSpanAttributes**: `object`

The span attribute keys which are not specific to any domain, following the OpenTelemetry
semantic conventions. Domain specific keys belong with the domain, alongside its metric ids.

## Type Declaration

### HttpMethod {#httpmethod}

> `readonly` **HttpMethod**: `"http.method"` = `"http.method"`

The HTTP method of the request the span covers.

### HttpRoute {#httproute}

> `readonly` **HttpRoute**: `"http.route"` = `"http.route"`

The route of the request the span covers.

### HttpStatusCode {#httpstatuscode}

> `readonly` **HttpStatusCode**: `"http.status_code"` = `"http.status_code"`

The HTTP status code the request completed with.
