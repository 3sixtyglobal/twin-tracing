// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestClientProcessor, IRestClientProcessorContext } from "@twin.org/api-models";
import { ComponentFactory, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import {
	SpanKind,
	TraceparentHelper,
	TracingHelper,
	type ITracingComponent
} from "@twin.org/tracing-models";
import { HttpStatusCode } from "@twin.org/web";
import { HttpSpanAttributes } from "./models/httpSpanAttributes.js";
import type { ITracingRestClientProcessorConstructorOptions } from "./models/ITracingRestClientProcessorConstructorOptions.js";

/**
 * Records a span for each outbound REST request and carries the trace via traceparent header.
 */
export class TracingRestClientProcessor implements IRestClientProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingRestClientProcessor>();

	/**
	 * The component recording the spans.
	 * @internal
	 */
	private readonly _tracing?: ITracingComponent;

	/**
	 * The component for logging a tracing failure.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Route templates to skip tracing.
	 * @internal
	 */
	private readonly _excludeRouteTemplates: string[];

	/**
	 * Create a new instance of TracingRestClientProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ITracingRestClientProcessorConstructorOptions) {
		this._tracing = ComponentFactory.getIfExists(options?.tracingComponentType);
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType);
		this._excludeRouteTemplates = options?.config?.excludePaths ?? [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TracingRestClientProcessor.CLASS_NAME;
	}

	/**
	 * Wrap the request in a client span, sending the current span as the traceparent so the
	 * receiving service continues this trace.
	 * @param context The details of the request being made.
	 * @param next Performs the request.
	 * @returns The response.
	 */
	public async pre(
		context: IRestClientProcessorContext,
		next: () => Promise<Response>
	): Promise<Response> {
		if (Is.empty(this._tracing) || this._excludeRouteTemplates.includes(context.routeTemplate)) {
			return next();
		}

		return TracingHelper.withSpan(
			this._tracing,
			`${context.restClientClassName}${context.route.startsWith("/") ? "" : "/"}${context.route}`,
			{
				kind: SpanKind.Client,
				attributes: {
					[HttpSpanAttributes.HttpMethod]: context.method,
					[HttpSpanAttributes.HttpRoute]: context.route
				}
			},
			async span => {
				if (!Is.empty(span)) {
					context.headers[TraceparentHelper.HEADER_NAME] = TraceparentHelper.format(span.context);
				}

				const response = await next();

				if (!Is.empty(span)) {
					span.attributes = {
						...span.attributes,
						[HttpSpanAttributes.HttpStatusCode]: response.status ?? HttpStatusCode.ok
					};
				}

				return response;
			},
			this._logging
		);
	}
}
