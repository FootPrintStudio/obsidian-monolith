import { MarkdownView, TFile } from "obsidian";
import type NaviNotePlugin from "./module";
import {
	getPageNameFromPath,
	navigateBack,
	navigateNext,
	navigatePrevious,
	openPage,
	refreshCurrentPage,
} from "./navigation";

const ORACLE_PANEL_SELECTOR = ".oracle-panel, .navinote-panel";

export function createNavigationPanel(
	plugin: NaviNotePlugin,
	view: MarkdownView,
	file: TFile,
): void {
	view.containerEl.querySelector(ORACLE_PANEL_SELECTOR)?.remove();

	const navPanel = view.containerEl.createDiv({ cls: "oracle-panel" });
	const navRow = navPanel.createDiv({ cls: "oracle-row" });

	const leftSection = navRow.createDiv({ cls: "oracle-left" });

	leftSection
		.createEl("button", { text: "↑ Back", cls: "oracle-back-button" })
		.addEventListener("click", () => {
			void navigateBack(plugin.app, file, plugin.settings);
		});

	leftSection
		.createEl("button", { text: "↻ Refresh", cls: "oracle-refresh-button" })
		.addEventListener("click", () => {
			refreshCurrentPage(plugin.app, view);
		});

	const centerSection = navRow.createDiv({ cls: "oracle-center" });
	for (const pagePath of plugin.settings.highLevelNavigation) {
		if (!pagePath.trim()) continue;
		centerSection
			.createEl("button", {
				text: getPageNameFromPath(pagePath),
				cls: "oracle-high-level-button",
			})
			.addEventListener("click", () => {
				void openPage(plugin.app, pagePath, file.path);
			});
	}

	const rightSection = navRow.createDiv({ cls: "oracle-right" });

	rightSection
		.createEl("button", { text: "← Previous", cls: "oracle-prev-button" })
		.addEventListener("click", () => {
			void navigatePrevious(plugin.app, file, plugin.settings);
		});

	rightSection
		.createEl("button", { text: "Next →", cls: "oracle-next-button" })
		.addEventListener("click", () => {
			void navigateNext(plugin.app, file, plugin.settings);
		});

	view.containerEl.insertBefore(navPanel, view.containerEl.firstChild);
}
