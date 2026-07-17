// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { SpanKind } from "../spanKind.js";
import type { SpanStatus } from "../spanStatus.js";

/**
 * Request parameters for retrieving a list of spans.
 */
export interface ITracingListRequest {
	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * The id of the trace to filter by.
		 */
		traceId?: string;

		/**
		 * The id of the span to filter by.
		 */
		spanId?: string;

		/**
		 * The status to filter by.
		 */
		status?: SpanStatus;

		/**
		 * The kind to filter by.
		 */
		kind?: SpanKind;

		/**
		 * The inclusive start time to filter the span start by, as a timestamp in ms.
		 */
		timeStart?: string;

		/**
		 * The inclusive end time to filter the span start by, as a timestamp in ms.
		 */
		timeEnd?: string;

		/**
		 * The optional cursor to get next chunk.
		 */
		cursor?: string;

		/**
		 * Limit the number of entities to return.
		 */
		limit?: string;
	};
}
