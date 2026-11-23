import { App, Component, MarkdownRenderer } from "obsidian";
import AUGUR_GUIDE from "../packages/augur/docs/GUIDE.md";
import AUGUR_README from "../packages/augur/README.md";
import BEACON_README from "../packages/beacon/README.md";
import EPOCHS_GUIDE from "../packages/epochs/docs/GUIDE.md";
import EPOCHS_README from "../packages/epochs/README.md";
import GRIMOIRE_GUIDE from "../packages/grimoire/docs/GUIDE.md";
import GRIMOIRE_README from "../packages/grimoire/README.md";
import LEXICON_GUIDE from "../packages/lexicon/docs/GUIDE.md";
import LEXICON_README from "../packages/lexicon/README.md";
import OCULUS_GUIDE from "../packages/oculus/docs/GUIDE.md";
import OCULUS_README from "../packages/oculus/README.md";
import ORACLE_README from "../packages/oracle/README.md";
import VISAGE_GUIDE from "../packages/visage/docs/GUIDE.md";
import VISAGE_README from "../packages/visage/README.md";

export type ModuleDocsTabId = "settings" | "readme" | "guide";

export type ModuleDocKey =
	| "grimoire"
	| "epochs"
	| "visage"
	| "oculus"
	| "augur"
	| "lexicon"
	| "oracle"
	| "beacon";

const DOCS: Record<ModuleDocKey, { readme: string; guide?: string }> = {
	grimoire: { readme: GRIMOIRE_README, guide: GRIMOIRE_GUIDE },
	epochs: { readme: EPOCHS_README, guide: EPOCHS_GUIDE },
	visage: { readme: VISAGE_README, guide: VISAGE_GUIDE },
	oculus: { readme: OCULUS_README, guide: OCULUS_GUIDE },
	augur: { readme: AUGUR_README, guide: AUGUR_GUIDE },
	lexicon: { readme: LEXICON_README, guide: LEXICON_GUIDE },
	oracle: { readme: ORACLE_README },
	beacon: { readme: BEACON_README },
};

export function renderModuleDocsTabBar(
	container: HTMLElement,
	moduleKey: ModuleDocKey,
	activeTab: ModuleDocsTabId,
	onSelect: (tab: ModuleDocsTabId) => void,
): void {
	const { guide } = DOCS[moduleKey];
	container.empty();
	container.addClass("monolith-module-docs-tabs");

	const tabs: { id: ModuleDocsTabId; label: string }[] = [
		{ id: "settings", label: "Settings" },
		{ id: "readme", label: "README" },
	];
	if (guide) tabs.push({ id: "guide", label: "Guide" });

	for (const tab of tabs) {
		const btn = container.createDiv({
			cls: `monolith-module-docs-tab${activeTab === tab.id ? " is-active" : ""}`,
			text: tab.label,
		});
		btn.addEventListener("click", () => {
			if (activeTab !== tab.id) onSelect(tab.id);
		});
	}
}

export function renderModuleDocPanel(
	app: App,
	container: HTMLElement,
	component: Component,
	moduleKey: ModuleDocKey,
	tab: "readme" | "guide",
): void {
	const doc = DOCS[moduleKey];
	const markdown = tab === "readme" ? doc.readme : doc.guide;
	container.empty();
	container.addClass("monolith-module-doc-panel");
	if (!markdown) {
		container.createEl("p", { text: "No Guide for this module." });
		return;
	}
	void MarkdownRenderer.render(app, markdown, container, "", component);
}
