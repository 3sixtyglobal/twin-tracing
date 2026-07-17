// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISpanContext } from "./ISpanContext.js";
import type { ISpanLink } from "./ISpanLink.js";
import type { SpanKind } from "./spanKind.js";

/**
 * The options used when starting a span.
 */
export interface ISpanOptions {
	/**
	 * The kind of the span, defaults to internal.
	 */
	kind?: SpanKind;

	/**
	 * The context of the parent span, when supplied the new span continues the parent's trace and
	 * records the parent's span id.
	 */
	parentContext?: ISpanContext;

	/**
	 * The time the span started as milliseconds since the epoch, defaults to the current time.
	 */
	startTs?: number;

	/**
	 * The key-value attributes to record on the span at creation.
	 */
	attributes?: { [key: string]: unknown };

	/**
	 * The links to other spans to record on the span at creation.
	 */
	links?: ISpanLink[];
}
