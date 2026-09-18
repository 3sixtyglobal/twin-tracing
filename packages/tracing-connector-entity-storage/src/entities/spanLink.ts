// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@twin.org/entity";

/**
 * Class defining a causal link to another span, with the linked span context flattened.
 */
@entity()
export class SpanLink {
	/**
	 * The id of the trace the linked span belongs to.
	 */
	@property({ type: "string", maxLength: 255 })
	public traceId!: string;

	/**
	 * The id of the linked span.
	 */
	@property({ type: "string", maxLength: 255 })
	public spanId!: string;

	/**
	 * The trace flags of the linked span context.
	 */
	@property({ type: "integer", optional: true })
	public traceFlags?: number;

	/**
	 * The attributes describing the link.
	 */
	@property({ type: "object", optional: true })
	public attributes?: { [key: string]: unknown };
}
