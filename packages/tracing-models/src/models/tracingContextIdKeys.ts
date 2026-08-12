// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The context id keys used by tracing.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TracingContextIdKeys = {
	/**
	 * The id of the trace the current span belongs to, as a 16 byte hex string.
	 */
	TraceId: "traceId",

	/**
	 * The id of the span currently in scope, which a new span uses as its parent, as an 8 byte hex
	 * string.
	 */
	SpanId: "spanId",

	/**
	 * The trace flags of the current span, as a 2 character hex string, where the least significant
	 * bit indicates the trace is sampled.
	 */
	TraceFlags: "traceFlags"
} as const;

/**
 * The context id keys used by tracing, extending those from @twin.org/context.
 */
export type TracingContextIdKeys = (typeof TracingContextIdKeys)[keyof typeof TracingContextIdKeys];
