// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdStore, type IContextIds } from "@twin.org/context";
import { BaseError, Is } from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import { TraceparentHelper } from "./traceparentHelper.js";
import type { ISpan } from "../models/ISpan.js";
import type { ISpanContext } from "../models/ISpanContext.js";
import type { ISpanOptions } from "../models/ISpanOptions.js";
import type { ITracingComponent } from "../models/ITracingComponent.js";
import { SpanAttributes } from "../models/spanAttributes.js";
import { SpanStatus } from "../models/spanStatus.js";
import { TracingContextIdKeys } from "../models/tracingContextIdKeys.js";

/**
 * Helper methods for running operations inside a span.
 */
export class TracingHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingHelper>();

	/**
	 * Run an operation inside a span, ending the span however the operation finishes.
	 *
	 * The parent is taken from the tracing context ids held in the current context, so nested calls
	 * form a tree. Supply `options.parentContext` to override the ambient parent.
	 * @param tracingComponent The tracing component.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @param callback The operation to run.
	 * @param loggingComponent The optional component to log a tracing failure to.
	 * @returns The result of the callback.
	 * @throws Whatever the callback throws, after ending the span with an error status.
	 */
	public static async withSpan<T>(
		tracingComponent: ITracingComponent | undefined,
		name: string,
		options: ISpanOptions | undefined,
		callback: (span?: ISpan) => Promise<T>,
		loggingComponent?: ILoggingComponent
	): Promise<T> {
		if (Is.empty(tracingComponent)) {
			return callback();
		}

		const contextIds = (await ContextIdStore.getContextIds()) ?? {};

		// An explicitly supplied parent always wins, it is a way to reconnect a trace across a
		// boundary the async context cannot cross.
		const parentContext =
			options?.parentContext ?? TracingHelper.spanContextFromContextIds(contextIds);

		let started: ISpan | undefined;

		try {
			started = await tracingComponent.startSpan(name, { ...options, parentContext });
		} catch (err) {
			try {
				await loggingComponent?.log({
					level: "error",
					source: TracingHelper.CLASS_NAME,
					ts: Date.now(),
					message: "startSpanFailed",
					data: { name },
					error: BaseError.fromError(err)
				});
			} catch {
				// There is nowhere left to report a failure to log a failure.
			}
		}

		// A connector which cannot record the span must not stop the work it was recording.
		if (Is.empty(started)) {
			return callback();
		}

		const span = started;

		try {
			const result = await ContextIdStore.run(
				{ ...contextIds, ...TracingHelper.spanContextToContextIds(span.context) },
				async () => callback(span)
			);

			await TracingHelper.endSpan(tracingComponent, span, SpanStatus.Ok, loggingComponent);

			return result;
		} catch (err) {
			span.attributes = {
				...span.attributes,
				[SpanAttributes.ExceptionMessage]: BaseError.fromError(err).message
			};

			await TracingHelper.endSpan(tracingComponent, span, SpanStatus.Error, loggingComponent);

			throw err;
		}
	}

	/**
	 * Get the span context currently in scope.
	 * @returns The span context, or undefined when no span is in scope.
	 */
	public static async getCurrentSpanContext(): Promise<ISpanContext | undefined> {
		const contextIds = (await ContextIdStore.getContextIds()) ?? {};

		return TracingHelper.spanContextFromContextIds(contextIds);
	}

	/**
	 * Build a span context from the tracing context ids.
	 * @param contextIds The context ids to read.
	 * @returns The span context, or undefined when the ids are absent or not valid.
	 */
	public static spanContextFromContextIds(contextIds: IContextIds): ISpanContext | undefined {
		return TraceparentHelper.fromParts(
			contextIds[TracingContextIdKeys.TraceId],
			contextIds[TracingContextIdKeys.SpanId],
			contextIds[TracingContextIdKeys.TraceFlags]
		);
	}

	/**
	 * Map a span context to tracing context ids.
	 * @param spanContext The span context to map.
	 * @returns The context ids for the span.
	 */
	public static spanContextToContextIds(spanContext: ISpanContext): IContextIds {
		const traceparent = TraceparentHelper.format(spanContext);
		const traceFlags = traceparent.slice(traceparent.lastIndexOf("-") + 1);

		return {
			[TracingContextIdKeys.TraceId]: spanContext.traceId,
			[TracingContextIdKeys.SpanId]: spanContext.spanId,
			[TracingContextIdKeys.TraceFlags]: traceFlags
		};
	}

	/**
	 * End a span, logging a failure rather than letting it reach the caller.
	 * @param tracingComponent The component recording the span.
	 * @param span The span to end.
	 * @param status The status to end the span with.
	 * @param loggingComponent The optional component to log a failure to.
	 * @returns Nothing.
	 * @internal
	 */
	private static async endSpan(
		tracingComponent: ITracingComponent,
		span: ISpan,
		status: SpanStatus,
		loggingComponent?: ILoggingComponent
	): Promise<void> {
		try {
			await tracingComponent.endSpan(span, status);
		} catch (err) {
			try {
				await loggingComponent?.log({
					level: "error",
					source: TracingHelper.CLASS_NAME,
					ts: Date.now(),
					message: "endSpanFailed",
					data: { name: span.name },
					error: BaseError.fromError(err)
				});
			} catch {
				// There is nowhere left to report a failure to log a failure.
			}
		}
	}
}
