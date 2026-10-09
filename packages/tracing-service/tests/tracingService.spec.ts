// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { EntityCondition, SortDirection } from "@3sixty/entity";
import {
	SpanHelper,
	TracingConnectorFactory,
	type ISpan,
	type ISpanOptions,
	type ITracingConnector,
	SpanStatus,
	type SpanStatus as SpanStatusType
} from "@3sixty/tracing-models";
import { TracingService } from "../src/tracingService.js";

/**
 * A minimal in-memory tracing connector used to exercise the service.
 */
class MemoryTracingConnector implements ITracingConnector {
	public readonly spans: ISpan[];

	public lastConditions?: EntityCondition<ISpan>;

	constructor() {
		this.spans = [];
	}

	public className(): string {
		return "MemoryTracingConnector";
	}

	public async startSpan(name: string, options?: ISpanOptions): Promise<ISpan> {
		const span = SpanHelper.startSpan(name, options);
		this.spans.push(span);
		return span;
	}

	public async endSpan(span: ISpan, status?: SpanStatusType): Promise<void> {
		SpanHelper.endSpan(span, status);
	}

	public async query(
		conditions?: EntityCondition<ISpan>,
		sortProperties?: {
			property: keyof Omit<ISpan, "attributes" | "events" | "links" | "context">;
			sortDirection: SortDirection;
		}[],
		cursor?: string,
		limit?: number
	): Promise<{ entities: ISpan[]; cursor?: string }> {
		this.lastConditions = conditions;

		// Interpret a single traceId equals comparator so getTrace can be exercised.
		let entities = [...this.spans];
		const group = conditions as { conditions?: { property: string; value: unknown }[] };
		const traceComparator = group?.conditions?.find(c => c.property === "traceId");
		if (traceComparator !== undefined) {
			entities = entities.filter(s => s.context.traceId === traceComparator.value);
		}

		return { entities };
	}
}

describe("TracingService", () => {
	let connector: MemoryTracingConnector;

	beforeEach(() => {
		connector = new MemoryTracingConnector();
		TracingConnectorFactory.register("tracing", () => connector);
	});

	test("startSpan and endSpan delegate to the connector", async () => {
		const service = new TracingService();

		const span = await service.startSpan("do-work");
		expect(connector.spans).toHaveLength(1);

		await service.endSpan(span, SpanStatus.Ok);
		expect(span.status).toEqual(SpanStatus.Ok);
		expect(span.endTs).toBeDefined();
	});

	test("query builds the expected filter conditions", async () => {
		const service = new TracingService();

		await service.query("trace-1", "span-1", SpanStatus.Error, undefined, 100, 200);

		const built = connector.lastConditions as {
			conditions: { property: string; value: unknown }[];
		};
		const properties = built.conditions.map(c => c.property);
		expect(properties).toContain("traceId");
		expect(properties).toContain("spanId");
		expect(properties).toContain("status");
		expect(properties).toContain("startTs");
	});

	test("getTrace returns the trace spans ordered by start time ascending", async () => {
		const service = new TracingService();

		const root = await service.startSpan("root", { startTs: 1000 });
		await service.startSpan("child-b", { parentContext: root.context, startTs: 3000 });
		await service.startSpan("child-a", { parentContext: root.context, startTs: 2000 });
		// Unrelated trace.
		await service.startSpan("unrelated", { startTs: 500 });

		const trace = await service.getTrace(root.context.traceId);

		expect(trace.map(s => s.name)).toEqual(["root", "child-a", "child-b"]);
	});
});
