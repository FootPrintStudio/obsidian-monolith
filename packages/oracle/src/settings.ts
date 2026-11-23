import { App, Component, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type NaviNotePlugin from "./main";
import { renderReadmePanel, renderSettingsTabBar, type PluginSettingsTabId } from "./readmeTab";
import { parseHighLevelNavigation } from "./types";

class TextPromptModal extends Modal {
	private title: string;
	private initialValue: string;
	private placeholder: string;
	private onSubmit: (value: string | null) => void;

	constructor(
		app: App,
		title: string,
		initialValue: string,
		placeholder: string,
		onSubmit: (value: string | null) => void,
	) {
		super(app);
		this.title = title;
		this.initialValue = initialValue;
		this.placeholder = placeholder;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		this.titleEl.setText(this.title);
		const input = this.contentEl.createEl("input", {
			type: "text",
			value: this.initialValue,
			placeholder: this.placeholder,
		});
		input.style.width = "100%";

		const footer = this.contentEl.createDiv({ cls: "navinote-modal-footer" });
		footer.createEl("button", { text: "Cancel" }).addEventListener("click", () => {
			this.close();
			this.onSubmit(null);
		});
		footer
			.createEl("button", { text: "Save", cls: "mod-cta" })
			.addEventListener("click", () => {
				this.close();
				this.onSubmit(input.value.trim());
			});

		window.setTimeout(() => input.focus(), 50);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function promptText(
	app: App,
	title: string,
	initialValue = "",
	placeholder = "",
): Promise<string | null> {
	return new Promise((resolve) => {
		new TextPromptModal(app, title, initialValue, placeholder, resolve).open();
	});
}

export class NaviNoteSettingTab extends PluginSettingTab {
	plugin: NaviNotePlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();
	private highLevelSaveTimer: number | null = null;

	constructor(app: App, plugin: NaviNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		if (this.highLevelSaveTimer != null) {
			window.clearTimeout(this.highLevelSaveTimer);
			this.highLevelSaveTimer = null;
		}
		this.readmeComponent.unload();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.readmeComponent.unload();
		this.readmeComponent = new Component();

		containerEl.createEl("h2", { text: "NaviNote" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "navinote");

		const content = containerEl.createDiv({ cls: "navinote-settings-content" });

		if (this.activeTab === "readme") {
			const pluginDir =
				this.plugin.manifest.dir ??
				`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
			renderReadmePanel(this.app, content, this.readmeComponent, "navinote-readme-panel", pluginDir);
			return;
		}

		this.displaySettings(content);
	}

	private displaySettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("High Level Navigation")
			.setDesc(
				'Comma-separated list of high-level pages. Use format: "folder/subfolder/page.md" or just "page.md" for top-level pages.',
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("Home.md, folder/Index.md, Documents/Gallery.md")
					.setValue(this.plugin.settings.highLevelNavigation.join(", "))
					.onChange((value) => {
						if (this.highLevelSaveTimer != null) {
							window.clearTimeout(this.highLevelSaveTimer);
						}
						this.highLevelSaveTimer = window.setTimeout(() => {
							void (async () => {
								this.plugin.settings.highLevelNavigation =
									parseHighLevelNavigation(value);
								await this.plugin.saveSettings();
							})();
						}, 400);
					});
			});

		new Setting(containerEl)
			.setName("Back Button Field")
			.setDesc(
				'Frontmatter field for the back button. Common values: "pageParent" (World-Building) or "parentPage" (FootPrint.Studio).',
			)
			.addText((text) => {
				text
					.setPlaceholder("pageParent")
					.setValue(this.plugin.settings.backButtonField)
					.onChange(async (value) => {
						this.plugin.settings.backButtonField = value.trim() || "pageParent";
						await this.plugin.saveSettings();
					});
			});

		containerEl.createEl("h3", { text: "Folder Navigation Settings" });

		new Setting(containerEl)
			.setName("Add Folder Navigation Rule")
			.addButton((button) =>
				button.setButtonText("+").onClick(async () => {
					const newFolder = await promptText(
						this.app,
						"Enter folder path",
						"",
						"Characters",
					);
					if (!newFolder) return;

					if (!this.app.vault.getAbstractFileByPath(newFolder)) {
						new Notice(`Folder "${newFolder}" was not found in this vault.`);
					}

					if (!this.plugin.settings.folderNavigation[newFolder]) {
						this.plugin.settings.folderNavigation[newFolder] = "file.name";
						await this.plugin.saveSettings();
						this.display();
					} else {
						new Notice(`A rule for "${newFolder}" already exists.`);
					}
				}),
			);

		for (const [folder, sortField] of Object.entries(this.plugin.settings.folderNavigation)) {
			const setting = new Setting(containerEl)
				.setName("Folder")
				.addText((text) => text.setValue(folder).setDisabled(true))
				.addButton((button) =>
					button
						.setIcon("pencil")
						.setTooltip("Edit folder name")
						.onClick(async () => {
							const newFolder = await promptText(
								this.app,
								"Enter folder path",
								folder,
								folder,
							);
							if (
								newFolder &&
								newFolder !== folder &&
								!this.plugin.settings.folderNavigation[newFolder]
							) {
								this.plugin.settings.folderNavigation[newFolder] =
									this.plugin.settings.folderNavigation[folder] ?? "file.name";
								delete this.plugin.settings.folderNavigation[folder];
								await this.plugin.saveSettings();
								this.display();
							}
						}),
				)
				.addDropdown((dropdown) => {
					dropdown
						.addOption("file.name", "File Name")
						.addOption("frontmatter", "Frontmatter Field")
						.setValue(sortField.startsWith("frontmatter.") ? "frontmatter" : sortField)
						.onChange(async (value) => {
							if (value === "frontmatter") {
								const currentField = sortField.startsWith("frontmatter.")
									? sortField.split(".")[1] ?? ""
									: "";
								const custom = await promptText(
									this.app,
									"Enter frontmatter field name",
									currentField,
									"sortOrder",
								);
								if (custom) {
									this.plugin.settings.folderNavigation[folder] = `frontmatter.${custom}`;
									await this.plugin.saveSettings();
									this.display();
								}
							} else {
								this.plugin.settings.folderNavigation[folder] = value;
								await this.plugin.saveSettings();
								this.display();
							}
						});
					return dropdown;
				})
				.addButton((button) =>
					button
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(async () => {
							delete this.plugin.settings.folderNavigation[folder];
							await this.plugin.saveSettings();
							this.display();
						}),
				);

			if (sortField.startsWith("frontmatter.")) {
				setting.setDesc(`Frontmatter field: ${sortField.split(".")[1] ?? ""}`);
				setting.addButton((button) =>
					button
						.setIcon("pencil")
						.setTooltip("Edit frontmatter field")
						.onClick(async () => {
							const custom = await promptText(
								this.app,
								"Enter frontmatter field name",
								sortField.split(".")[1] ?? "",
								"sortOrder",
							);
							if (custom) {
								this.plugin.settings.folderNavigation[folder] = `frontmatter.${custom}`;
								await this.plugin.saveSettings();
								this.display();
							}
						}),
				);
			}
		}
	}
}
