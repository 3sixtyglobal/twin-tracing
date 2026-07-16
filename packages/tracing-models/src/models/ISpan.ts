// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpanContext } from "./ISpanContext.js";
import type { ISpanEvent } from "./ISpanEvent.js";
import type { ISpanLink } from "./ISpanLink.js";
import type { SpanKind } from "./spanKind.js";
import type { SpanStatus } from "./spanStatus.js";

/**
 * A span representing a timed unit of work within a trace.
 */
export interface ISpan {
	/**
	 * The name of the span, should be a stable low-cardinality label.
	 */
	name: string;

	/**
	 * The kind of the span.
	 */
	kind: SpanKind;

	/**
	 * The status of the span.
	 */
	status: SpanStatus;

	/**
	 * The context which uniquely identifies the span within its trace.
	 */
	context: ISpanContext;

	/**
	 * The id of the parent span, when the span is not the root of the trace.
	 */
	parentSpanId?: string;

	/**
	 * The time the span started as milliseconds since the epoch.
	 */
	startTs: number;

	/**
	 * The time the span ended as milliseconds since the epoch, undefined while the span is in-flight.
	 */
	endTs?: number;

	/**
	 * The duration of the span in milliseconds, populated when the span ends.
	 */
	durationMs?: number;

	/**
	 * The key-value attributes describing the span.
	 */
	attributes?: { [key: string]: unknown };

	/**
	 * The events recorded within the span.
	 */
	events?: ISpanEvent[];

	/**
	 * The links to other spans.
	 */
	links?: ISpanLink[];
}
