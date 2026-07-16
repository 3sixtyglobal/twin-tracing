// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@twin.org/core";
import type { ITracingConnector } from "../models/ITracingConnector.js";

/**
 * Factory for creating tracing connectors.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TracingConnectorFactory = Factory.createFactory<ITracingConnector>("tracing");
