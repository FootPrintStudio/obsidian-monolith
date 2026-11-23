import type { App } from "obsidian";

/** Minimal Epochs API surface used by Grimoire (duck-typed or in-process). */
export interface EpochsDateApi {
	parseDate(value: unknown): { ms: number; calendarId: string } | null;
	formatDate(ms: number, calendarId: string, format?: string): string;
	formatDuration(ms: number, calendarId: string, format?: string): string;
	addDuration(
		ms: number,
		calendarId: string,
		parts: ReadonlyArray<{ amount: number; unit: string }>,
		sign?: 1 | -1,
	): number;
	getCalendar?(id: string): unknown;
}

let appRef: App | null = null;
/** In-process API injected by Monolith (preferred). */
let injectedApi: EpochsDateApi | null = null;
/** Test-only override; production resolves via inject, then legacy duck-type. */
let testApiOverride: EpochsDateApi | null | undefined;

export function setGrimoireApp(app: App | null): void {
	appRef = app;
}

/** Monolith injects the live Epochs module API here (same process, no plugin-id lookup). */
export function setEpochsApi(api: EpochsDateApi | null): void {
	injectedApi = api;
}

/** Inject or clear a duck-typed Epochs API for unit/E2E tests. Pass `undefined` to clear. */
export function setEpochsApiForTests(api: EpochsDateApi | null | undefined): void {
	testApiOverride = api;
}

function isEpochsApi(api: unknown): api is EpochsDateApi {
	if (!api || typeof api !== "object") return false;
	const a = api as EpochsDateApi;
	return (
		typeof a.parseDate === "function" &&
		typeof a.formatDate === "function" &&
		typeof a.formatDuration === "function" &&
		typeof a.addDuration === "function"
	);
}

export function getEpochsApi(): EpochsDateApi | null {
	if (testApiOverride !== undefined) return testApiOverride;
	if (isEpochsApi(injectedApi)) return injectedApi;
	if (!appRef) return null;
	const plugins = (
		appRef as App & {
			plugins?: { plugins?: Record<string, { api?: EpochsDateApi }> };
		}
	).plugins?.plugins;
	// Legacy duck-type fallback (unsupported dual-run; kept for standalone package tests).
	const epochs = plugins?.epochs;
	const api = epochs?.api;
	return isEpochsApi(api) ? api : null;
}
