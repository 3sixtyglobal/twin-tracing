// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@3sixty/core";
import { MultiTracingConnector } from "../src/connectors/multiTracingConnector.js";
import { TracingConnectorFactory } from "../src/factories/tracingConnectorFactory.js";
import { SpanHelper } from "../src/helpers/spanHelper.js";
import type { ISpan } from "../src/models/ISpan.js";
import type { ISpanOptions } from "../src/models/ISpanOptions.js";
import type { ITracingConnector } from "../src/models/ITracingConnector.js";
import { SpanStatus } from "../src/models/spanStatus.js";

/**
 * Child connector that captures a snapshot of every recorded span and supports querying.
 */
class RecordingTracingConnector implements ITracingConnector {
	public readonly recorded: ISpan[];

	public queryCalls: number;

	constructor() {
		this.recorded = [];
		this.queryCalls = 0;
	}

	public className(): string {
		return "RecordingTracingConnector";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		return SpanHelper.startSpan(name, options);
	}

	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		SpanHelper.endSpan(span, status);
	}

	public async recordSpan(span: ISpan): Promise<void> {
		this.recorded.push(structuredClone(span));
	}

	public async query(): Promise<{ entities: ISpan[]; cursor?: string }> {
		this.queryCalls++;
		return { entities: this.recorded };
	}
}

/**
 * Child connector that records spans but does not support querying.
 */
class NoQueryTracingConnector implements ITracingConnector {
	public className(): string {
		return "NoQueryTracingConnector";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		return SpanHelper.startSpan(name, options);
	}

	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		SpanHelper.endSpan(span, status);
	}

	public async recordSpan(): Promise<void> {}
}

describe("MultiTracingConnector", () => {
	test("throws when options are missing", async () => {
		expect(() => new MultiTracingConnector(undefined as never)).toThrow(GuardError);
	});

	test("throws when tracingConnectorTypes is empty", async () => {
		expect(() => new MultiTracingConnector({ tracingConnectorTypes: [] })).toThrow(GuardError);
	});

	test("startSpan mints once and records the open span on every child", async () => {
		const a = new RecordingTracingConnector();
		const b = new RecordingTracingConnector();
		TracingConnectorFactory.register("multi-start-a", () => a);
		TracingConnectorFactory.register("multi-start-b", () => b);
		const multi = new MultiTracingConnector({
			tracingConnectorTypes: ["multi-start-a", "multi-start-b"]
		});

		const span = await multi.startSpan("work");

		expect(a.recorded).toHaveLength(1);
		expect(b.recorded).toHaveLength(1);
		expect(a.recorded[0].context.spanId).toEqual(span.context.spanId);
		expect(b.recorded[0].context.spanId).toEqual(span.context.spanId);
		expect(a.recorded[0].status).toEqual(SpanStatus.Unset);
		expect(a.recorded[0].endTs).toBeUndefined();
	});

	test("endSpan records the completed span on every child", async () => {
		const a = new RecordingTracingConnector();
		TracingConnectorFactory.register("multi-end-a", () => a);
		const multi = new MultiTracingConnector({ tracingConnectorTypes: ["multi-end-a"] });

		const span = await multi.startSpan("work");
		await multi.endSpan(span, SpanStatus.Ok);

		expect(a.recorded).toHaveLength(2);
		expect(a.recorded[1].status).toEqual(SpanStatus.Ok);
		expect(a.recorded[1].endTs).toBeDefined();
		expect(a.recorded[1].context.spanId).toEqual(span.context.spanId);
	});

	test("query uses the first child that supports it", async () => {
		const noq = new NoQueryTracingConnector();
		const rec = new RecordingTracingConnector();
		TracingConnectorFactory.register("multi-query-noq", () => noq);
		TracingConnectorFactory.register("multi-query-rec", () => rec);
		const multi = new MultiTracingConnector({
			tracingConnectorTypes: ["multi-query-noq", "multi-query-rec"]
		});

		const span = await multi.startSpan("q");
		const result = await multi.query();

		expect(rec.queryCalls).toEqual(1);
		expect(result.entities).toHaveLength(1);
		expect(result.entities[0].context.spanId).toEqual(span.context.spanId);
	});

	test("endSpan is idempotent across a double end", async () => {
		const a = new RecordingTracingConnector();
		TracingConnectorFactory.register("multi-idem-a", () => a);
		const multi = new MultiTracingConnector({ tracingConnectorTypes: ["multi-idem-a"] });

		const span = await multi.startSpan("work", { startTs: 1000 });
		await multi.endSpan(span, SpanStatus.Ok);
		const firstEndTs = span.endTs;
		await multi.endSpan(span, SpanStatus.Ok);

		expect(span.endTs).toEqual(firstEndTs);
	});
});
