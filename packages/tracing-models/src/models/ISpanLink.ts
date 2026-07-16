// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpanContext } from "./ISpanContext.js";

/**
 * A causal reference from one span to another span, which may belong to a different trace.
 */
export interface ISpanLink {
	/**
	 * The context of the span being linked to.
	 */
	context: ISpanContext;

	/**
	 * The optional attributes describing the link.
	 */
	attributes?: { [key: string]: unknown };
}
