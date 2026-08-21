// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { SpanHelper } from "../helpers/spanHelper.js";
import type { ISpan } from "../models/ISpan.js";
import type { ISpanOptions } from "../models/ISpanOptions.js";
import type { ITracingConnector } from "../models/ITracingConnector.js";
import type { SpanStatus } from "../models/spanStatus.js";

/**
 * Class for performing tracing operations to nowhere.
 */
export class SilentTracingConnector implements ITracingConnector {
	/**
	 * The namespace for the tracing connector.
	 */
	public static readonly NAMESPACE: string = "silent";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<SilentTracingConnector>();

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return SilentTracingConnector.CLASS_NAME;
	}

	/**
	 * Start a new span.
	 * @param name The name of the span.
	 * @param options The options for the span.
	 * @returns The started span, including its minted context.
	 */
	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		Guards.stringValue(SilentTracingConnector.CLASS_NAME, nameof(name), name);
		return SpanHelper.startSpan(name, options);
	}

	/**
	 * End a span, finalizing its status and duration.
	 * @param span The span to end.
	 * @param status The status to set on the span, defaults to ok.
	 * @returns A promise that resolves immediately without persisting the span.
	 */
	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		Guards.object<ISpan>(SilentTracingConnector.CLASS_NAME, nameof(span), span);
		SpanHelper.endSpan(span, status);
	}
}
