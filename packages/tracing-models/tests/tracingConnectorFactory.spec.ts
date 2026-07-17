// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SilentTracingConnector } from "../src/connectors/silentTracingConnector.js";
import { TracingConnectorFactory } from "../src/factories/tracingConnectorFactory.js";
import { SpanHelper } from "../src/helpers/spanHelper.js";
import { SpanKind } from "../src/models/spanKind.js";
import { SpanStatus } from "../src/models/spanStatus.js";

describe("TracingConnectorFactory", () => {
	test("can register and resolve a connector by namespace", async () => {
		TracingConnectorFactory.register(
			SilentTracingConnector.NAMESPACE,
			() => new SilentTracingConnector()
		);

		const connector = TracingConnectorFactory.get(SilentTracingConnector.NAMESPACE);
		expect(connector).toBeDefined();
		expect(connector.className()).toEqual(SilentTracingConnector.CLASS_NAME);
	});
});

describe("SpanHelper", () => {
	test("createContext mints a new W3C formatted context", async () => {
		const context = SpanHelper.createContext();
		expect(context.traceId).toMatch(/^[0-9a-f]{32}$/);
		expect(context.spanId).toMatch(/^[0-9a-f]{16}$/);
		expect(context.traceFlags).toEqual(SpanHelper.TRACE_FLAG_SAMPLED);
	});

	test("createContext inherits the trace id from a parent context", async () => {
		const parent = SpanHelper.createContext();
		const child = SpanHelper.createContext(parent);
		expect(child.traceId).toEqual(parent.traceId);
		expect(child.spanId).not.toEqual(parent.spanId);
	});

	test("startSpan builds an in-flight span with defaults", async () => {
		const span = SpanHelper.startSpan("do-work");
		expect(span.name).toEqual("do-work");
		expect(span.kind).toEqual(SpanKind.Internal);
		expect(span.status).toEqual(SpanStatus.Unset);
		expect(span.endTs).toBeUndefined();
		expect(span.parentSpanId).toBeUndefined();
	});

	test("startSpan sets the parent span id from the parent context", async () => {
		const parent = SpanHelper.createContext();
		const span = SpanHelper.startSpan("child", { parentContext: parent, kind: SpanKind.Client });
		expect(span.kind).toEqual(SpanKind.Client);
		expect(span.context.traceId).toEqual(parent.traceId);
		expect(span.parentSpanId).toEqual(parent.spanId);
	});

	test("endSpan finalizes status, end time and duration", async () => {
		const span = SpanHelper.startSpan("do-work", { startTs: 1000 });
		SpanHelper.endSpan(span, SpanStatus.Ok, 1250);
		expect(span.status).toEqual(SpanStatus.Ok);
		expect(span.endTs).toEqual(1250);
		expect(span.durationMs).toEqual(250);
	});

	test("endSpan defaults an unset status to ok", async () => {
		const span = SpanHelper.startSpan("do-work");
		SpanHelper.endSpan(span);
		expect(span.status).toEqual(SpanStatus.Ok);
	});

	test("endSpan honours an already-set endTs (idempotent double end)", async () => {
		const span = SpanHelper.startSpan("do-work", { startTs: 1000 });
		SpanHelper.endSpan(span, SpanStatus.Ok, 1250);
		SpanHelper.endSpan(span, SpanStatus.Ok);
		expect(span.endTs).toEqual(1250);
		expect(span.durationMs).toEqual(250);
	});

	test("endSpan clamps a negative duration to zero", async () => {
		const span = SpanHelper.startSpan("do-work", { startTs: 2000 });
		SpanHelper.endSpan(span, SpanStatus.Ok, 1000);
		expect(span.durationMs).toEqual(0);
	});

	test("createContext rejects a malformed parent trace id", async () => {
		expect(() =>
			SpanHelper.createContext({ traceId: "not-hex", spanId: "00f067aa0ba902b7", traceFlags: 1 })
		).toThrow();
	});

	test("createContext rejects an out-of-range traceFlags", async () => {
		expect(() =>
			SpanHelper.createContext({
				traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
				spanId: "00f067aa0ba902b7",
				traceFlags: 999
			})
		).toThrow();
	});
});

describe("SilentTracingConnector", () => {
	test("startSpan mints a context and endSpan discards without querying", async () => {
		const connector = new SilentTracingConnector();
		const span = await connector.startSpan("silent-work");
		expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);

		await connector.endSpan(span, SpanStatus.Error);
		expect(span.status).toEqual(SpanStatus.Error);

		const result = await connector.query();
		expect(result.entities).toEqual([]);
	});
});
