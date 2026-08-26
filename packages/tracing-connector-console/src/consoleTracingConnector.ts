// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Guards, Is, ObjectHelper } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import {
	SpanAttributes,
	SpanHelper,
	SpanKind,
	SpanStatus,
	type ISpan,
	type ISpanOptions,
	type ITracingConnector
} from "@twin.org/tracing-models";
import type { IConsoleTracingConnectorConstructorOptions } from "./models/IConsoleTracingConnectorConstructorOptions.js";

/**
 * Class for writing spans to the console, intended for development and debugging.
 *
 * The connector is a pure sink, it does not persist spans and therefore does not implement `query()`.
 */
export class ConsoleTracingConnector implements ITracingConnector {
	/**
	 * The namespace for the tracing connector.
	 */
	public static readonly NAMESPACE: string = "console";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<ConsoleTracingConnector>();

	/**
	 * Colors for highlighting.
	 * @internal
	 */
	private static readonly _COLORS: { [id: string]: number } = {
		blue: 34,
		cyan: 36,
		green: 32,
		magenta: 35,
		red: 31
	};

	/**
	 * The span kinds to display, will default to all.
	 * @internal
	 */
	private readonly _kinds: SpanKind[];

	/**
	 * Include the trace and span ids in the output.
	 * @internal
	 */
	private readonly _includeIds: boolean;

	/**
	 * Create a new instance of ConsoleTracingConnector.
	 * @param options The options for the tracing connector.
	 */
	constructor(options?: IConsoleTracingConnectorConstructorOptions) {
		this._kinds = options?.config?.kinds ?? Object.values(SpanKind);
		this._includeIds = options?.config?.includeIds ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return ConsoleTracingConnector.CLASS_NAME;
	}

	/**
	 * Start a span, which produces no output since there is nothing to report until it ends.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The span with a minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(ConsoleTracingConnector.CLASS_NAME, nameof(name), name);

		return SpanHelper.startSpan(name, options);
	}

	/**
	 * End a span and write it to the console.
	 * @param span The span to end.
	 * @param status The status to end the span with.
	 * @returns A promise that resolves when the span has been written.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(ConsoleTracingConnector.CLASS_NAME, nameof(span), span);
		Guards.object(ConsoleTracingConnector.CLASS_NAME, nameof(span.context), span.context);
		Guards.stringValue(
			ConsoleTracingConnector.CLASS_NAME,
			nameof(span.context.spanId),
			span.context.spanId
		);

		SpanHelper.endSpan(span, status);

		this.write(span);
	}

	/**
	 * Write a span to the console. The span is recorded verbatim, never finalized here, so one
	 * which is still in flight is written without a duration.
	 * @param span The span to record.
	 * @returns A promise that resolves when the span has been written.
	 */
	public async recordSpan(span: ISpan): Promise<void> {
		Guards.object<ISpan>(ConsoleTracingConnector.CLASS_NAME, nameof(span), span);
		Guards.object(ConsoleTracingConnector.CLASS_NAME, nameof(span.context), span.context);
		Guards.stringValue(
			ConsoleTracingConnector.CLASS_NAME,
			nameof(span.context.spanId),
			span.context.spanId
		);

		this.write(span);
	}

	/**
	 * Write the span as a single line, errors going to console.error so they can be filtered.
	 * @param span The span to write.
	 * @internal
	 */
	private write(span: ISpan): void {
		if (!this._kinds.includes(span.kind)) {
			return;
		}

		const isError = span.status === SpanStatus.Error;
		const params: unknown[] = [
			this.colorize("SPAN", isError ? "red" : "green"),
			this.colorize(`[${new Date(span.endTs ?? span.startTs).toISOString()}]`, "magenta"),
			this.colorize(span.kind, "blue"),
			this.colorize(span.name, "cyan")
		];

		if (!Is.undefined(span.durationMs)) {
			params.push(this.colorize(`(${span.durationMs}ms)`, "magenta"));
		}

		if (this._includeIds) {
			const parent = Is.stringValue(span.parentSpanId) ? `:${span.parentSpanId}` : "";
			params.push(this.colorize(`${span.context.traceId}:${span.context.spanId}${parent}`, "blue"));
		}

		const message = isError ? span.attributes?.[SpanAttributes.ExceptionMessage] : undefined;
		const hasMessage = Is.stringValue(message);

		const attributes = hasMessage
			? ObjectHelper.omit(span.attributes, [SpanAttributes.ExceptionMessage])
			: span.attributes;

		if (Is.objectValue(attributes)) {
			params.push(JSON.stringify(attributes));
		}

		if (isError) {
			if (hasMessage) {
				params.push(this.colorize(message, "red"));
			}
			globalThis.console.error(...params);
		} else {
			globalThis.console.log(...params);
		}
	}

	/**
	 * Add color to a string.
	 * @param message The string to colorize.
	 * @param color The color to use.
	 * @returns The colorized string.
	 * @internal
	 */
	private colorize(message: string, color: "blue" | "cyan" | "green" | "magenta" | "red"): string {
		// eslint-disable-next-line unicorn/escape-case
		return `\x1b[${ConsoleTracingConnector._COLORS[color]}m${message}\x1b[39m`;
	}
}
