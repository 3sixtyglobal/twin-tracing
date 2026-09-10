# Changelog

## [0.9.3-next.5](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.3-next.4...tracing-connector-entity-storage-v0.9.3-next.5) (2026-09-10)


### Miscellaneous Chores

* **tracing-connector-entity-storage:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.3-next.4 to 0.9.3-next.5

## [0.9.3-next.4](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.3-next.3...tracing-connector-entity-storage-v0.9.3-next.4) (2026-09-08)


### Miscellaneous Chores

* **tracing-connector-entity-storage:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.3-next.3 to 0.9.3-next.4

## [0.9.3-next.3](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.3-next.2...tracing-connector-entity-storage-v0.9.3-next.3) (2026-09-08)


### Miscellaneous Chores

* **tracing-connector-entity-storage:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.3-next.2 to 0.9.3-next.3

## [0.9.3-next.2](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.3-next.1...tracing-connector-entity-storage-v0.9.3-next.2) (2026-09-02)


### Features

* retention for the entity-storage tracing connector ([#35](https://github.com/iotaledger/twin-tracing/issues/35)) ([25ec0f7](https://github.com/iotaledger/twin-tracing/commit/25ec0f7a9dd672f197cfe464a0e583883e242d1f))


### Bug Fixes

* prevent endSpan race with in-flight flush writes ([#37](https://github.com/iotaledger/twin-tracing/issues/37)) ([4f6126e](https://github.com/iotaledger/twin-tracing/commit/4f6126e98f9cac9c21afb2008ce9921c56fd0b37))
* protect still-open spans from retention and reap abandoned ones separately ([29d81b0](https://github.com/iotaledger/twin-tracing/commit/29d81b037cafca005767a93cfba44265acdcba3d))
* protect still-open spans from retention and reap abandoned ones separately ([#39](https://github.com/iotaledger/twin-tracing/issues/39)) ([345530c](https://github.com/iotaledger/twin-tracing/commit/345530c90735be6122a3821a017861d8dc62e7b3))


### Reverts

* back out still-open-spans retention fix, landed on next by mistake ([979fb10](https://github.com/iotaledger/twin-tracing/commit/979fb10f827e32d5aaa3916829d1cd5ce4d1fef0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.3-next.1 to 0.9.3-next.2

## [0.9.3-next.1](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.3-next.0...tracing-connector-entity-storage-v0.9.3-next.1) (2026-08-26)


### Features

* add twin-tracing repository with OTel-aligned tracing API ([59b914c](https://github.com/iotaledger/twin-tracing/commit/59b914ca631c0b765973dfa5099a8f4e6115e325))
* add twin-tracing repository with OTel-aligned tracing API ([affcd6c](https://github.com/iotaledger/twin-tracing/commit/affcd6c1cf2fbfd34d9a8849e860e5fe66a011e3))
* batching ([#20](https://github.com/iotaledger/twin-tracing/issues/20)) ([1640e9f](https://github.com/iotaledger/twin-tracing/commit/1640e9f23282b513009cfcd6dbae4e518206a888))
* linting and dependency update ([c1a2b98](https://github.com/iotaledger/twin-tracing/commit/c1a2b988441deb59592d69c7d3b6527bcb9018b2))
* linting and dependency update ([b65c083](https://github.com/iotaledger/twin-tracing/commit/b65c083d4f8f83c2046d29d53444b45c7a4188c7))
* rename SpanEntity to Span ([5dcca6c](https://github.com/iotaledger/twin-tracing/commit/5dcca6cdb7d24eb047eb9334bd0691b6069df82b))
* tenant aware entity storage ([#17](https://github.com/iotaledger/twin-tracing/issues/17)) ([ae11c56](https://github.com/iotaledger/twin-tracing/commit/ae11c56edf472bc1842997600238c2309ef7147d))


### Bug Fixes

* address PR review on tracing packages ([0832b5f](https://github.com/iotaledger/twin-tracing/commit/0832b5fc0e7414b4e0fd2393532df00e07ff1f43))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.3-next.0 to 0.9.3-next.1

## [0.9.2](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2...tracing-connector-entity-storage-v0.9.2) (2026-08-24)


### Features

* add twin-tracing repository with OTel-aligned tracing API ([59b914c](https://github.com/iotaledger/twin-tracing/commit/59b914ca631c0b765973dfa5099a8f4e6115e325))
* add twin-tracing repository with OTel-aligned tracing API ([affcd6c](https://github.com/iotaledger/twin-tracing/commit/affcd6c1cf2fbfd34d9a8849e860e5fe66a011e3))
* release to production ([#27](https://github.com/iotaledger/twin-tracing/issues/27)) ([d1ed9dd](https://github.com/iotaledger/twin-tracing/commit/d1ed9dde0b0d582dbbefb623e003042f5f36f051))


### Bug Fixes

* address PR review on tracing packages ([0832b5f](https://github.com/iotaledger/twin-tracing/commit/0832b5fc0e7414b4e0fd2393532df00e07ff1f43))

## [0.9.2-next.7](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.6...tracing-connector-entity-storage-v0.9.2-next.7) (2026-08-21)


### Features

* batching ([#20](https://github.com/iotaledger/twin-tracing/issues/20)) ([1640e9f](https://github.com/iotaledger/twin-tracing/commit/1640e9f23282b513009cfcd6dbae4e518206a888))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.6 to 0.9.2-next.7

## [0.9.2-next.6](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.5...tracing-connector-entity-storage-v0.9.2-next.6) (2026-08-19)


### Features

* tenant aware entity storage ([#17](https://github.com/iotaledger/twin-tracing/issues/17)) ([ae11c56](https://github.com/iotaledger/twin-tracing/commit/ae11c56edf472bc1842997600238c2309ef7147d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.5 to 0.9.2-next.6

## [0.9.2-next.5](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.4...tracing-connector-entity-storage-v0.9.2-next.5) (2026-08-18)


### Features

* add twin-tracing repository with OTel-aligned tracing API ([59b914c](https://github.com/iotaledger/twin-tracing/commit/59b914ca631c0b765973dfa5099a8f4e6115e325))
* add twin-tracing repository with OTel-aligned tracing API ([affcd6c](https://github.com/iotaledger/twin-tracing/commit/affcd6c1cf2fbfd34d9a8849e860e5fe66a011e3))
* linting and dependency update ([c1a2b98](https://github.com/iotaledger/twin-tracing/commit/c1a2b988441deb59592d69c7d3b6527bcb9018b2))
* linting and dependency update ([b65c083](https://github.com/iotaledger/twin-tracing/commit/b65c083d4f8f83c2046d29d53444b45c7a4188c7))
* rename SpanEntity to Span ([5dcca6c](https://github.com/iotaledger/twin-tracing/commit/5dcca6cdb7d24eb047eb9334bd0691b6069df82b))


### Bug Fixes

* address PR review on tracing packages ([0832b5f](https://github.com/iotaledger/twin-tracing/commit/0832b5fc0e7414b4e0fd2393532df00e07ff1f43))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.4 to 0.9.2-next.5

## [0.9.2-next.4](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.3...tracing-connector-entity-storage-v0.9.2-next.4) (2026-08-18)


### Features

* rename SpanEntity to Span ([5dcca6c](https://github.com/iotaledger/twin-tracing/commit/5dcca6cdb7d24eb047eb9334bd0691b6069df82b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.3 to 0.9.2-next.4

## [0.9.2-next.3](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.2...tracing-connector-entity-storage-v0.9.2-next.3) (2026-08-17)


### Miscellaneous Chores

* **tracing-connector-entity-storage:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.2 to 0.9.2-next.3

## [0.9.2-next.2](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.1...tracing-connector-entity-storage-v0.9.2-next.2) (2026-08-12)


### Miscellaneous Chores

* **tracing-connector-entity-storage:** Synchronize repo versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.1 to 0.9.2-next.2

## [0.9.2-next.1](https://github.com/iotaledger/twin-tracing/compare/tracing-connector-entity-storage-v0.9.2-next.0...tracing-connector-entity-storage-v0.9.2-next.1) (2026-08-07)


### Features

* add twin-tracing repository with OTel-aligned tracing API ([59b914c](https://github.com/iotaledger/twin-tracing/commit/59b914ca631c0b765973dfa5099a8f4e6115e325))
* add twin-tracing repository with OTel-aligned tracing API ([affcd6c](https://github.com/iotaledger/twin-tracing/commit/affcd6c1cf2fbfd34d9a8849e860e5fe66a011e3))
* linting and dependency update ([c1a2b98](https://github.com/iotaledger/twin-tracing/commit/c1a2b988441deb59592d69c7d3b6527bcb9018b2))
* linting and dependency update ([b65c083](https://github.com/iotaledger/twin-tracing/commit/b65c083d4f8f83c2046d29d53444b45c7a4188c7))


### Bug Fixes

* address PR review on tracing packages ([0832b5f](https://github.com/iotaledger/twin-tracing/commit/0832b5fc0e7414b4e0fd2393532df00e07ff1f43))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @twin.org/tracing-models bumped from 0.9.2-next.0 to 0.9.2-next.1

## Changelog
