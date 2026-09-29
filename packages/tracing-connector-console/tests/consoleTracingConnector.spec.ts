// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { SpanHelper, SpanKind, SpanStatus } from "@twin.org/tracing-models";
import { ConsoleTracingConnector } from "../src/consoleTracingConnector.js";

// This spec is intentionally kept in sync with all other tracing connector specs.
// Any test added here should also be added to all other tracing connector specs.
// Use feature flags (e.g. SUPPORTS_QUERY) to skip tests for unsupported features.

const SUPPORTS_QUERY = false;

interface StoredSpan {
	spanId: string;
	traceId: string;
	parentSpanId?: string;
	kind: SpanKind;
	status: SpanStatus;
	startTs: number;
	endTs?: number;
	durationMs?: number;
	attributes?: { [key: string]: unknown };
	events?: { name: string; ts: number; attributes?: { [key: string]: unknown } }[];
	links?: {
		context: { traceId: string; spanId: string; traceFlags: number };
		attributes?: { [key: string]: unknown };
	}[];
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

/**
 * Strips the ANSI colour codes so the payload can be asserted on.
 * @param params The console arguments to flatten.
 * @returns The arguments joined with the escape codes removed.
 */
function plain(params: unknown[]): string {
	// eslint-disable-next-line unicorn/escape-case
	return params.map(p => String(p).replace(/\x1b\[\d+m/g, "")).join(" ");
}

/**
 * Collects the lines written to the console, noting which stream each came from.
 * @returns The captured lines.
 */
function capturedLines(): { text: string; isError: boolean }[] {
	return [
		...logSpy.mock.calls.map((c: unknown[]) => ({ text: plain(c), isError: false })),
		...errorSpy.mock.calls.map((c: unknown[]) => ({ text: plain(c), isError: true }))
	];
}

/**
 * Reconstructs the printed spans. The console is append-only, so a span written more than once
 * is collapsed to its last line, matching the keyed behaviour of the persisting connectors.
 * @returns The spans parsed back out of the console output.
 */
function getStoredSpans(): StoredSpan[] {
	const byId: { [spanId: string]: StoredSpan } = {};

	for (const line of capturedLines()) {
		// SPAN [ts] kind name (12ms) traceId:spanId:parentSpanId {"attr":1} ...
		const match =
			/^SPAN \[(\S+)] (\S+) (\S+)(?: \((\d+)ms\))? ([0-9a-f]{32}):([0-9a-f]{16})(?::([0-9a-f]{16}))?(?: (\{.*?\}))?/.exec(
				line.text
			);
		if (match) {
			byId[match[6]] = {
				spanId: match[6],
				traceId: match[5],
				parentSpanId: match[7],
				kind: match[2] as SpanKind,
				status: line.isError ? SpanStatus.Error : SpanStatus.Ok,
				startTs: 0,
				endTs: new Date(match[1]).getTime(),
				durationMs: match[4] === undefined ? undefined : Number.parseInt(match[4], 10),
				attributes: match[8] === undefined ? undefined : JSON.parse(match[8])
			};
		}
	}

	return Object.values(byId);
}

/**
 * Finds a printed span by its id.
 * @param spanId The id of the span to find.
 * @returns The span, or undefined when it was not printed.
 */
function getStoredSpan(spanId: string): StoredSpan | undefined {
	return getStoredSpans().find(s => s.spanId === spanId);
}

describe("ConsoleTracingConnector", () => {
	beforeEach(() => {
		logSpy = vi.spyOn(globalThis.console, "log").mockImplementation(() => {});
		errorSpy = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe.each([
		{ label: "no context", multiTenant: false, inTenantContext: false },
		{ label: "with context", multiTenant: true, inTenantContext: true },
		{ label: "multi-tenant, no tenant", multiTenant: true, inTenantContext: false }
	])("$label", ({ inTenantContext }) => {
		let connector: ConsoleTracingConnector;

		beforeEach(() => {
			connector = new ConsoleTracingConnector({ config: { includeIds: true } });
		});

		async function runInContext<T>(fn: () => Promise<T>): Promise<T> {
			if (inTenantContext) {
				return ContextIdStore.run(
					{ [ContextIdKeys.Tenant]: "test-tenant", [ContextIdKeys.Node]: "node-1" },
					fn
				);
			}
			return fn();
		}

		test("startSpan mints a valid context and stays open", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("in-flight", { kind: SpanKind.Server })
			);

			expect(span.context.traceId).toMatch(/^[0-9a-f]{32}$/);
			expect(span.context.spanId).toMatch(/^[0-9a-f]{16}$/);
			expect(span.endTs).toBeUndefined();
			expect(span.status).toEqual(SpanStatus.Unset);
			// Nothing is written until the span ends.
			expect(capturedLines()).toHaveLength(0);
		});

		test("startSpan preserves a custom start timestamp", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("timed", { startTs: 1_700_000_000_000 })
			);

			expect(span.startTs).toEqual(1_700_000_000_000);
			expect(span.endTs).toBeUndefined();
		});

		test("startSpan records initial attributes on the span", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("attributed", { attributes: { orderId: "ord-1", count: 3 } })
			);

			expect(span.attributes).toEqual({ orderId: "ord-1", count: 3 });
		});

		test("startSpan records the span kind", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("kindly", { kind: SpanKind.Client })
			);

			expect(span.kind).toEqual(SpanKind.Client);
			await runInContext(async () => connector.endSpan(span));
			expect(getStoredSpans()[0].kind).toEqual(SpanKind.Client);
		});

		test("endSpan closes the span with ok status", async () => {
			const span = await runInContext(async () =>
				connector.startSpan("handle-request", { startTs: 1000 })
			);
			span.attributes = { orderId: "ord-1" };
			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));

			expect(span.status).toEqual(SpanStatus.Ok);
			expect(span.endTs).toBeDefined();

			const stored = getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
			expect(stored[0].durationMs).toBeGreaterThanOrEqual(0);
			expect(stored[0].attributes).toMatchObject({ orderId: "ord-1" });
		});

		test("endSpan closes the span with error status", async () => {
			const span = await runInContext(async () => connector.startSpan("failed"));
			await runInContext(async () => connector.endSpan(span, SpanStatus.Error));

			expect(span.status).toEqual(SpanStatus.Error);
			expect(span.endTs).toBeDefined();
			const stored = getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].status).toEqual(SpanStatus.Error);
		});

		test("endSpan with no status defaults to ok", async () => {
			const span = await runInContext(async () => connector.startSpan("defaulted"));
			await runInContext(async () => connector.endSpan(span));

			expect(span.status).toEqual(SpanStatus.Ok);
			expect(getStoredSpans()[0].status).toEqual(SpanStatus.Ok);
		});

		test("IDs are preserved through start and end", async () => {
			const span = await runInContext(async () => connector.startSpan("kept"));
			const { traceId, spanId } = span.context;
			await runInContext(async () => connector.endSpan(span));

			const stored = getStoredSpan(spanId);
			expect(stored?.traceId).toEqual(traceId);
			expect(stored?.spanId).toEqual(spanId);
		});

		test("child span inherits trace id and records parent span id", async () => {
			const parent = await runInContext(async () => connector.startSpan("parent"));
			const child = await runInContext(async () =>
				connector.startSpan("child", { parentContext: parent.context })
			);
			await runInContext(async () => connector.endSpan(child));

			expect(child.context.traceId).toEqual(parent.context.traceId);
			expect(getStoredSpan(child.context.spanId)?.parentSpanId).toEqual(parent.context.spanId);
		});

		test("root span has no parent span context", async () => {
			const span = await runInContext(async () => connector.startSpan("root"));

			expect(span.parentSpanId).toBeUndefined();
		});

		test("events and links are preserved", async () => {
			const linked = SpanHelper.createContext();
			const span = await runInContext(async () =>
				connector.startSpan("annotated", {
					links: [{ context: linked, attributes: { reason: "retry" } }]
				})
			);
			span.events = [{ name: "cache-miss", ts: 1_700_000_000_000, attributes: { key: "abc" } }];
			await runInContext(async () => connector.endSpan(span));

			expect(span.events[0].name).toEqual("cache-miss");
			expect(span.links?.[0].context.traceId).toEqual(linked.traceId);
		});

		test("endSpan is idempotent across a double end", async () => {
			const span = await runInContext(async () => connector.startSpan("dbl", { startTs: 1000 }));
			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));
			const firstEndTs = span.endTs;
			const firstDuration = span.durationMs;

			await runInContext(async () => connector.endSpan(span, SpanStatus.Ok));

			expect(span.endTs).toEqual(firstEndTs);
			expect(span.durationMs).toEqual(firstDuration);
			expect(getStoredSpans()).toHaveLength(1);
		});

		test("recordSpan handles open and closed spans", async () => {
			const span = SpanHelper.startSpan("recorded", { startTs: 1000 });
			await runInContext(async () => connector.recordSpan(span));

			SpanHelper.endSpan(span, SpanStatus.Ok, 1200);
			await runInContext(async () => connector.recordSpan(span));

			const stored = getStoredSpans();
			expect(stored).toHaveLength(1);
			expect(stored[0].spanId).toEqual(span.context.spanId);
			expect(stored[0].status).toEqual(SpanStatus.Ok);
			expect(stored[0].durationMs).toEqual(200);
		});

		test.skipIf(!SUPPORTS_QUERY)("query returns spans matching a trace id filter", async () => {
			// Not supported, the connector is a pure sink.
		});
	});

	describe("output format", () => {
		let connector: ConsoleTracingConnector;

		beforeEach(() => {
			connector = new ConsoleTracingConnector();
		});

		test("writes one line per completed span", async () => {
			const first = await connector.startSpan("one");
			const second = await connector.startSpan("two");

			await connector.endSpan(first);
			await connector.endSpan(second);

			expect(logSpy).toHaveBeenCalledTimes(2);
			expect(errorSpy).not.toHaveBeenCalled();
		});

		test("writes the name, duration and attributes", async () => {
			const span = await connector.startSpan("notarization/create", {
				attributes: { "notarization.mode": "dynamic" }
			});
			SpanHelper.endSpan(span, SpanStatus.Ok, span.startTs + 42);
			await connector.recordSpan(span);

			const line = plain(logSpy.mock.calls[0]);
			expect(line).toContain("notarization/create");
			expect(line).toContain("(42ms)");
			expect(line).toContain('{"notarization.mode":"dynamic"}');
		});

		test("colorizes the span name with an ANSI escape", async () => {
			const span = await connector.startSpan("coloured");
			await connector.endSpan(span);

			// eslint-disable-next-line unicorn/escape-case
			expect(String(logSpy.mock.calls[0][3])).toEqual("\x1b[36mcoloured\x1b[39m");
		});

		test("writes plain text when colour is disabled", async () => {
			const plainConnector = new ConsoleTracingConnector({ config: { disableColor: true } });
			const span = await plainConnector.startSpan("uncoloured");
			span.attributes = { "exception.message": "test.boom" };
			await plainConnector.endSpan(span, SpanStatus.Error);

			const params = errorSpy.mock.calls[0].map(String);
			expect(params[0]).toEqual("SPAN");
			expect(params[3]).toEqual("uncoloured");
			expect(params[params.length - 1]).toEqual("test.boom");
			expect(params.join(" ")).not.toContain(String.fromCharCode(27));
		});

		test("routes an error span to console.error with the exception message", async () => {
			const span = await connector.startSpan("boom");
			span.attributes = { "exception.message": "test.boom" };
			await connector.endSpan(span, SpanStatus.Error);

			expect(logSpy).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalledTimes(1);
			const line = plain(errorSpy.mock.calls[0]);
			expect(line).toContain("test.boom");
			// The message is written once, not repeated inside the attributes.
			expect(line).not.toContain('{"exception.message"');
		});

		test("recordSpan writes an in-flight span as it stands, leaving it untouched", async () => {
			const span = SpanHelper.startSpan("still-running", { startTs: 1000 });

			await connector.recordSpan(span);

			expect(span.endTs).toBeUndefined();
			expect(span.durationMs).toBeUndefined();
			expect(span.status).toEqual(SpanStatus.Unset);

			const line = plain(logSpy.mock.calls[0]);
			expect(line).toContain("still-running");
			expect(line).not.toContain("ms)");
		});

		test("omits the ids unless they are asked for", async () => {
			const span = await connector.startSpan("no-ids");
			await connector.endSpan(span);

			expect(plain(logSpy.mock.calls[0])).not.toContain(span.context.traceId);
		});

		test("writes nothing when the configured kinds are empty", async () => {
			const filtered = new ConsoleTracingConnector({ config: { kinds: [] } });

			await filtered.endSpan(await filtered.startSpan("silenced"));

			expect(capturedLines()).toHaveLength(0);
		});

		test("writes only the configured kinds", async () => {
			const filtered = new ConsoleTracingConnector({ config: { kinds: [SpanKind.Server] } });

			const server = await filtered.startSpan("served", { kind: SpanKind.Server });
			const internal = await filtered.startSpan("internal", { kind: SpanKind.Internal });
			await filtered.endSpan(server);
			await filtered.endSpan(internal);

			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(plain(logSpy.mock.calls[0])).toContain("served");
		});
	});
});
