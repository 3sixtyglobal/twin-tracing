// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpan } from "../ISpan.js";

/**
 * Response for starting a span.
 */
export interface ITracingSpanStartResponse {
	/**
	 * The response payload.
	 */
	body: ISpan;
}
