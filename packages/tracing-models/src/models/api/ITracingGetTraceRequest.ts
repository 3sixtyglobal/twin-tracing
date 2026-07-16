// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Request to get all the spans belonging to a trace.
 */
export interface ITracingGetTraceRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the trace to retrieve.
		 */
		traceId: string;
	};
}
