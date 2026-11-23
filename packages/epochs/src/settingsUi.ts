import { App, Setting } from "obsidian";
import { createCalendarNote } from "./createCalendar";
import { CreateCalendarModal } from "./createModal";
import { DEFAULT_SETTINGS, type EpochsSettings } from "./types";

export interface EpochsCalendarSummary {
	id: string;
	name: string;
	path: string;
}

export interface EpochsSettingsUiCtx {
	app: App;
	settings: EpochsSettings;
	persist: () => Promise<void>;
	/** Rebuild calendar index after folder changes / create. */
	rebuildIndex: () => Promise<void>;
	listCalendars: () => EpochsCalendarSummary[];
	/** Refresh settings UI after create (optional). */
	redisplay?: () => void;
}

/** Package-owned Epochs settings fields — single source for host + standalone tab. */
export function renderEpochsSettings(containerEl: HTMLElement, ctx: EpochsSettingsUiCtx): void {
	const { settings } = ctx;

	containerEl.createEl("p", {
		text: "Define fictional calendars as notes, then format them with Grimoire date functions. Epochs↔Grimoire inject binds at Monolith load — toggle either module, then Reload Monolith.",
	});

	new Setting(containerEl)
		.setName("Calendars folder")
		.setDesc(
			"Vault folder for calendar notes. Changing this does not move existing notes; the calendar index rebuilds automatically.",
		)
		.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.calendarsFolder)
				.setValue(settings.calendarsFolder)
				.onChange(async (value) => {
					settings.calendarsFolder = value.trim() || DEFAULT_SETTINGS.calendarsFolder;
					await ctx.persist();
					await ctx.rebuildIndex();
					ctx.redisplay?.();
				}),
		);

	new Setting(containerEl)
		.setName("Default calendar id")
		.setDesc("Optional. Reserved for future ambiguous parses.")
		.addText((text) =>
			text.setValue(settings.defaultCalendarId).onChange(async (value) => {
				settings.defaultCalendarId = value.trim();
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Create calendar")
		.setDesc("Creates a new note in the calendars folder with every field prefilled.")
		.addButton((btn) =>
			btn
				.setButtonText("Create…")
				.setCta()
				.onClick(() => {
					new CreateCalendarModal(ctx.app, async (name) => {
						const file = await createCalendarNote(ctx.app, settings.calendarsFolder, name);
						if (file) {
							await ctx.rebuildIndex();
							await ctx.app.workspace.getLeaf(true).openFile(file);
							ctx.redisplay?.();
						}
					}).open();
				}),
		);

	const listed = ctx.listCalendars();
	containerEl.createEl("h3", { text: "Loaded calendars" });
	if (listed.length === 0) {
		containerEl.createEl("p", {
			text: "None yet — create a calendar or add notes with epochs: calendar in the folder.",
		});
	} else {
		for (const cal of listed) {
			containerEl.createEl("p", {
				text: `${cal.name} (id: ${cal.id}) — ${cal.path}`,
			});
		}
	}
}
