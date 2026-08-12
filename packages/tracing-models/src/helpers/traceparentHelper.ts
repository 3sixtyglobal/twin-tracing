// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Is } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { SpanHelper } from "./spanHelper.js";
import type { ISpanContext } from "../models/ISpanContext.js";

/**
 * Helper methods for converting between a span context and the W3C traceparent header.
 */
export class TraceparentHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TraceparentHelper>();

	/**
	 * The name of the header carrying the traceparent.
	 */
	public static readonly HEADER_NAME: string = "traceparent";

	/**
	 * The trace flags marking a trace as sampled, assumed when flags are not supplied.
	 */
	public static readonly SAMPLED_FLAGS: string = "01";

	/**
	 * The traceparent version this helper writes.
	 * @internal
	 */
	private static readonly _VERSION: string = "00";

	/**
	 * The number of hex characters in the version field.
	 * @internal
	 */
	private static readonly _VERSION_LENGTH: number = 2;

	/**
	 * The number of hex characters in the trace flags field.
	 * @internal
	 */
	private static readonly _FLAGS_LENGTH: number = 2;

	/**
	 * The version the specification reserves as invalid.
	 * @internal
	 */
	private static readonly _INVALID_VERSION: string = "ff";

	/**
	 * The trace id which the specification defines as invalid, all zeroes.
	 * @internal
	 */
	private static readonly _INVALID_TRACE_ID: string = "0".repeat(SpanHelper.TRACE_ID_LENGTH);

	/**
	 * The span id which the specification defines as invalid, all zeroes.
	 * @internal
	 */
	private static readonly _INVALID_SPAN_ID: string = "0".repeat(SpanHelper.SPAN_ID_LENGTH);

	/**
	 * Parse a traceparent header into a span context.
	 * @param traceparent The value of the traceparent header.
	 * @returns The span context, or undefined when the header is missing or not valid.
	 */
	public static parse(traceparent?: string): ISpanContext | undefined {
		if (!Is.stringValue(traceparent)) {
			return undefined;
		}

		const parts = traceparent.trim().split("-");

		// Later versions may only append fields, so the first four are read and the rest ignored,
		// which keeps a trace connected to a service running a newer version than this one.
		if (parts.length < 4) {
			return undefined;
		}

		const [version, traceId, spanId, traceFlags] = parts;

		if (
			!Is.stringHexLength(version, TraceparentHelper._VERSION_LENGTH) ||
			version === TraceparentHelper._INVALID_VERSION
		) {
			return undefined;
		}

		if (version === TraceparentHelper._VERSION && parts.length !== 4) {
			return undefined;
		}

		return TraceparentHelper.fromParts(traceId, spanId, traceFlags);
	}

	/**
	 * Build a span context from its parts.
	 * @param traceId The id of the trace, as a 32 character hex string.
	 * @param spanId The id of the span, as a 16 character hex string.
	 * @param traceFlags The trace flags, as a 2 character hex string, defaults to sampled.
	 * @returns The span context, or undefined when any part is not valid.
	 */
	public static fromParts(
		traceId?: string,
		spanId?: string,
		traceFlags?: string
	): ISpanContext | undefined {
		const flags = traceFlags ?? TraceparentHelper.SAMPLED_FLAGS;

		if (
			!Is.stringHexLength(traceId, SpanHelper.TRACE_ID_LENGTH) ||
			!Is.stringHexLength(spanId, SpanHelper.SPAN_ID_LENGTH) ||
			!Is.stringHexLength(flags, TraceparentHelper._FLAGS_LENGTH)
		) {
			return undefined;
		}

		if (
			traceId === TraceparentHelper._INVALID_TRACE_ID ||
			spanId === TraceparentHelper._INVALID_SPAN_ID
		) {
			return undefined;
		}

		return {
			traceId,
			spanId,
			traceFlags: Number.parseInt(flags, 16)
		};
	}

	/**
	 * Format a span context as a traceparent header.
	 * @param spanContext The span context to format.
	 * @returns The traceparent header value.
	 */
	public static format(spanContext: ISpanContext): string {
		// eslint-disable-next-line no-bitwise
		const traceFlags = (spanContext.traceFlags & SpanHelper.MAX_TRACE_FLAGS)
			.toString(16)
			.padStart(2, "0");

		return `${TraceparentHelper._VERSION}-${spanContext.traceId}-${spanContext.spanId}-${traceFlags}`;
	}
}
