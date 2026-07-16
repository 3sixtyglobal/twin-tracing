// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The status of a span.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SpanStatus = {
	/**
	 * The span has no explicit status, this is the default.
	 */
	Unset: "unset",

	/**
	 * The operation completed successfully.
	 */
	Ok: "ok",

	/**
	 * The operation ended in an error.
	 */
	Error: "error"
} as const;

/**
 * The status of a span.
 */
export type SpanStatus = (typeof SpanStatus)[keyof typeof SpanStatus];
