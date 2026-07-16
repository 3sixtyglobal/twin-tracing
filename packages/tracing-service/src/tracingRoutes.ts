// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IHttpRequestContext,
	INoContentResponse,
	IRestRoute,
	ITag
} from "@twin.org/api-models";
import { Coerce, ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import type {
	ITracingComponent,
	ITracingGetTraceRequest,
	ITracingGetTraceResponse,
	ITracingListRequest,
	ITracingListResponse,
	ITracingSpanEndRequest,
	ITracingSpanStartRequest,
	ITracingSpanStartResponse
} from "@twin.org/tracing-models";
import { HttpStatusCode } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "tracingRoutes";

/**
 * Example trace id used in the route documentation.
 */
const EXAMPLE_TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";

/**
 * Example span id used in the route documentation.
 */
const EXAMPLE_SPAN_ID = "00f067aa0ba902b7";

/**
 * The tag to associate with the routes.
 */
export const tagsTracing: ITag[] = [
	{
		name: "Tracing",
		description: "Endpoints which are modelled to access a tracing contract."
	}
];

/**
 * The REST routes for tracing.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesTracing(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const spanStartRoute: IRestRoute<ITracingSpanStartRequest, ITracingSpanStartResponse> = {
		operationId: "tracingSpanStart",
		summary: "Start a span",
		tag: tagsTracing[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			tracingSpanStart(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITracingSpanStartRequest>(),
			examples: [
				{
					id: "tracingSpanStartRequestExample",
					request: {
						body: {
							name: "process-order",
							options: {
								kind: "internal"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ITracingSpanStartResponse>(),
				examples: [
					{
						id: "tracingSpanStartResponseExample",
						response: {
							body: {
								name: "process-order",
								kind: "internal",
								status: "unset",
								context: {
									traceId: EXAMPLE_TRACE_ID,
									spanId: EXAMPLE_SPAN_ID,
									traceFlags: 1
								},
								startTs: 1715252922273
							}
						}
					}
				]
			}
		]
	};

	const spanEndRoute: IRestRoute<ITracingSpanEndRequest, INoContentResponse> = {
		operationId: "tracingSpanEnd",
		summary: "End a span",
		tag: tagsTracing[0].name,
		method: "PUT",
		path: `${baseRouteName}/:spanId`,
		handler: async (httpRequestContext, request) =>
			tracingSpanEnd(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITracingSpanEndRequest>(),
			examples: [
				{
					id: "tracingSpanEndRequestExample",
					request: {
						pathParams: {
							spanId: EXAMPLE_SPAN_ID
						},
						body: {
							name: "process-order",
							kind: "internal",
							status: "ok",
							context: {
								traceId: EXAMPLE_TRACE_ID,
								spanId: EXAMPLE_SPAN_ID,
								traceFlags: 1
							},
							startTs: 1715252922273,
							endTs: 1715252922512,
							durationMs: 239
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	const listRoute: IRestRoute<ITracingListRequest, ITracingListResponse> = {
		operationId: "tracingListSpans",
		summary: "Get a list of the spans",
		tag: tagsTracing[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			tracingList(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITracingListRequest>(),
			examples: [
				{
					id: "tracingListRequestExample",
					request: {
						query: {
							traceId: EXAMPLE_TRACE_ID
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ITracingListResponse>(),
				examples: [
					{
						id: "tracingListResponseExample",
						response: {
							body: {
								entities: [
									{
										name: "process-order",
										kind: "internal",
										status: "ok",
										context: {
											traceId: EXAMPLE_TRACE_ID,
											spanId: EXAMPLE_SPAN_ID,
											traceFlags: 1
										},
										startTs: 1715252922273,
										endTs: 1715252922512,
										durationMs: 239
									}
								],
								cursor: "1"
							}
						}
					}
				]
			}
		]
	};

	const getTraceRoute: IRestRoute<ITracingGetTraceRequest, ITracingGetTraceResponse> = {
		operationId: "tracingGetTrace",
		summary: "Get all the spans belonging to a trace",
		tag: tagsTracing[0].name,
		method: "GET",
		path: `${baseRouteName}/trace/:traceId`,
		handler: async (httpRequestContext, request) =>
			tracingGetTrace(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITracingGetTraceRequest>(),
			examples: [
				{
					id: "tracingGetTraceRequestExample",
					request: {
						pathParams: {
							traceId: EXAMPLE_TRACE_ID
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ITracingGetTraceResponse>(),
				examples: [
					{
						id: "tracingGetTraceResponseExample",
						response: {
							body: {
								spans: [
									{
										name: "process-order",
										kind: "internal",
										status: "ok",
										context: {
											traceId: EXAMPLE_TRACE_ID,
											spanId: EXAMPLE_SPAN_ID,
											traceFlags: 1
										},
										startTs: 1715252922273,
										endTs: 1715252922512,
										durationMs: 239
									}
								]
							}
						}
					}
				]
			}
		]
	};

	return [spanStartRoute, spanEndRoute, listRoute, getTraceRoute];
}

/**
 * Start a new span.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns A promise that resolves to the started span.
 */
export async function tracingSpanStart(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITracingSpanStartRequest
): Promise<ITracingSpanStartResponse> {
	Guards.object<ITracingSpanStartRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<ITracingSpanStartRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.body.name), request.body.name);

	const component = ComponentFactory.get<ITracingComponent>(componentName);
	const span = await component.startSpan(request.body.name, request.body.options);

	return {
		body: span
	};
}

/**
 * End a span.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns A promise that resolves to a no-content response when the span has been ended.
 */
export async function tracingSpanEnd(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITracingSpanEndRequest
): Promise<INoContentResponse> {
	Guards.object<ITracingSpanEndRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<ITracingSpanEndRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.spanId), request.pathParams.spanId);
	Guards.object<ITracingSpanEndRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<ITracingComponent>(componentName);
	await component.endSpan(request.body);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get a list of the spans.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns A promise that resolves to the matching spans and an optional pagination cursor.
 */
export async function tracingList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITracingListRequest
): Promise<ITracingListResponse> {
	const component = ComponentFactory.get<ITracingComponent>(componentName);

	const itemsAndCursor = await component.query(
		request?.query?.traceId,
		request?.query?.spanId,
		request?.query?.status,
		request?.query?.kind,
		Coerce.number(request?.query?.timeStart),
		Coerce.number(request?.query?.timeEnd),
		request?.query?.cursor,
		Coerce.number(request?.query?.limit)
	);

	return {
		body: itemsAndCursor
	};
}

/**
 * Get all the spans belonging to a trace.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns A promise that resolves to the spans belonging to the trace.
 */
export async function tracingGetTrace(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITracingGetTraceRequest
): Promise<ITracingGetTraceResponse> {
	Guards.object<ITracingGetTraceRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<ITracingGetTraceRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.traceId), request.pathParams.traceId);

	const component = ComponentFactory.get<ITracingComponent>(componentName);
	const spans = await component.getTrace(request.pathParams.traceId);

	return {
		body: {
			spans
		}
	};
}
