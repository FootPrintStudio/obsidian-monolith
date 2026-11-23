import { App, Modal, Notice, Setting } from "obsidian";
import { parseHighLevelNavigation, type NaviNoteSettings } from "./types";

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

		const footer = this.contentEl.createDiv({ cls: "oracle-modal-footer" });
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

export interface OracleSettingsUiCtx {
	app: App;
	settings: NaviNoteSettings;
	persist: () => Promise<void>;
	redisplay: () => void;
}

/** Package-owned Oracle settings fields — single source for host + standalone tab. */
export function renderOracleSettings(containerEl: HTMLElement, ctx: OracleSettingsUiCtx): void {
	const { settings } = ctx;
	let highLevelSaveTimer: number | null = null;

	new Setting(containerEl)
		.setName("High Level Navigation")
		.setDesc(
			'Comma-separated list of high-level pages. Use format: "folder/subfolder/page.md" or just "page.md" for top-level pages.',
		)
		.addTextArea((text) => {
			text
				.setPlaceholder("Home.md, folder/Index.md, Documents/Gallery.md")
				.setValue(settings.highLevelNavigation.join(", "))
				.onChange((value) => {
					if (highLevelSaveTimer != null) {
						window.clearTimeout(highLevelSaveTimer);
					}
					highLevelSaveTimer = window.setTimeout(() => {
						void (async () => {
							settings.highLevelNavigation = parseHighLevelNavigation(value);
							await ctx.persist();
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
				.setValue(settings.backButtonField)
				.onChange(async (value) => {
					settings.backButtonField = value.trim() || "pageParent";
					await ctx.persist();
				});
		});

	containerEl.createEl("h3", { text: "Folder Navigation Settings" });

	new Setting(containerEl)
		.setName("Add Folder Navigation Rule")
		.addButton((button) =>
			button.setButtonText("+").onClick(async () => {
				const newFolder = await promptText(ctx.app, "Enter folder path", "", "Characters");
				if (!newFolder) return;

				if (!ctx.app.vault.getAbstractFileByPath(newFolder)) {
					new Notice(`Folder "${newFolder}" was not found in this vault.`);
				}

				if (!settings.folderNavigation[newFolder]) {
					settings.folderNavigation[newFolder] = "file.name";
					await ctx.persist();
					ctx.redisplay();
				} else {
					new Notice(`A rule for "${newFolder}" already exists.`);
				}
			}),
		);

	for (const [folder, sortField] of Object.entries(settings.folderNavigation)) {
		const setting = new Setting(containerEl)
			.setName("Folder")
			.addText((text) => text.setValue(folder).setDisabled(true))
			.addButton((button) =>
				button
					.setIcon("pencil")
					.setTooltip("Edit folder name")
					.onClick(async () => {
						const newFolder = await promptText(ctx.app, "Enter folder path", folder, folder);
						if (newFolder && newFolder !== folder && !settings.folderNavigation[newFolder]) {
							settings.folderNavigation[newFolder] =
								settings.folderNavigation[folder] ?? "file.name";
							delete settings.folderNavigation[folder];
							await ctx.persist();
							ctx.redisplay();
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
								? (sortField.split(".")[1] ?? "")
								: "";
							const custom = await promptText(
								ctx.app,
								"Enter frontmatter field name",
								currentField,
								"sortOrder",
							);
							if (custom) {
								settings.folderNavigation[folder] = `frontmatter.${custom}`;
								await ctx.persist();
								ctx.redisplay();
							}
						} else {
							settings.folderNavigation[folder] = value;
							await ctx.persist();
							ctx.redisplay();
						}
					});
				return dropdown;
			})
			.addButton((button) =>
				button
					.setIcon("trash")
					.setTooltip("Delete rule")
					.onClick(async () => {
						delete settings.folderNavigation[folder];
						await ctx.persist();
						ctx.redisplay();
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
							ctx.app,
							"Enter frontmatter field name",
							sortField.split(".")[1] ?? "",
							"sortOrder",
						);
						if (custom) {
							settings.folderNavigation[folder] = `frontmatter.${custom}`;
							await ctx.persist();
							ctx.redisplay();
						}
					}),
			);
		}
	}
}
