// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIds } from "@3sixty/context";
import type { Span } from "../entities/span.js";

/**
 * A pending span held in the batch cache, preserving the tenant context
 * captured at submission time so it can be faithfully replayed on flush.
 */
export interface IBatchEntry {
	/**
	 * The storage entity built from the span at the time it was submitted.
	 */
	entity: Span;

	/**
	 * Full context IDs snapshot taken at submission time; used to restore context on flush.
	 */
	contextIds: IContextIds;

	/**
	 * True when the span was produced outside any tenant context and must be
	 * written to every tenant via execute on flush.
	 */
	perTenant: boolean;
}
