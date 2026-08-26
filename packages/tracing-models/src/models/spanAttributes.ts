// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The span attribute keys which are not specific to any domain, following the OpenTelemetry
 * semantic conventions. Domain specific keys belong with the domain, alongside its metric ids.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SpanAttributes = {
	/**
	 * The message of the exception which ended the span.
	 */
	ExceptionMessage: "exception.message"
} as const;

/**
 * Union type of all non domain specific span attribute key string values.
 */
export type SpanAttributes = (typeof SpanAttributes)[keyof typeof SpanAttributes];
