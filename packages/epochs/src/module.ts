import { Plugin, TFile } from "obsidian";
import { EpochsApi } from "./api";
import { createCalendarNote } from "./createCalendar";
import { CreateCalendarModal } from "./createModal";
import { CalendarIndex } from "./index";
import { DEFAULT_SETTINGS, type EpochsSettings } from "./types";

export type { EpochsSettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_EPOCHS_SETTINGS } from "./types";
export { EpochsApi } from "./api";

/** Epochs spine module — registers onto the Monolith host plugin. */
export class EpochsModule {
	settings: EpochsSettings;
	index: CalendarIndex;
	api: EpochsApi;

	constructor(
		private host: Plugin,
		initial: EpochsSettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...initial };
		this.index = new CalendarIndex(this.host.app, () => this.settings.calendarsFolder);
		this.api = new EpochsApi(this.index);
	}

	async onload(): Promise<void> {
		this.host.addCommand({
			id: "monolith-epochs-create-calendar",
			name: "Epochs: Create calendar",
			callback: () => {
				new CreateCalendarModal(this.host.app, async (name) => {
					const file = await createCalendarNote(
						this.host.app,
						this.settings.calendarsFolder,
						name,
					);
					if (file) {
						await this.rebuildIndex();
						await this.host.app.workspace.getLeaf(true).openFile(file);
					}
				}).open();
			},
		});

		this.host.addCommand({
			id: "monolith-epochs-rebuild-index",
			name: "Epochs: Rebuild calendar index",
			callback: () => void this.rebuildIndex(),
		});

		this.host.app.workspace.onLayoutReady(() => void this.rebuildIndex());

		this.host.registerEvent(
			this.host.app.metadataCache.on("changed", (file) => {
				if (file instanceof TFile) void this.index.ingestFile(file);
			}),
		);
		this.host.registerEvent(
			this.host.app.vault.on("delete", (file) => {
				if (file instanceof TFile) this.index.removeFile(file.path);
			}),
		);
		this.host.registerEvent(
			this.host.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					this.index.removeFile(oldPath);
					void this.index.ingestFile(file);
				}
			}),
		);
	}

	async rebuildIndex(): Promise<void> {
		await this.index.rebuild();
	}

	applySettings(next: EpochsSettings): void {
		this.settings = { ...DEFAULT_SETTINGS, ...next };
		if (!this.settings.calendarsFolder?.trim()) {
			this.settings.calendarsFolder = DEFAULT_SETTINGS.calendarsFolder;
		}
	}
}
