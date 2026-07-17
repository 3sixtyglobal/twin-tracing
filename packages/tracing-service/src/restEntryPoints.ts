// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import { generateRestRoutesTracing, tagsTracing } from "./tracingRoutes.js";

/**
 * REST entry points for the tracing service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "tracing",
		defaultBaseRoute: "tracing",
		tags: tagsTracing,
		generateRoutes: generateRestRoutesTracing
	}
];
