// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Guards, Is } from "@3sixty/core";
import {
	ComparisonOperator,
	LogicalOperator,
	SortDirection,
	type EntityCondition
} from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import {
	TracingConnectorFactory,
	type ISpan,
	type ISpanOptions,
	type ITracingComponent,
	type ITracingConnector,
	type SpanKind,
	type SpanStatus
} from "@3sixty/tracing-models";
import type { ITracingServiceConstructorOptions } from "./models/ITracingServiceConstructorOptions.js";

/**
 * Service for performing tracing operations to a connector.
 */
export class TracingService implements ITracingComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingService>();

	/**
	 * The maximum number of pages `getTrace` will request before stopping. A safety bound that
	 * prevents an unexpectedly large trace or a non-terminating connector cursor from looping
	 * unbounded; with the default page size this still covers very large traces.
	 */
	public static readonly MAX_GET_TRACE_PAGES: number = 1000;

	/**
	 * Tracing connector used by the service.
	 * @internal
	 */
	private readonly _tracingConnector: ITracingConnector;

	/**
	 * Create a new instance of TracingService.
	 * @param options The options for the connector.
	 */
	constructor(options?: ITracingServiceConstructorOptions) {
		this._tracingConnector = TracingConnectorFactory.get(
			options?.tracingConnectorType ?? "tracing"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TracingService.CLASS_NAME;
	}

	/**
	 * Start a new span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(TracingService.CLASS_NAME, nameof(name), name);

		return this._tracingConnector.startSpan(name, options);
	}

	/**
	 * End a span, finalizing its status and duration.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been ended.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(TracingService.CLASS_NAME, nameof(span), span);

		await this._tracingConnector.endSpan(span, status);
	}

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
	public async query(
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
	}> {
		const condition: EntityCondition<ISpan> = {
			conditions: [],
			logicalOperator: LogicalOperator.And
		};

		if (Is.stringValue(traceId)) {
			condition.conditions.push({
				property: "traceId",
				comparison: ComparisonOperator.Equals,
				value: traceId
			});
		}

		if (Is.stringValue(spanId)) {
			condition.conditions.push({
				property: "spanId",
				comparison: ComparisonOperator.Equals,
				value: spanId
			});
		}

		if (Is.stringValue(status)) {
			condition.conditions.push({
				property: "status",
				comparison: ComparisonOperator.Equals,
				value: status
			});
		}

		if (Is.stringValue(kind)) {
			condition.conditions.push({
				property: "kind",
				comparison: ComparisonOperator.Equals,
				value: kind
			});
		}

		if (Is.number(timeStart)) {
			condition.conditions.push({
				property: "startTs",
				comparison: ComparisonOperator.GreaterThanOrEqual,
				value: timeStart
			});
		}

		if (Is.number(timeEnd)) {
			condition.conditions.push({
				property: "startTs",
				comparison: ComparisonOperator.LessThanOrEqual,
				value: timeEnd
			});
		}

		const queryConnector = this._tracingConnector?.query?.bind(this._tracingConnector);
		if (Is.function(queryConnector)) {
			const result = await queryConnector(
				condition,
				[{ property: "startTs", sortDirection: SortDirection.Descending }],
				cursor,
				limit
			);

			return { entities: result.entities, cursor: result.cursor };
		}

		return { entities: [] };
	}

	/**
	 * Get all the spans belonging to a trace, ordered by their start time. The whole trace is paged
	 * into memory; paging is bounded by {@link TracingService.MAX_GET_TRACE_PAGES} as a safeguard
	 * against a pathologically large trace or a non-terminating cursor.
	 * @param traceId The id of the trace to retrieve.
	 * @returns The spans belonging to the trace, ordered by their start time ascending.
	 */
	public async getTrace(traceId: string): Promise<ISpan[]> {
		Guards.stringValue(TracingService.CLASS_NAME, nameof(traceId), traceId);

		const spans: ISpan[] = [];
		let cursor: string | undefined;
		let pages = 0;

		do {
			const result = await this.query(
				traceId,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				cursor
			);
			spans.push(...result.entities);
			cursor = result.cursor;
			pages++;
		} while (Is.stringValue(cursor) && pages < TracingService.MAX_GET_TRACE_PAGES);

		return spans.sort((a, b) => a.startTs - b.startTs);
	}
}
