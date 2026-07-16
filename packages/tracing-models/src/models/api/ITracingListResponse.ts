// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpan } from "../ISpan.js";

/**
 * Response for span list request.
 */
export interface ITracingListResponse {
	/**
	 * The response payload.
	 */
	body: {
		/**
		 * The spans matching the query conditions.
		 */
		entities: ISpan[];

		/**
		 * An optional cursor, when defined can be used to call query to get more entities.
		 */
		cursor?: string;
	};
}
