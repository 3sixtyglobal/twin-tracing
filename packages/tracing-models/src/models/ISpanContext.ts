// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The context which uniquely identifies a span within a trace, following the W3C Trace Context format.
 */
export interface ISpanContext {
	/**
	 * The id of the trace the span belongs to, as a 16 byte hex string.
	 */
	traceId: string;

	/**
	 * The id of the span, as an 8 byte hex string.
	 */
	spanId: string;

	/**
	 * The trace flags bitfield, where the least significant bit indicates the span is sampled.
	 */
	traceFlags: number;
}
