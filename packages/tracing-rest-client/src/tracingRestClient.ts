// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@twin.org/api-core";
import type { IBaseRestClientConfig, INoContentResponse } from "@twin.org/api-models";
import { Coerce, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import {
	SpanHelper,
	type ISpan,
	type ISpanOptions,
	type ITracingComponent,
	type ITracingGetTraceRequest,
	type ITracingGetTraceResponse,
	type ITracingListRequest,
	type ITracingListResponse,
	type ITracingSpanEndRequest,
	type ITracingSpanStartRequest,
	type ITracingSpanStartResponse,
	type SpanKind,
	type SpanStatus
} from "@twin.org/tracing-models";
import { HttpMethod } from "@twin.org/web";

/**
 * Client for performing tracing through to REST endpoints.
 */
export class TracingRestClient extends BaseRestClient implements ITracingComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingRestClient>();

	/**
	 * Create a new instance of TracingRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(TracingRestClient.CLASS_NAME, config, "tracing");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TracingRestClient.CLASS_NAME;
	}

	/**
	 * Start a new span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(TracingRestClient.CLASS_NAME, nameof(name), name);

		const response = await this.fetch<ITracingSpanStartRequest, ITracingSpanStartResponse>(
			"/",
			HttpMethod.POST,
			{
				body: {
					name,
					options
				}
			}
		);

		return response.body;
	}

	/**
	 * End a span, finalizing its status and duration.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves when the span has been ended.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(TracingRestClient.CLASS_NAME, nameof(span), span);
		Guards.object(TracingRestClient.CLASS_NAME, nameof(span.context), span.context);
		Guards.stringValue(
			TracingRestClient.CLASS_NAME,
			nameof(span.context.spanId),
			span.context.spanId
		);

		// Finalize the caller's span locally (status/endTs/durationMs) so a REST caller's span
		// matches the in-process path; the server honours the resulting endTs carried in the body.
		SpanHelper.endSpan(span, status);

		await this.fetch<ITracingSpanEndRequest, INoContentResponse>("/:spanId", HttpMethod.PUT, {
			pathParams: {
				spanId: span.context.spanId
			},
			body: span
		});
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
		const response = await this.fetch<ITracingListRequest, ITracingListResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					traceId,
					spanId,
					status,
					kind,
					timeStart: Coerce.string(timeStart),
					timeEnd: Coerce.string(timeEnd),
					cursor,
					limit: Coerce.string(limit)
				}
			}
		);

		return response.body;
	}

	/**
	 * Get all the spans belonging to a trace, ordered by their start time.
	 * @param traceId The id of the trace to retrieve.
	 * @returns The spans belonging to the trace, ordered by their start time ascending.
	 */
	public async getTrace(traceId: string): Promise<ISpan[]> {
		Guards.stringValue(TracingRestClient.CLASS_NAME, nameof(traceId), traceId);

		const response = await this.fetch<ITracingGetTraceRequest, ITracingGetTraceResponse>(
			"/trace/:traceId",
			HttpMethod.GET,
			{
				pathParams: {
					traceId
				}
			}
		);

		return response.body.spans;
	}
}
