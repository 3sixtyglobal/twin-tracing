# Tracing Facades Examples

A facade wraps the components a factory produces, so tracing is applied without the component
being modified. Registering one and activating it on a factory traces everything that factory
hands out.

## Setup

```typescript
import { ComponentFactory, FacadeFactory } from '@twin.org/core';
import { TracingFacade } from '@twin.org/tracing-facades';

FacadeFactory.register(
  'tracing',
  () => new TracingFacade({ tracingComponentType: 'tracing', loggingComponentType: 'logging' })
);

ComponentFactory.useFacade('tracing');
```

Every component the factory produces from that point on records a span named
`method:<class>.<name>` for each method called on it. With no tracing component registered the target is returned unwrapped,
so this is safe to activate unconditionally. A tracing connector which fails does not interrupt
the call it was recording, and the failure is reported to the logging component when one is
configured.

## What is recorded

The span carries the method name, the arguments by parameter name, and the returned value when it
is primitive. A failure records the error message and ends the span with an error status.

```text
method:NotarizationService.create
  { "method.name": "NotarizationService.create", "method.result": "urn:..." }
```

A parameter whose value is not primitive is recorded as present but without its value, so the
shape of the call is visible without serialising a payload into the trace.

## Keeping values out of a span

Patterns are dot separated and matched from the right, so a bare name applies everywhere and a
fully qualified one applies to a single method.

```typescript
config: {
  excludeParams: [
    ...TracingFacade.DEFAULT_EXCLUDE_PARAMS,
    'NotarizationService.create.controllerIdentity'
  ];
}
```

`DEFAULT_EXCLUDE_PARAMS` covers `password`, `token`, `apiKey` and `mnemonic`, and applies when
`excludeParams` is not supplied. Spread it into a custom list to keep it.

`includeObjects` records a parameter whose value is not primitive. A further segment selects a
single property, so only that is recorded.

```typescript
config: {
  includeObjects: [
    'NotarizationService.create.notarization.mode',
    'BlobStorageService.create.options'
  ];
}
```

Any other non primitive parameter is not recorded, so a payload never reaches the trace unless it
is named.

## Limiting what is recorded

A recorded string is truncated to `maxStringLength`, which defaults to 256, since some methods are
passed base64 content. An included array is limited to `maxArrayLength` entries, which defaults
to 10.

```typescript
config: {
  maxStringLength: 128,
  maxArrayLength: 5;
}
```

The returned value is recorded under the name `resolved`, so it is excluded or property selected
with the same patterns.

```typescript
config: {
  excludeParams: ['IdentityService.verifiableCredentialCreate.resolved'];
}
```

## Methods which are not traced

`excludeMethods` passes the named methods straight through, with no span recorded.
`DEFAULT_EXCLUDE_METHODS` covers `start`, `stop`, `bootstrap` and `teardown`, the lifecycle
methods which are called once and carry no request context.

```typescript
config: {
  excludeMethods: [...TracingFacade.DEFAULT_EXCLUDE_METHODS, 'IdentityService.identityResolve'];
}
```

Only external calls to methods declared `async` are recorded. Opening a span is asynchronous, so
wrapping a synchronous method would make it return a promise and break the contract of the
component being wrapped.

## Choosing what gets traced

Facades are activated per factory, so the granularity is yours.

```typescript
ComponentFactory.useFacade('tracing'); // every service
EntityStorageConnectorFactory.useFacade('tracing'); // every storage operation
```

Deactivating applies to instances produced from that point on, since an instance already handed
out cannot be unwrapped.

```typescript
ComponentFactory.unuseFacade('tracing');
```
