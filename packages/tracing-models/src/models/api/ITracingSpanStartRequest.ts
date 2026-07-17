// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpanOptions } from "../ISpanOptions.js";

/**
 * Start a new span.
 */
export interface ITracingSpanStartRequest {
	/**
	 * The data to be used to start the span.
	 */
	body: {
		/**
		 * The name of the span.
		 */
		name: string;

		/**
		 * The options for the span.
		 */
		options?: ISpanOptions;
	};
}
