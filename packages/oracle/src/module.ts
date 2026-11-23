import { MarkdownView, Plugin } from "obsidian";
import { createNavigationPanel } from "./navigationPanel";
import { DEFAULT_SETTINGS, type NaviNoteSettings } from "./types";

export type { NaviNoteSettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_ORACLE_SETTINGS } from "./types";

/** Oracle (ex-NaviNote) — optional navigation panel module. */
export class OracleModule {
	settings: NaviNoteSettings;

	constructor(
		private host: Plugin,
		initial: NaviNoteSettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = normalizeOracleSettings(initial);
	}

	get app() {
		return this.host.app;
	}

	async onload(): Promise<void> {
		const refreshPanel = (): void => {
			this.updateNavigationPanel();
		};

		this.host.registerEvent(this.host.app.workspace.on("file-open", refreshPanel));
		this.host.registerEvent(this.host.app.workspace.on("active-leaf-change", refreshPanel));
		this.host.registerEvent(this.host.app.workspace.on("layout-change", refreshPanel));

		this.updateNavigationPanel();
	}

	onunload(): void {
		this.host.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				leaf.view.containerEl.querySelector(".oracle-panel, .navinote-panel")?.remove();
			}
		});
	}

	applySettings(next: NaviNoteSettings): void {
		this.settings = normalizeOracleSettings(next);
		this.updateNavigationPanel();
	}

	updateNavigationPanel(): void {
		const view = this.host.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) return;
		createNavigationPanel(this, view, view.file);
	}
}

function normalizeOracleSettings(data: Partial<NaviNoteSettings>): NaviNoteSettings {
	return {
		...DEFAULT_SETTINGS,
		...data,
		highLevelNavigation: data.highLevelNavigation ?? DEFAULT_SETTINGS.highLevelNavigation,
		folderNavigation: { ...(data.folderNavigation ?? {}) },
		backButtonField: data.backButtonField ?? DEFAULT_SETTINGS.backButtonField,
	};
}

export type NaviNotePlugin = OracleModule;
export default OracleModule;
