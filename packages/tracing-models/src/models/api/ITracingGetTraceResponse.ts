// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpan } from "../ISpan.js";

/**
 * Response for a get trace request.
 */
export interface ITracingGetTraceResponse {
	/**
	 * The response payload.
	 */
	body: {
		/**
		 * The spans belonging to the trace, ordered by their start time ascending.
		 */
		spans: ISpan[];
	};
}
