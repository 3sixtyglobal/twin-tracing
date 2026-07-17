// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { ISpan } from "./ISpan.js";
import type { ISpanOptions } from "./ISpanOptions.js";
import type { SpanKind } from "./spanKind.js";
import type { SpanStatus } from "./spanStatus.js";

/**
 * Interface describing a tracing component contract.
 */
export interface ITracingComponent extends IComponent {
	/**
	 * Start a new span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	startSpan(name: string, options?: ISpanOptions): Promise<ISpan>;

	/**
	 * End a span, finalizing its status and duration.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been ended.
	 */
	endSpan(span: ISpan, status?: SpanStatus): Promise<void>;

	/**
	 * Query the spans.
	 * @param traceId The id of the trace to filter by.
	 * @param spanId The id of the span to filter by.
	 * @param status The status to filter by.
	 * @param kind The kind to filter by.
	 * @param timeStart The inclusive start time to filter the span start by, as a timestamp in ms.
	 * @param timeEnd The inclusive end time to filter the span start by, as a timestamp in ms.
	 * @param cursor The cursor to request the next chunk of entities.
	 * @param limit Limit the number of entities to return.
	 * @returns All the entities for the storage matching the conditions,
	 * and a cursor which can be used to request more entities.
	 */
	query(
		traceId?: string,
		spanId?: string,
		status?: SpanStatus,
		kind?: SpanKind,
		timeStart?: number,
		timeEnd?: number,
		cursor?: string,
		limit?: number
	): Promise<{
		/**
		 * The spans.
		 */
		entities: ISpan[];

		/**
		 * An optional cursor, when defined can be used to call query to get more entities.
		 */
		cursor?: string;
	}>;

	/**
	 * Get all the spans belonging to a trace, ordered by their start time.
	 * @param traceId The id of the trace to retrieve.
	 * @returns The spans belonging to the trace, ordered by their start time ascending.
	 */
	getTrace(traceId: string): Promise<ISpan[]>;
}
