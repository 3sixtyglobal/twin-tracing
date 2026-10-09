// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, GeneralError, Guards, RandomHelper } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { ISpan } from "../models/ISpan.js";
import type { ISpanContext } from "../models/ISpanContext.js";
import type { ISpanOptions } from "../models/ISpanOptions.js";
import { SpanKind } from "../models/spanKind.js";
import { SpanStatus } from "../models/spanStatus.js";

/**
 * Helper methods for creating and finalizing spans.
 */
export class SpanHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<SpanHelper>();

	/**
	 * The trace flag indicating a span is sampled.
	 */
	public static readonly TRACE_FLAG_SAMPLED: number = 1;

	/**
	 * The maximum value of the trace flags, which is a single byte bitfield.
	 */
	public static readonly MAX_TRACE_FLAGS: number = 255;

	/**
	 * The number of bytes in a W3C trace id.
	 */
	public static readonly TRACE_ID_BYTES: number = 16;

	/**
	 * The number of bytes in a W3C span id.
	 */
	public static readonly SPAN_ID_BYTES: number = 8;

	/**
	 * The number of hex characters in a W3C trace id.
	 */
	public static readonly TRACE_ID_LENGTH: number = SpanHelper.TRACE_ID_BYTES * 2;

	/**
	 * The number of hex characters in a W3C span id.
	 */
	public static readonly SPAN_ID_LENGTH: number = SpanHelper.SPAN_ID_BYTES * 2;

	/**
	 * Create a new span context, following the W3C Trace Context id formats.
	 * When a parent context is supplied its values are validated so malformed ids are not
	 * inherited into (and persisted as part of) the minted context.
	 * @param parentContext The optional parent context, when supplied the trace id is inherited.
	 * @returns The new span context.
	 * @throws GuardError if a supplied parent context id is not a valid hex string, or GeneralError
	 * if its traceFlags is outside the valid range.
	 */
	public static createContext(parentContext?: ISpanContext): ISpanContext {
		if (parentContext !== undefined) {
			Guards.stringHexLength(
				SpanHelper.CLASS_NAME,
				nameof(parentContext.traceId),
				parentContext.traceId,
				SpanHelper.TRACE_ID_LENGTH
			);
			Guards.stringHexLength(
				SpanHelper.CLASS_NAME,
				nameof(parentContext.spanId),
				parentContext.spanId,
				SpanHelper.SPAN_ID_LENGTH
			);
			Guards.integer(
				SpanHelper.CLASS_NAME,
				nameof(parentContext.traceFlags),
				parentContext.traceFlags
			);
			if (parentContext.traceFlags < 0 || parentContext.traceFlags > SpanHelper.MAX_TRACE_FLAGS) {
				throw new GeneralError(SpanHelper.CLASS_NAME, "traceFlagsOutOfRange", {
					traceFlags: parentContext.traceFlags
				});
			}
		}

		return {
			traceId:
				parentContext?.traceId ??
				Converter.bytesToHex(RandomHelper.generate(SpanHelper.TRACE_ID_BYTES)),
			spanId: Converter.bytesToHex(RandomHelper.generate(SpanHelper.SPAN_ID_BYTES)),
			traceFlags: parentContext?.traceFlags ?? SpanHelper.TRACE_FLAG_SAMPLED
		};
	}

	/**
	 * Build a new in-flight span from the supplied name and options.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The new span with a minted context and an unset status.
	 */
	public static startSpan(name: string, options?: ISpanOptions): ISpan {
		const span: ISpan = {
			name,
			kind: options?.kind ?? SpanKind.Internal,
			status: SpanStatus.Unset,
			context: SpanHelper.createContext(options?.parentContext),
			startTs: options?.startTs ?? Date.now()
		};

		if (options?.parentContext?.spanId !== undefined) {
			span.parentSpanId = options.parentContext.spanId;
		}
		if (options?.attributes !== undefined) {
			span.attributes = options.attributes;
		}
		if (options?.links !== undefined) {
			span.links = options.links;
		}

		return span;
	}

	/**
	 * Finalize a span in place, setting its status, end time and duration.
	 * @param span The span to finalize.
	 * @param status The status to set on the span, defaults to ok.
	 * @param endTs The end time as milliseconds since the epoch, defaults to an already-set
	 * `endTs` on the span, otherwise the current time. Honouring an existing value keeps a double
	 * end idempotent and preserves a client-measured end time.
	 */
	public static endSpan(span: ISpan, status?: SpanStatus, endTs?: number): void {
		span.status = status ?? (span.status === SpanStatus.Unset ? SpanStatus.Ok : span.status);
		span.endTs = endTs ?? span.endTs ?? Date.now();
		// Clamp to avoid a negative duration from clock skew or a bad client-supplied end time.
		span.durationMs = Math.max(0, span.endTs - span.startTs);
	}
}
