// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, RandomHelper } from "@twin.org/core";
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
	 * The trace flag indicating a span is sampled.
	 */
	public static readonly TRACE_FLAG_SAMPLED: number = 1;

	/**
	 * Create a new span context, following the W3C Trace Context id formats.
	 * @param parentContext The optional parent context, when supplied the trace id is inherited.
	 * @returns The new span context.
	 */
	public static createContext(parentContext?: ISpanContext): ISpanContext {
		return {
			traceId: parentContext?.traceId ?? Converter.bytesToHex(RandomHelper.generate(16)),
			spanId: Converter.bytesToHex(RandomHelper.generate(8)),
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
	 * @param endTs The end time as milliseconds since the epoch, defaults to the current time.
	 */
	public static endSpan(span: ISpan, status?: SpanStatus, endTs?: number): void {
		span.status = status ?? (span.status === SpanStatus.Unset ? SpanStatus.Ok : span.status);
		span.endTs = endTs ?? Date.now();
		span.durationMs = span.endTs - span.startTs;
	}
}
