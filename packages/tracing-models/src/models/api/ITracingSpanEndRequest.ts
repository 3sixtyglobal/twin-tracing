// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpan } from "../ISpan.js";

/**
 * End a span, finalizing its status and duration.
 */
export interface ITracingSpanEndRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the span to end.
		 */
		spanId: string;
	};

	/**
	 * The finalized span to persist, carrying any attributes and events accrued during its lifetime.
	 */
	body: ISpan;
}
