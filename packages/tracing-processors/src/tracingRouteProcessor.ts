// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IBaseRoute,
	IBaseRouteProcessor,
	IHttpResponse,
	IHttpServerRequest
} from "@twin.org/api-models";
import type { IContextIds } from "@twin.org/context";
import { BaseError, Coerce, ComponentFactory, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import {
	SpanKind,
	SpanStatus,
	TraceparentHelper,
	TracingHelper,
	type ISpan,
	type ITracingComponent
} from "@twin.org/tracing-models";
import { HttpStatusCode } from "@twin.org/web";
import type { ITracingRouteProcessorConstructorOptions } from "./models/ITracingRouteProcessorConstructorOptions.js";

/**
 * Process the REST request and record it as a span.
 */
export class TracingRouteProcessor implements IBaseRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingRouteProcessor>();

	/**
	 * The key the span is stored under while it is handed between the processor phases.
	 * @internal
	 */
	private static readonly _STATE_KEY: string = "tracingProcessorSpan";

	/**
	 * The component for recording the spans.
	 * @internal
	 */
	private readonly _tracing?: ITracingComponent;

	/**
	 * The component for logging failures.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Request URL path prefixes to skip tracing, defaults to ["/tracing"].
	 * @internal
	 */
	private readonly _excludePaths: string[];

	/**
	 * Route operation IDs to skip tracing.
	 * @internal
	 */
	private readonly _excludeOperationIds: string[];

	/**
	 * Create a new instance of TracingRouteProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ITracingRouteProcessorConstructorOptions) {
		this._tracing = ComponentFactory.getIfExists(options?.tracingComponentType);
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType);
		this._excludePaths = options?.config?.excludePaths ?? ["/tracing"];
		this._excludeOperationIds = options?.config?.excludeOperationIds ?? [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TracingRouteProcessor.CLASS_NAME;
	}

	/**
	 * Pre process the REST request for the specified route, opening the span for the request.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the span has been started.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if (Is.empty(this._tracing)) {
			return;
		}

		// Don't want to run tracing on routes without auth as we have no
		// tenancy context to record the span against, and it will just create noise in the traces.
		// this is usually endpoints like /health, /metrics, etc. that are not part of the business logic of the service.
		if (route?.skipAuth ?? false) {
			return;
		}

		if (Is.stringValue(route?.path) && this._excludePaths.includes(route.path)) {
			return;
		}
		if (
			Is.stringValue(route?.operationId) &&
			this._excludeOperationIds.includes(route.operationId)
		) {
			return;
		}

		const parentContext = TraceparentHelper.parse(
			Coerce.string(request.headers?.[TraceparentHelper.HEADER_NAME])
		);

		try {
			const span = await this._tracing.startSpan(this.spanName(request, route), {
				kind: SpanKind.Server,
				parentContext,
				attributes: this.requestAttributes(request, route)
			});

			processorState[TracingRouteProcessor._STATE_KEY] = span;

			Object.assign(contextIds, TracingHelper.spanContextToContextIds(span.context));
		} catch (err) {
			await this._logging?.log({
				level: "error",
				source: TracingRouteProcessor.CLASS_NAME,
				ts: Date.now(),
				message: "startSpanFailed",
				error: BaseError.fromError(err)
			});
		}
	}

	/**
	 * Post process the REST request for the specified route, ending the span for the request.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the span has been ended.
	 */
	public async post(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		const span = processorState[TracingRouteProcessor._STATE_KEY];

		if (Is.empty(this._tracing) || !Is.object<ISpan>(span)) {
			return;
		}

		delete processorState[TracingRouteProcessor._STATE_KEY];

		try {
			const statusCode = Is.number(response.statusCode) ? response.statusCode : HttpStatusCode.ok;

			span.attributes = { ...span.attributes, "http.status_code": statusCode };

			await this._tracing.endSpan(
				span,
				statusCode >= HttpStatusCode.badRequest ? SpanStatus.Error : SpanStatus.Ok
			);
		} catch (err) {
			await this._logging?.log({
				level: "error",
				source: TracingRouteProcessor.CLASS_NAME,
				ts: Date.now(),
				message: "endSpanFailed",
				error: BaseError.fromError(err)
			});
		}
	}

	/**
	 * Build the name for the span.
	 * @param request The incoming request.
	 * @param route The route to process.
	 * @returns The span name.
	 * @internal
	 */
	private spanName(request: IHttpServerRequest, route: IBaseRoute | undefined): string {
		const routeName = route?.operationId ?? route?.path;

		return Is.stringValue(routeName)
			? routeName
			: `${request.method ?? "UNKNOWN"} ${TracingRouteProcessor.CLASS_NAME}`;
	}

	/**
	 * Build the attributes describing the request.
	 * @param request The incoming request.
	 * @param route The route to process.
	 * @returns The attributes.
	 * @internal
	 */
	private requestAttributes(
		request: IHttpServerRequest,
		route: IBaseRoute | undefined
	): { [key: string]: unknown } {
		const attributes: { [key: string]: unknown } = {};

		if (Is.stringValue(request.method)) {
			attributes["http.method"] = request.method;
		}
		if (Is.stringValue(route?.path)) {
			attributes["http.route"] = route.path;
		}

		return attributes;
	}
}
