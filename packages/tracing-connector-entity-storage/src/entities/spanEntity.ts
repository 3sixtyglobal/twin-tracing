// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@twin.org/entity";
import type { SpanKind, SpanStatus } from "@twin.org/tracing-models";
import type { SpanEvent } from "./spanEvent.js";
import type { SpanLink } from "./spanLink.js";

/**
 * Class defining a span held in entity storage.
 */
@entity()
export class SpanEntity {
	/**
	 * The id of the span, used as the primary key.
	 */
	@property({ type: "string", isPrimary: true })
	public spanId!: string;

	/**
	 * The id of the trace the span belongs to.
	 */
	@property({ type: "string", isSecondary: true })
	public traceId!: string;

	/**
	 * The id of the parent span, when the span is not the root of the trace.
	 */
	@property({ type: "string", optional: true })
	public parentSpanId?: string;

	/**
	 * The name of the span.
	 */
	@property({ type: "string" })
	public name!: string;

	/**
	 * The kind of the span.
	 */
	@property({ type: "string" })
	public kind!: SpanKind;

	/**
	 * The status of the span.
	 */
	@property({ type: "string" })
	public status!: SpanStatus;

	/**
	 * The trace flags bitfield.
	 */
	@property({ type: "integer" })
	public traceFlags!: number;

	/**
	 * The time the span started as milliseconds since the epoch.
	 */
	@property({ type: "integer", format: "uint64", sortDirection: SortDirection.Descending })
	public startTs!: number;

	/**
	 * The time the span ended as milliseconds since the epoch, undefined while the span is in-flight.
	 */
	@property({ type: "integer", format: "uint64", optional: true })
	public endTs?: number;

	/**
	 * The duration of the span in milliseconds, populated when the span ends.
	 */
	@property({ type: "integer", optional: true })
	public durationMs?: number;

	/**
	 * The key-value attributes describing the span.
	 */
	@property({ type: "object", optional: true })
	public attributes?: { [key: string]: unknown };

	/**
	 * The events recorded within the span.
	 */
	@property({ type: "array", itemType: "object", itemTypeRef: "SpanEvent", optional: true })
	public events?: SpanEvent[];

	/**
	 * The links to other spans.
	 */
	@property({ type: "array", itemType: "object", itemTypeRef: "SpanLink", optional: true })
	public links?: SpanLink[];
}
