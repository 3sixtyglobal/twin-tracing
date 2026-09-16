// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdStore } from "@twin.org/context";
import { ComponentFactory, GeneralError, SharedStore } from "@twin.org/core";
import {
	SpanHelper,
	SpanStatus,
	TracingHelper,
	type ISpan,
	type ISpanOptions,
	type ITracingComponent
} from "@twin.org/tracing-models";
import type { ITracingFacadeConfig } from "../src/models/ITracingFacadeConfig.js";
import { TracingFacadeAttributes } from "../src/models/tracingFacadeAttributes.js";
import { TracingFacade } from "../src/tracingFacade.js";

let ended: ISpan[] = [];

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

class InnerComponent {
	public className(): string {
		return "InnerComponent";
	}

	public async work(): Promise<string> {
		return "worked";
	}
}

class OuterComponent {
	private readonly _inner: InnerComponent;

	constructor(inner: InnerComponent) {
		this._inner = inner;
	}

	public className(): string {
		return "OuterComponent";
	}

	public async run(): Promise<string> {
		return this._inner.work();
	}
}

class TestComponent {
	public value: number;

	constructor() {
		this.value = 1;
	}

	public className(): string {
		return "TestComponent";
	}

	public double(count: number): number {
		return count * 2;
	}

	public async get(id: string): Promise<string> {
		return `got:${id}`;
	}

	public async login(user: string, password: string): Promise<boolean> {
		return user.length > 0 && password.length > 0;
	}

	public async store(id: string, payload: { name: string; size: number } | null): Promise<void> {}

	public async start(): Promise<void> {}

	public async big(amount: bigint): Promise<bigint> {
		return amount;
	}

	public async long(text: string): Promise<void> {}

	public async list(items: string[]): Promise<void> {}

	public async fail(): Promise<void> {
		throw new GeneralError("test", "operationFailed");
	}
}

function makeFacade(config?: ITracingFacadeConfig): TracingFacade {
	return new TracingFacade({ tracingComponentType: "tracing", config });
}

function findSpan(name: string): ISpan {
	const span = ended.find(s => s.name === name);
	expect(span).toBeDefined();
	return span as ISpan;
}

describe("TracingFacade", () => {
	beforeEach(() => {
		ended = [];
		ComponentFactory.register("tracing", () => new TestTracingComponent());
	});

	afterEach(() => {
		ComponentFactory.unregister("tracing");
	});

	test("can construct", () => {
		expect(makeFacade()).toBeDefined();
	});

	test("reports its class name as a component", () => {
		// The engine registers a facade through the same initialiser shape as any other component.
		expect(makeFacade().className()).toEqual("TracingFacade");
	});

	test("records a span named for the method", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.get("abc");

		expect(ended).toHaveLength(1);
		expect(ended[0].name).toEqual("method:TestComponent.get");
		expect(ended[0].status).toEqual(SpanStatus.Ok);
		expect(ended[0].attributes?.[TracingFacadeAttributes.Method]).toEqual("TestComponent.get");
	});

	test("passes the call through to the component", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await expect(component.get("abc")).resolves.toEqual("got:abc");
	});

	test("records the parameters by name", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.get("abc");

		expect(ended[0].attributes?.["param.id"]).toEqual("abc");
	});

	test("records the returned value when it is primitive", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.login("user", "secret");

		expect(
			findSpan("method:TestComponent.login").attributes?.[TracingFacadeAttributes.Result]
		).toEqual(true);
	});

	test("excludes the named parameters whatever their type", async () => {
		const component = makeFacade({ excludeParams: ["password"] }).wrap(new TestComponent());

		await component.login("user", "secret");

		const span = findSpan("method:TestComponent.login");
		expect(span.attributes?.["param.user"]).toEqual("user");
		expect(span.attributes?.["param.password"]).toBeUndefined();
	});

	test("does not record a non primitive parameter which is not included", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.store("id-1", { name: "payload", size: 12 });

		const span = findSpan("method:TestComponent.store");
		expect(span.attributes?.["param.id"]).toEqual("id-1");
		expect(span.attributes?.["param.payload"]).toBeUndefined();
	});

	test("records a null argument as null rather than as omitted", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.store("id-1", null);

		const span = findSpan("method:TestComponent.store");
		expect(span.attributes?.["param.payload"]).toBeNull();
	});

	test("records a non primitive parameter when it is named in includeObjects", async () => {
		const component = makeFacade({ includeObjects: ["payload"] }).wrap(new TestComponent());

		await component.store("id-1", { name: "payload", size: 12 });

		expect(findSpan("method:TestComponent.store").attributes?.["param.payload"]).toEqual({
			name: "payload",
			size: 12
		});
	});

	test("passes an excluded method straight through with no span", async () => {
		const component = makeFacade({ excludeMethods: ["get"] }).wrap(new TestComponent());

		await expect(component.get("abc")).resolves.toEqual("got:abc");
		expect(ended).toHaveLength(0);
	});

	test("ends the span with an error and rethrows when the method fails", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await expect(component.fail()).rejects.toThrow(GeneralError);

		const span = findSpan("method:TestComponent.fail");
		expect(span.status).toEqual(SpanStatus.Error);
		expect(span.attributes?.["exception.message"]).toEqual("test.operationFailed");
	});

	test("leaves a synchronous method synchronous and untraced", () => {
		const component = makeFacade().wrap(new TestComponent());

		expect(component.double(3)).toEqual(6);
		expect(component.className()).toEqual("TestComponent");
		expect(ended).toHaveLength(0);
	});

	test("reads and writes properties through the facade without tracing", () => {
		const component = makeFacade().wrap(new TestComponent());

		expect(component.value).toEqual(1);
		component.value = 5;

		expect(component.value).toEqual(5);
		expect(ended).toHaveLength(0);
	});

	test("a call from one component to another nests and shares one trace", async () => {
		const facade = makeFacade();
		const outer = facade.wrap(new OuterComponent(facade.wrap(new InnerComponent())));

		await outer.run();

		const run = findSpan("method:OuterComponent.run");
		const work = findSpan("method:InnerComponent.work");

		expect(work.parentSpanId).toEqual(run.context.spanId);
		expect(work.context.traceId).toEqual(run.context.traceId);
	});

	test("nested spans join the trace of the surrounding request", async () => {
		const facade = makeFacade();
		const outer = facade.wrap(new OuterComponent(facade.wrap(new InnerComponent())));
		const request = SpanHelper.createContext();

		await ContextIdStore.run(TracingHelper.spanContextToContextIds(request), async () => {
			await outer.run();
		});

		const run = findSpan("method:OuterComponent.run");

		expect(run.parentSpanId).toEqual(request.spanId);
		expect(new Set(ended.map(s => s.context.traceId))).toEqual(new Set([request.traceId]));
	});

	test("sequential calls are siblings", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.get("one");
		await component.get("two");

		expect(ended).toHaveLength(2);
		expect(ended[0].parentSpanId).toBeUndefined();
		expect(ended[1].parentSpanId).toBeUndefined();
	});

	test("records a duration covering the whole call", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.get("abc");

		expect(ended[0].durationMs).toBeGreaterThanOrEqual(0);
		expect(ended[0].endTs).toBeDefined();
	});

	test("records no parameter values when the parameter names cannot be read", async () => {
		const awkward = {
			work: async (count: number = Number("1"), password: string = ""): Promise<string> =>
				`${count}${password}`
		};

		const component = makeFacade().wrap(awkward);
		await component.work(1, "secret");

		const span = findSpan("method:work");
		expect(span.attributes?.[TracingFacadeAttributes.Method]).toEqual("work");
		expect(Object.keys(span.attributes ?? {}).filter(k => k.startsWith("param."))).toEqual([]);
	});

	test("does not trace the lifecycle methods by default", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.start();

		expect(ended).toHaveLength(0);
	});

	test("does not record the sensitive parameters by default", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.login("user", "secret");

		const span = findSpan("method:TestComponent.login");
		expect(span.attributes?.["param.user"]).toEqual("user");
		expect(span.attributes?.["param.password"]).toBeUndefined();
	});

	test("scopes an exclusion to one method", async () => {
		const component = makeFacade({ excludeParams: ["TestComponent.get.id"] }).wrap(
			new TestComponent()
		);

		await component.get("abc");
		await component.store("id-1", { name: "payload", size: 12 });

		expect(findSpan("method:TestComponent.get").attributes?.["param.id"]).toBeUndefined();
		// The same name on another method is still recorded.
		expect(findSpan("method:TestComponent.store").attributes?.["param.id"]).toEqual("id-1");
	});

	test("matches an exclusion for every method with a wildcard", async () => {
		const component = makeFacade({ excludeParams: ["*.*.id"] }).wrap(new TestComponent());

		await component.get("abc");
		await component.store("id-1", { name: "payload", size: 12 });

		expect(findSpan("method:TestComponent.get").attributes?.["param.id"]).toBeUndefined();
		expect(findSpan("method:TestComponent.store").attributes?.["param.id"]).toBeUndefined();
	});

	test("truncates a string longer than the limit", async () => {
		const component = makeFacade({ maxStringLength: 8 }).wrap(new TestComponent());

		await component.long("0123456789abcdef");

		expect(findSpan("method:TestComponent.long").attributes?.["param.text"]).toEqual("01234567");
	});

	test("limits the entries recorded for an array", async () => {
		const component = makeFacade({
			includeObjects: ["TestComponent.list.items"],
			maxArrayLength: 2
		}).wrap(new TestComponent());

		await component.list(["a", "b", "c", "d"]);

		expect(findSpan("method:TestComponent.list").attributes?.["param.items"]).toEqual(["a", "b"]);
	});

	test("records only the selected property of an object", async () => {
		const component = makeFacade({
			includeObjects: ["TestComponent.store.payload.name"]
		}).wrap(new TestComponent());

		await component.store("id-1", { name: "payload", size: 12 });

		// Only the selected property, so the size stays out of the trace.
		expect(findSpan("method:TestComponent.store").attributes?.["param.payload"]).toEqual({
			name: "payload"
		});
	});

	test("records every selected property of an object", async () => {
		const component = makeFacade({
			includeObjects: ["TestComponent.store.payload.name", "TestComponent.store.payload.size"]
		}).wrap(new TestComponent());

		await component.store("id-1", { name: "payload", size: 12 });

		expect(findSpan("method:TestComponent.store").attributes?.["param.payload"]).toEqual({
			name: "payload",
			size: 12
		});
	});

	test("records a bigint as a string so the connectors can serialise it", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.big(42n);

		const span = findSpan("method:TestComponent.big");
		expect(span.attributes?.["param.amount"]).toEqual("42");
		expect(span.attributes?.[TracingFacadeAttributes.Result]).toEqual("42");
	});

	test("excludes a returned value with the resolved name", async () => {
		const component = makeFacade({ excludeParams: ["*.*.resolved"] }).wrap(new TestComponent());

		await component.get("abc");

		const span = findSpan("method:TestComponent.get");
		expect(span.attributes?.["param.id"]).toEqual("abc");
		expect(span.attributes?.[TracingFacadeAttributes.Result]).toBeUndefined();
	});

	test("returns the same wrapper for every read of a method", () => {
		const component = makeFacade().wrap(new TestComponent());

		expect(component.get).toBe(component.get);
	});

	test("logs a tracing failure when a logging component is configured", async () => {
		const logged: string[] = [];
		ComponentFactory.register(
			"logging",
			() =>
				({
					className: () => "TestLogging",
					log: async (entry: { message: string }) => {
						logged.push(entry.message);
					}
				}) as never
		);
		ComponentFactory.register("failing-tracing", () => {
			const failing = new TestTracingComponent();
			failing.startSpan = async (): Promise<ISpan> => {
				throw new GeneralError("test", "startFailed");
			};
			return failing;
		});

		const component = new TracingFacade({
			tracingComponentType: "failing-tracing",
			loggingComponentType: "logging"
		}).wrap(new TestComponent());

		// The call still succeeds, and the failure is reported rather than swallowed.
		await expect(component.get("abc")).resolves.toEqual("got:abc");
		expect(logged).toEqual(["startSpanFailed"]);

		ComponentFactory.unregister("logging");
		ComponentFactory.unregister("failing-tracing");
	});

	test("resolves the tracing component on a later call when the first call found none", async () => {
		ComponentFactory.unregister("tracing");

		// The facade is created before the tracing component exists, as the engine does.
		const component = new TracingFacade({ tracingComponentType: "tracing" }).wrap(
			new TestComponent()
		);

		await component.get("abc");
		expect(ended).toHaveLength(0);

		ComponentFactory.register("tracing", () => new TestTracingComponent());
		await component.get("abc");

		expect(ended).toHaveLength(1);
		expect(ended[0].name).toEqual("method:TestComponent.get");
	});

	test("passes everything through when there is no tracing component", async () => {
		const facade = new TracingFacade({ tracingComponentType: "not-registered" });
		const component = facade.wrap(new TestComponent());

		await expect(component.get("abc")).resolves.toEqual("got:abc");
		expect(ended).toHaveLength(0);
	});

	test("stops consulting the factory once a component has resolved", async () => {
		const component = makeFacade().wrap(new TestComponent());

		await component.get("abc");

		const lookups = vi.spyOn(ComponentFactory, "getIfExists");
		await component.get("abc");
		await component.get("abc");

		expect(lookups).not.toHaveBeenCalled();
		expect(ended).toHaveLength(3);

		lookups.mockRestore();
	});

	test("keeps consulting the factory while neither component has resolved", async () => {
		ComponentFactory.unregister("tracing");

		const component = new TracingFacade({ tracingComponentType: "tracing" }).wrap(
			new TestComponent()
		);

		await component.get("abc");

		const lookups = vi.spyOn(ComponentFactory, "getIfExists");
		await component.get("abc");

		expect(lookups).toHaveBeenCalled();

		lookups.mockRestore();
		ComponentFactory.register("tracing", () => new TestTracingComponent());
	});

	test("answers the shared store symbol so another copy of the package recognises the proxy", () => {
		const wrapped = SharedStore.get<symbol>("tracingFacadeWrapped");
		const component = makeFacade().wrap(new TestComponent());

		expect(wrapped).toBeDefined();
		expect(Reflect.get(component, wrapped as symbol)).toEqual(true);
	});

	test("throws when the tracing component is one of its own proxies", async () => {
		const facade = new TracingFacade({ tracingComponentType: "self-tracing" });
		ComponentFactory.register("self-tracing", () => facade.wrap(new TestTracingComponent()));

		const component = facade.wrap(new TestComponent());

		await expect(component.get("abc")).rejects.toMatchObject({
			name: "GeneralError",
			message: "tracingFacade.selfWrapped",
			properties: { instanceType: "self-tracing" }
		});

		ComponentFactory.unregister("self-tracing");
	});

	test("throws when the logging component is one of its own proxies", async () => {
		const facade = new TracingFacade({
			tracingComponentType: "tracing",
			loggingComponentType: "self-logging"
		});
		ComponentFactory.register("self-logging", () =>
			facade.wrap({
				className: () => "TestLogging",
				log: async () => {}
			} as never)
		);

		const component = facade.wrap(new TestComponent());

		await expect(component.get("abc")).rejects.toMatchObject({
			name: "GeneralError",
			message: "tracingFacade.selfWrapped",
			properties: { instanceType: "self-logging" }
		});

		ComponentFactory.unregister("self-logging");
	});

	test("throws when another facade has wrapped the tracing component in turn", async () => {
		const facade = new TracingFacade({ tracingComponentType: "self-tracing" });
		ComponentFactory.register("self-tracing", () => {
			const traced = facade.wrap(new TestTracingComponent());

			return new Proxy(traced, {}) as never;
		});

		const component = facade.wrap(new TestComponent());

		await expect(component.get("abc")).rejects.toMatchObject({
			message: "tracingFacade.selfWrapped",
			properties: { instanceType: "self-tracing" }
		});

		ComponentFactory.unregister("self-tracing");
	});
});
