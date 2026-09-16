// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The span attribute keys which are not specific to any domain, following the OpenTelemetry
 * semantic conventions. Domain specific keys belong with the domain, alongside its metric ids.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const HttpSpanAttributes = {
	/**
	 * The HTTP method of the request the span covers.
	 */
	HttpMethod: "http.method",

	/**
	 * The route of the request the span covers.
	 */
	HttpRoute: "http.route",

	/**
	 * The HTTP status code the request completed with.
	 */
	HttpStatusCode: "http.status_code"
} as const;

/**
 * Union type of all non domain specific span attribute key string values.
 */
export type HttpSpanAttributes = (typeof HttpSpanAttributes)[keyof typeof HttpSpanAttributes];
