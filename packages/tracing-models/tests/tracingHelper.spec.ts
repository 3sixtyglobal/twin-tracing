// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@twin.org/context";
import { GeneralError } from "@twin.org/core";
import { SpanHelper } from "../src/helpers/spanHelper.js";
import { TraceparentHelper } from "../src/helpers/traceparentHelper.js";
import { TracingHelper } from "../src/helpers/tracingHelper.js";
import type { ISpan } from "../src/models/ISpan.js";
import type { ISpanContext } from "../src/models/ISpanContext.js";
import type { ISpanOptions } from "../src/models/ISpanOptions.js";
import type { ITracingComponent } from "../src/models/ITracingComponent.js";
import { SpanKind } from "../src/models/spanKind.js";
import { SpanStatus } from "../src/models/spanStatus.js";
import { TracingContextIdKeys } from "../src/models/tracingContextIdKeys.js";

let ended: ISpan[] = [];

// Records the spans it ends, query and getTrace only exist to satisfy the interface.
class TestTracingComponent implements ITracingComponent {
	public className(): string {
		return "TestTracingComponent";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		return SpanHelper.startSpan(name, options);
	}

	public async endSpan(span: ISpan, status?: SpanStatus): Promise<void> {
		SpanHelper.endSpan(span, status);
		ended.push(span);
	}

	public async query(): Promise<{ entities: ISpan[]; cursor?: string }> {
		return { entities: [] };
	}

	public async getTrace(): Promise<ISpan[]> {
		return [];
	}
}

function findSpan(name: string): ISpan {
	const span = ended.find(s => s.name === name);
	expect(span).toBeDefined();
	return span as ISpan;
}

describe("TracingHelper", () => {
	let tracing: TestTracingComponent;

	beforeEach(() => {
		ended = [];
		tracing = new TestTracingComponent();
	});

	test("runs the callback and returns its result", async () => {
		const result = await TracingHelper.withSpan(tracing, "op", undefined, async () => "value");

		expect(result).toEqual("value");
		expect(ended).toHaveLength(1);
	});

	test("runs the callback with no span when there is no tracing component", async () => {
		let received: ISpan | undefined = {} as ISpan;

		const result = await TracingHelper.withSpan(undefined, "op", undefined, async span => {
			received = span;
			return "value";
		});

		expect(result).toEqual("value");
		expect(received).toBeUndefined();
		expect(ended).toHaveLength(0);
	});

	test("ends the span with ok when the callback succeeds", async () => {
		await TracingHelper.withSpan(tracing, "op", undefined, async () => undefined);

		expect(ended[0].status).toEqual(SpanStatus.Ok);
		expect(ended[0].endTs).toBeDefined();
	});

	test("ends the span with error and rethrows when the callback throws", async () => {
		await expect(
			TracingHelper.withSpan(tracing, "op", undefined, async () => {
				throw new GeneralError("test", "boom");
			})
		).rejects.toThrow(GeneralError);

		expect(ended).toHaveLength(1);
		expect(ended[0].status).toEqual(SpanStatus.Error);
		expect(ended[0].attributes?.["exception.message"]).toEqual("test.boom");
	});

	test("passes the span to the callback and honours the supplied options", async () => {
		let seen: ISpan | undefined;

		await TracingHelper.withSpan(
			tracing,
			"op",
			{ kind: SpanKind.Server, attributes: { "http.method": "GET" } },
			async span => {
				seen = span;
			}
		);

		expect(seen?.name).toEqual("op");
		expect(seen?.kind).toEqual(SpanKind.Server);
		expect(seen?.attributes?.["http.method"]).toEqual("GET");
	});

	test("nests spans so each is a child of the one enclosing it", async () => {
		await TracingHelper.withSpan(tracing, "A", undefined, async () =>
			TracingHelper.withSpan(tracing, "B", undefined, async () =>
				TracingHelper.withSpan(tracing, "C", undefined, async () => undefined)
			)
		);

		const a = findSpan("A");
		const b = findSpan("B");
		const c = findSpan("C");

		expect(a.parentSpanId).toBeUndefined();
		expect(b.parentSpanId).toEqual(a.context.spanId);
		expect(c.parentSpanId).toEqual(b.context.spanId);
		expect(new Set([a, b, c].map(s => s.context.traceId)).size).toEqual(1);
	});

	test("makes sequential calls siblings rather than a chain", async () => {
		await TracingHelper.withSpan(tracing, "A", undefined, async () => {
			await TracingHelper.withSpan(tracing, "B", undefined, async () => undefined);
			await TracingHelper.withSpan(tracing, "D", undefined, async () => undefined);
		});

		expect(findSpan("B").parentSpanId).toEqual(findSpan("A").context.spanId);
		expect(findSpan("D").parentSpanId).toEqual(findSpan("A").context.spanId);
	});

	test("keeps parents correct when branches run concurrently and interleave", async () => {
		await TracingHelper.withSpan(tracing, "A", undefined, async () => {
			await Promise.all([
				TracingHelper.withSpan(tracing, "B", undefined, async () => {
					// B is slower, so D starts and finishes while B is still open.
					await new Promise(resolve => {
						setTimeout(resolve, 20);
					});
					await TracingHelper.withSpan(tracing, "C", undefined, async () => undefined);
				}),
				TracingHelper.withSpan(tracing, "D", undefined, async () => {
					await new Promise(resolve => {
						setTimeout(resolve, 5);
					});
				})
			]);
		});

		const a = findSpan("A");

		expect(findSpan("B").parentSpanId).toEqual(a.context.spanId);
		expect(findSpan("D").parentSpanId).toEqual(a.context.spanId);
		// C must attach to B even though D ran to completion in between.
		expect(findSpan("C").parentSpanId).toEqual(findSpan("B").context.spanId);
	});

	test("continues a trace from an explicitly supplied parent context", async () => {
		const remote = SpanHelper.createContext();

		await TracingHelper.withSpan(tracing, "op", { parentContext: remote }, async () => undefined);

		expect(ended[0].context.traceId).toEqual(remote.traceId);
		expect(ended[0].parentSpanId).toEqual(remote.spanId);
	});

	test("prefers an explicit parent over the one in scope", async () => {
		const remote = SpanHelper.createContext();

		await TracingHelper.withSpan(tracing, "A", undefined, async () =>
			TracingHelper.withSpan(tracing, "B", { parentContext: remote }, async () => undefined)
		);

		expect(findSpan("B").parentSpanId).toEqual(remote.spanId);
		expect(findSpan("B").context.traceId).toEqual(remote.traceId);
	});

	test("exposes the span in scope as a context that can be propagated", async () => {
		let inner: ISpanContext | undefined;

		await TracingHelper.withSpan(tracing, "op", undefined, async () => {
			inner = await TracingHelper.getCurrentSpanContext();
		});

		expect(inner?.spanId).toEqual(ended[0].context.spanId);
		expect(await TracingHelper.getCurrentSpanContext()).toBeUndefined();
	});

	test("writes the parts of the current span into the context", async () => {
		let contextIds: IContextIds | undefined;

		await TracingHelper.withSpan(tracing, "op", undefined, async () => {
			contextIds = await ContextIdStore.getContextIds();
		});

		// The parts are stored separately so any package can read the trace id without parsing.
		expect(contextIds?.[TracingContextIdKeys.TraceId]).toEqual(ended[0].context.traceId);
		expect(contextIds?.[TracingContextIdKeys.SpanId]).toEqual(ended[0].context.spanId);
		expect(contextIds?.[TracingContextIdKeys.TraceFlags]).toEqual("01");
	});

	test("round trips a span context through the context ids", async () => {
		const context = SpanHelper.createContext();

		expect(
			TracingHelper.spanContextFromContextIds(TracingHelper.spanContextToContextIds(context))
		).toEqual(context);
	});

	test("reads no span context when the ids are absent or incomplete", () => {
		expect(TracingHelper.spanContextFromContextIds({})).toBeUndefined();
		expect(
			TracingHelper.spanContextFromContextIds({
				[TracingContextIdKeys.TraceId]: SpanHelper.createContext().traceId
			})
		).toBeUndefined();
	});

	test("assumes a sampled trace when the flags are absent", () => {
		const context = SpanHelper.createContext();

		expect(
			TracingHelper.spanContextFromContextIds({
				[TracingContextIdKeys.TraceId]: context.traceId,
				[TracingContextIdKeys.SpanId]: context.spanId
			})?.traceFlags
		).toEqual(SpanHelper.TRACE_FLAG_SAMPLED);
	});

	test("carries an unsampled flag through the context ids", async () => {
		const context = { ...SpanHelper.createContext(), traceFlags: 0 };
		const contextIds = TracingHelper.spanContextToContextIds(context);

		expect(contextIds[TracingContextIdKeys.TraceFlags]).toEqual("00");
		expect(TracingHelper.spanContextFromContextIds(contextIds)?.traceFlags).toEqual(0);
	});

	test("formats the current span as a traceparent for an outbound request", async () => {
		let header: string | undefined;

		await TracingHelper.withSpan(tracing, "op", undefined, async () => {
			const current = await TracingHelper.getCurrentSpanContext();
			header = current ? TraceparentHelper.format(current) : undefined;
		});

		const { traceId, spanId } = ended[0].context;

		expect(header).toEqual(`00-${traceId}-${spanId}-01`);
	});

	test("preserves other context ids and does not leak the span to the caller", async () => {
		await ContextIdStore.run({ [ContextIdKeys.Tenant]: "tenant-a" }, async () => {
			await TracingHelper.withSpan(tracing, "op", undefined, async () => {
				const contextIds = await ContextIdStore.getContextIds();
				expect(contextIds?.[ContextIdKeys.Tenant]).toEqual("tenant-a");
			});

			// The span must not survive the scope it was created for.
			const after = await ContextIdStore.getContextIds();
			expect(after?.[TracingContextIdKeys.SpanId]).toBeUndefined();
			expect(after?.[TracingContextIdKeys.TraceId]).toBeUndefined();
			expect(after?.[ContextIdKeys.Tenant]).toEqual("tenant-a");
		});
	});

	test("does not leak the span when the callback throws", async () => {
		await ContextIdStore.run({}, async () => {
			await expect(
				TracingHelper.withSpan(tracing, "op", undefined, async () => {
					throw new GeneralError("test", "boom");
				})
			).rejects.toThrow(GeneralError);

			const after = await ContextIdStore.getContextIds();
			expect(after?.[TracingContextIdKeys.SpanId]).toBeUndefined();
			expect(after?.[TracingContextIdKeys.TraceId]).toBeUndefined();
		});
	});

	test("ignores malformed tracing ids in the context and starts a new trace", async () => {
		await ContextIdStore.run(
			{
				[TracingContextIdKeys.TraceId]: "rubbish",
				[TracingContextIdKeys.SpanId]: "alsorubbish"
			},
			async () => {
				await TracingHelper.withSpan(tracing, "op", undefined, async () => undefined);
			}
		);

		expect(ended[0].parentSpanId).toBeUndefined();
	});
});
