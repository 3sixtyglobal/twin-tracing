// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	ComponentFactory,
	GeneralError,
	Is,
	SharedStore,
	type IComponent,
	type IFacade
} from "@twin.org/core";
import type { ILoggingComponent } from "@twin.org/logging-models";
import { nameof } from "@twin.org/nameof";
import { TracingHelper, type ITracingComponent } from "@twin.org/tracing-models";
import type { ITracingFacadeConstructorOptions } from "./models/ITracingFacadeConstructorOptions.js";
import { TracingFacadeAttributes } from "./models/tracingFacadeAttributes.js";

/**
 * Facade which records a span for each external call to an async method on the component it wraps,
 * so a component can be traced without being modified.
 *
 * Only methods declared async are traced. A span cannot be opened synchronously, so wrapping a
 * synchronous method would make it return a promise and break the contract of the wrapped
 * component.
 */
export class TracingFacade implements IFacade, IComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TracingFacade>();

	/**
	 * The methods that are excluded from tracing by default.
	 */
	public static readonly DEFAULT_EXCLUDE_METHODS: string[] = [
		"start",
		"stop",
		"bootstrap",
		"teardown"
	];

	/**
	 * The parameters that are excluded from recording by default.
	 */
	public static readonly DEFAULT_EXCLUDE_PARAMS: string[] = [
		"password",
		"token",
		"apiKey",
		"mnemonic",
		"currentPassword",
		"newPassword",
		"setSecret.data",
		"getSecret.resolved",
		"importKey.privateKeyPem",
		"backupKey.resolved",
		"restoreKey.backup",
		"getDecryptionKey.resolved"
	];

	/**
	 * The default maximum length of a recorded string.
	 */
	public static readonly DEFAULT_MAX_STRING_LENGTH: number = 256;

	/**
	 * The default maximum number of entries recorded for an array.
	 */
	public static readonly DEFAULT_MAX_ARRAY_LENGTH: number = 10;

	/**
	 * The name a returned value is matched under, so it can be excluded or have a property
	 * selected with the same patterns as a parameter.
	 */
	public static readonly RESULT_NAME: string = "resolved";

	/**
	 * A camel case parameter name, used to check the names read from the source are trustworthy.
	 * @internal
	 */
	private static readonly _IDENTIFIER: RegExp = /^[a-z][A-Za-z0-9]*$/;

	/**
	 * The result of Object.prototype.toString for a method declared async. Used in preference to
	 * the constructor name, which throws for a function with no prototype.
	 * @internal
	 */
	private static readonly _ASYNC_FUNCTION_TAG: string = "[object AsyncFunction]";

	/**
	 * The property every facade proxy answers, used to recognise a component this facade wrapped.
	 * It is held in the shared store so that copies of this package loaded more than once in a
	 * process recognise each other's proxies.
	 * @internal
	 */
	private static readonly _WRAPPED: symbol = TracingFacade.wrappedProperty();

	/**
	 * The type of the component recording the spans.
	 * @internal
	 */
	private readonly _tracingComponentType?: string;

	/**
	 * The component recording the spans, resolved on first use.
	 * @internal
	 */
	private _tracingComponent?: ITracingComponent;

	/**
	 * The type of the component for logging a tracing failure.
	 * @internal
	 */
	private readonly _loggingComponentType?: string;

	/**
	 * The component for logging a tracing failure, resolved on first use.
	 * @internal
	 */
	private _loggingComponent?: ILoggingComponent;

	/**
	 * Whether one of the components the facade depends on has resolved, after which the factory is
	 * no longer consulted.
	 * @internal
	 */
	private _componentsResolved: boolean;

	/**
	 * Patterns for parameters whose values are never recorded.
	 * @internal
	 */
	private readonly _excludeParams: string[][];

	/**
	 * Patterns for methods which are not intercepted.
	 * @internal
	 */
	private readonly _excludeMethods: string[][];

	/**
	 * Patterns for parameters to record even when the value is not primitive.
	 * @internal
	 */
	private readonly _includeObjects: { path: string[]; root: string[]; last: string }[];

	/**
	 * The maximum length of a recorded string.
	 * @internal
	 */
	private readonly _maxStringLength: number;

	/**
	 * The maximum number of entries recorded for an array.
	 * @internal
	 */
	private readonly _maxArrayLength: number;

	/**
	 * The wrapper for each method, held against the target as well as the method.
	 * @internal
	 */
	private readonly _wrappers: WeakMap<
		object,
		WeakMap<object, (...args: unknown[]) => Promise<unknown>>
	>;

	/**
	 * The parameter names of each method, parsed once on first use.
	 * @internal
	 */
	private readonly _paramNames: WeakMap<object, string[]>;

	/**
	 * Create a new instance of TracingFacade.
	 * @param options The options for the facade.
	 */
	constructor(options?: ITracingFacadeConstructorOptions) {
		this._tracingComponentType = options?.tracingComponentType;
		this._loggingComponentType = options?.loggingComponentType;
		this._excludeParams = (
			options?.config?.excludeParams ?? TracingFacade.DEFAULT_EXCLUDE_PARAMS
		).map(pattern => pattern.split("."));
		this._excludeMethods = (
			options?.config?.excludeMethods ?? TracingFacade.DEFAULT_EXCLUDE_METHODS
		).map(pattern => pattern.split("."));
		this._includeObjects = (options?.config?.includeObjects ?? []).map(pattern => {
			const segments = pattern.split(".");

			return {
				path: segments,
				root: segments.slice(0, -1),
				last: segments[segments.length - 1]
			};
		});
		this._maxStringLength =
			options?.config?.maxStringLength ?? TracingFacade.DEFAULT_MAX_STRING_LENGTH;
		this._maxArrayLength =
			options?.config?.maxArrayLength ?? TracingFacade.DEFAULT_MAX_ARRAY_LENGTH;
		this._wrappers = new WeakMap();
		this._paramNames = new WeakMap();
		this._componentsResolved = false;
	}

	/**
	 * Get the property a facade proxy answers, taking it from the shared store so that every copy
	 * of this package loaded in the process uses the same one.
	 * @returns The property.
	 * @internal
	 */
	private static wrappedProperty(): symbol {
		return SharedStore.get<symbol>("tracingFacadeWrapped", () => Symbol("tracingFacadeWrapped"));
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TracingFacade.CLASS_NAME;
	}

	/**
	 * Wrap the target so its method calls are recorded as spans.
	 * @param target The component to wrap.
	 * @returns The wrapped component.
	 */
	public wrap<T>(target: T): T {
		return new Proxy(target as { [key: string]: unknown }, {
			get: (t, prop, receiver): unknown => this.interceptGet(t, prop, receiver)
		}) as T;
	}

	/**
	 * Get the component recording the spans, resolving it from the factory on first use.
	 * @returns The component, or undefined when it does not resolve.
	 * @internal
	 */
	private tracingComponent(): ITracingComponent | undefined {
		// The facade can be created before the components it depends on are registered, so the
		// factory is consulted on each call until one of them resolves, and not after.
		if (!this._componentsResolved) {
			this._tracingComponent = this.resolveComponent<ITracingComponent>(this._tracingComponentType);
			this._loggingComponent = this.resolveComponent<ILoggingComponent>(this._loggingComponentType);
			this._componentsResolved =
				!Is.empty(this._tracingComponent) || !Is.empty(this._loggingComponent);
		}

		return this._tracingComponent;
	}

	/**
	 * Resolve a component the facade itself depends on.
	 * @param instanceType The type of the component to resolve.
	 * @returns The component, or undefined when it does not resolve.
	 * @throws GeneralError if the component is one this facade has wrapped.
	 * @internal
	 */
	private resolveComponent<T extends IComponent>(instanceType?: string): T | undefined {
		const component = ComponentFactory.getIfExists<T>(instanceType);

		if (!Is.empty(component) && Reflect.get(component, TracingFacade._WRAPPED) === true) {
			throw new GeneralError("tracingFacade", "selfWrapped", { instanceType });
		}

		return component;
	}

	/**
	 * Intercept a property read, returning a replacement function for a method which should be
	 * traced, and the value itself for anything else.
	 * @param target The component being wrapped.
	 * @param prop The property being read.
	 * @param receiver The proxy the read was made through.
	 * @returns The value for the property.
	 * @internal
	 */
	private interceptGet(
		target: { [key: string]: unknown },
		prop: string | symbol,
		receiver: unknown
	): unknown {
		if (prop === TracingFacade._WRAPPED) {
			return true;
		}

		const value = Reflect.get(target, prop, receiver);

		if (!Is.function(value) || !Is.string(prop)) {
			return value;
		}

		// Wrapping a synchronous method would make it return a promise. The declaration is tested
		// rather than the return value, which would open the span too late to nest inner calls.
		if (Object.prototype.toString.call(value) !== TracingFacade._ASYNC_FUNCTION_TAG) {
			return value;
		}

		const className = this.targetClassName(target);

		if (this.matchesAny(this._excludeMethods, [className, prop])) {
			return value;
		}

		return this.tracedMethod(target, className, prop, value);
	}

	/**
	 * Get the wrapper for a method, building it on first use.
	 * @param target The component being wrapped.
	 * @param className The name of the component class.
	 * @param name The name of the method.
	 * @param method The method to wrap.
	 * @returns The wrapper, which is the same function for every read of that method.
	 * @internal
	 */
	private tracedMethod(
		target: { [key: string]: unknown },
		className: string,
		name: string,
		method: (...args: unknown[]) => unknown
	): (...args: unknown[]) => Promise<unknown> {
		let wrappers = this._wrappers.get(target);

		if (Is.undefined(wrappers)) {
			wrappers = new WeakMap();
			this._wrappers.set(target, wrappers);
		}

		let wrapper = wrappers.get(method);

		if (Is.undefined(wrapper)) {
			wrapper = async (...args: unknown[]): Promise<unknown> => {
				const tracingComponent = this.tracingComponent();

				if (Is.empty(tracingComponent)) {
					return method.apply(target, args);
				}

				return TracingHelper.withSpan(
					tracingComponent,
					Is.stringValue(className) ? `method:${className}.${name}` : `method:${name}`,
					{ attributes: this.callAttributes(className, name, method, args) },
					async span => {
						const resolved = await method.apply(target, args);

						if (!Is.empty(span)) {
							const recorded = this.attributeValue(
								[className, name, TracingFacade.RESULT_NAME],
								resolved
							);

							if (!Is.undefined(recorded)) {
								span.attributes = {
									...span.attributes,
									[TracingFacadeAttributes.Result]: recorded
								};
							}
						}

						return resolved;
					},
					this._loggingComponent
				);
			};

			wrappers.set(method, wrapper);
		}

		return wrapper;
	}

	/**
	 * Build the attributes describing a call.
	 * @param className The name of the component class.
	 * @param name The name of the method.
	 * @param method The method being called.
	 * @param args The arguments the method was called with.
	 * @returns The attributes.
	 * @internal
	 */
	private callAttributes(
		className: string,
		name: string,
		method: (...args: unknown[]) => unknown,
		args: unknown[]
	): { [key: string]: unknown } {
		const attributes: { [key: string]: unknown } = {
			[TracingFacadeAttributes.Method]: Is.stringValue(className) ? `${className}.${name}` : name
		};

		const paramNames = this.paramNames(method);

		for (let i = 0; i < args.length; i++) {
			const paramName = paramNames[i];

			if (Is.stringValue(paramName)) {
				const recorded = this.attributeValue([className, name, paramName], args[i]);

				if (!Is.undefined(recorded)) {
					attributes[`${TracingFacadeAttributes.ParamPrefix}${paramName}`] = recorded;
				}
			}
		}

		return attributes;
	}

	/**
	 * Decide what is recorded for a value, applying the exclusions, the object selection and the
	 * length limits.
	 * @param path The class, method and parameter name the value belongs to.
	 * @param value The value to record.
	 * @returns The value to record, or undefined when nothing is recorded.
	 * @internal
	 */
	private attributeValue(path: string[], value: unknown): unknown {
		if (this.matchesAny(this._excludeParams, path)) {
			return undefined;
		}

		const primitive = this.primitiveValue(value);

		if (!Is.undefined(primitive)) {
			return primitive;
		}

		const included = this.included(path);

		if (!included.record) {
			return undefined;
		}

		if (Is.arrayValue(included.properties)) {
			if (!Is.object<{ [key: string]: unknown }>(value)) {
				return undefined;
			}

			const selected: { [key: string]: unknown } = {};
			for (const property of included.properties) {
				selected[property] = value[property];
			}

			return selected;
		}

		return Is.array(value) ? value.slice(0, this._maxArrayLength) : value;
	}

	/**
	 * Convert a value which can be recorded as a span attribute directly.
	 * @param value The value to convert.
	 * @returns The value to record, or undefined when it is not a primitive.
	 * @internal
	 */
	private primitiveValue(value: unknown): unknown {
		if (Is.string(value)) {
			return value.length > this._maxStringLength ? value.slice(0, this._maxStringLength) : value;
		}

		// A bigint cannot be serialised by JSON.stringify, so it is converted here.
		if (Is.bigint(value)) {
			return String(value);
		}

		if (Is.number(value) || Is.boolean(value) || Is.null(value)) {
			return value;
		}

		return undefined;
	}

	/**
	 * Decide whether a non primitive value is recorded, and which of its properties are.
	 * @param path The class, method and parameter name the value belongs to.
	 * @returns Whether to record the value, and the properties to record when the patterns select
	 * them rather than the whole value.
	 * @internal
	 */
	private included(path: string[]): { record: boolean; properties?: string[] } {
		const properties: string[] = [];

		for (const pattern of this._includeObjects) {
			// The parameter itself is named, so the whole value is recorded.
			if (this.matches(pattern.path, path)) {
				return { record: true };
			}

			if (pattern.root.length > 0 && this.matches(pattern.root, path)) {
				properties.push(pattern.last);
			}
		}

		return properties.length > 0 ? { record: true, properties } : { record: false };
	}

	/**
	 * Does any of the patterns match the path.
	 * @param patterns The patterns to test.
	 * @param path The path to test them against.
	 * @returns True when one of the patterns matches.
	 * @internal
	 */
	private matchesAny(patterns: string[][], path: string[]): boolean {
		return patterns.some(pattern => this.matches(pattern, path));
	}

	/**
	 * Does a dot separated pattern match a path. The pattern is matched from the right, so a
	 * pattern shorter than the path leaves the leading segments unconstrained, and a `*` matches
	 * any single segment.
	 * @param segments The segments of the pattern to test.
	 * @param path The path to test it against.
	 * @returns True when the pattern matches.
	 * @internal
	 */
	private matches(segments: string[], path: string[]): boolean {
		if (segments.length > path.length) {
			return false;
		}

		const offset = path.length - segments.length;

		return segments.every((segment, index) => segment === "*" || segment === path[offset + index]);
	}

	/**
	 * Get the name of the class of the component being wrapped, which every IComponent
	 * implementation provides.
	 * @param target The component to get the name of.
	 * @returns The class name, or an empty string when the component does not provide one.
	 * @internal
	 */
	private targetClassName(target: { [key: string]: unknown }): string {
		const method = target.className;

		if (Is.function(method)) {
			const name = method.call(target);

			if (Is.stringValue(name)) {
				return name;
			}
		}

		return "";
	}

	/**
	 * Get the parameter names of a method, read from its source and held for reuse. An empty list
	 * is returned when the names cannot be read reliably, so no parameter values are recorded
	 * rather than being recorded against a name which may be wrong.
	 * @param method The method to read the parameter names of.
	 * @returns The parameter names in order, or an empty list when they cannot be trusted.
	 * @internal
	 */
	private paramNames(method: (...args: unknown[]) => unknown): string[] {
		let names = this._paramNames.get(method);

		if (Is.undefined(names)) {
			const source = method.toString();
			const open = source.indexOf("(");
			const close = source.indexOf(")", open);

			names =
				open === -1 || close === -1
					? []
					: source
							.slice(open + 1, close)
							.split(",")
							.map(param => param.trim())
							.filter(param => param.length > 0);

			// Anything which is not a plain identifier means the whole list is suspect, so nothing is trusted.
			if (!names.every(name => TracingFacade._IDENTIFIER.test(name))) {
				names = [];
			}

			this._paramNames.set(method, names);
		}

		return names;
	}
}
