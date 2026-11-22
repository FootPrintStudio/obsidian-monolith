import { Compartment } from "@codemirror/state";
import { Plugin, TFile } from "obsidian";
import { pqEditorHighlightExtension } from "./editorHighlight";
import { setEpochsApi, setGrimoireApp, type EpochsDateApi } from "./epochsBridge";
import { processPropertyQueriesInElement } from "./render";
import { rerenderAllMarkdownViews, rerenderViewsForFile } from "./refresh";
import { DEFAULT_SETTINGS, type PropertyQuerySettings } from "./types";

export type { PropertyQuerySettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_GRIMOIRE_SETTINGS } from "./types";
export { setEpochsApi, getEpochsApi, type EpochsDateApi } from "./epochsBridge";

/** Grimoire spine module — postprocessor priority −101 (before Dataview −100). */
export class GrimoireModule {
	settings: PropertyQuerySettings;
	private readonly highlightCompartment = new Compartment();

	constructor(
		private host: Plugin,
		initial: PropertyQuerySettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...initial };
	}

	/**
	 * @param epochsApi In-process Epochs API from Monolith (preferred over duck-type plugin id).
	 */
	async onload(epochsApi: EpochsDateApi | null): Promise<void> {
		setGrimoireApp(this.host.app);
		setEpochsApi(epochsApi);

		// Explicit order vs Visage (0) and Dataview (−100): Grimoire first.
		this.host.registerMarkdownPostProcessor((element, ctx) => {
			processPropertyQueriesInElement(this.host.app, element, ctx, this.settings);
		}, -101);

		this.host.registerEditorExtension(
			this.highlightCompartment.of(pqEditorHighlightExtension(() => this.settings)),
		);

		this.host.registerEvent(
			this.host.app.metadataCache.on("changed", (file) => {
				if (!this.settings.refreshOnMetadataChange) return;
				if (file instanceof TFile) {
					rerenderViewsForFile(this.host.app, file);
				}
			}),
		);
	}

	applySettings(next: PropertyQuerySettings): void {
		this.settings = normalizeGrimoireSettings(next);
		this.highlightCompartment.reconfigure(pqEditorHighlightExtension(() => this.settings));
		rerenderAllMarkdownViews(this.host.app);
	}

	onunload(): void {
		setEpochsApi(null);
		setGrimoireApp(null);
	}
}

export function normalizeGrimoireSettings(
	data: Partial<PropertyQuerySettings> | null | undefined,
): PropertyQuerySettings {
	const settings = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
	for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof PropertyQuerySettings)[]) {
		const value = settings[key];
		if (value === undefined || value === null || value === "") {
			settings[key] = DEFAULT_SETTINGS[key] as never;
		}
	}
	return settings;
}
