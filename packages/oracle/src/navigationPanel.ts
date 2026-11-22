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

export function createNavigationPanel(
	plugin: NaviNotePlugin,
	view: MarkdownView,
	file: TFile,
): void {
	const existingPanel = view.containerEl.querySelector(".navinote-panel");
	existingPanel?.remove();

	const navPanel = view.containerEl.createDiv({ cls: "navinote-panel" });
	const navRow = navPanel.createDiv({ cls: "navinote-row" });

	const leftSection = navRow.createDiv({ cls: "navinote-left" });

	leftSection
		.createEl("button", { text: "↑ Back", cls: "navinote-back-button" })
		.addEventListener("click", () => {
			void navigateBack(plugin.app, file, plugin.settings);
		});

	leftSection
		.createEl("button", { text: "↻ Refresh", cls: "navinote-refresh-button" })
		.addEventListener("click", () => {
			refreshCurrentPage(plugin.app, view);
		});

	const centerSection = navRow.createDiv({ cls: "navinote-center" });
	for (const pagePath of plugin.settings.highLevelNavigation) {
		if (!pagePath.trim()) continue;
		centerSection
			.createEl("button", {
				text: getPageNameFromPath(pagePath),
				cls: "navinote-high-level-button",
			})
			.addEventListener("click", () => {
				void openPage(plugin.app, pagePath, file.path);
			});
	}

	const rightSection = navRow.createDiv({ cls: "navinote-right" });

	rightSection
		.createEl("button", { text: "← Previous", cls: "navinote-prev-button" })
		.addEventListener("click", () => {
			void navigatePrevious(plugin.app, file, plugin.settings);
		});

	rightSection
		.createEl("button", { text: "Next →", cls: "navinote-next-button" })
		.addEventListener("click", () => {
			void navigateNext(plugin.app, file, plugin.settings);
		});

	view.containerEl.insertBefore(navPanel, view.containerEl.firstChild);
}
