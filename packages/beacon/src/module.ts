import { Notice, Platform, Plugin } from "obsidian";
import { launchEntry } from "./launch";
import {
	DEFAULT_SETTINGS,
	type DesktopLauncherEntry,
	type LauncherEntry,
	type PluginSettings,
	type ShellLauncherEntry,
} from "./types";
import { applyCollectionXiewerSeedOnce } from "./xiewerTemplate";

export type { PluginSettings as BeaconSettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_BEACON_SETTINGS } from "./types";

function newEntryId(): string {
	return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeEntry(raw: unknown): LauncherEntry | null {
	if (!raw || typeof raw !== "object") return null;
	const obj = raw as Record<string, unknown>;
	const id = typeof obj.id === "string" && obj.id ? obj.id : newEntryId();
	const name = typeof obj.name === "string" ? obj.name.trim() : "";
	const enabled = obj.enabled !== false;

	if (obj.kind === "shell") {
		const command = typeof obj.command === "string" ? obj.command : "";
		if (!name || !command.trim()) return null;
		const entry: ShellLauncherEntry = { id, kind: "shell", name, command, enabled };
		return entry;
	}

	if (obj.kind === "desktop") {
		const desktopId = typeof obj.desktopId === "string" ? obj.desktopId : "";
		const desktopPath = typeof obj.desktopPath === "string" ? obj.desktopPath : "";
		if (!name || !desktopId) return null;
		const entry: DesktopLauncherEntry = {
			id,
			kind: "desktop",
			desktopId,
			desktopPath,
			name,
			enabled,
		};
		return entry;
	}

	return null;
}

/**
 * Beacon (ex-System App Launcher) — desktop launch commands.
 * No Buttons dependency; commands are available for Grimoire `AS button` / Command Palette.
 */
export class BeaconModule {
	settings: PluginSettings;
	private registeredCommandIds: string[] = [];

	constructor(
		private host: Plugin,
		initial: PluginSettings = {
			commandNamePrefix: DEFAULT_SETTINGS.commandNamePrefix,
			entries: [],
			collectionXiewerSeedApplied: false,
		},
	) {
		this.settings = this.normalize(initial);
	}

	get app() {
		return this.host.app;
	}

	get manifest() {
		return this.host.manifest;
	}

	async onload(): Promise<void> {
		if (!Platform.isDesktop) {
			new Notice("Beacon requires the desktop app.");
			return;
		}

		// Decision C: opt-in CollectionXiewer seed once (disabled until user enables).
		if (!this.settings.collectionXiewerSeedApplied) {
			const result = applyCollectionXiewerSeedOnce(this.settings.entries);
			this.settings.entries = result.entries;
			this.settings.collectionXiewerSeedApplied = true;
		}

		this.refreshCommands();
	}

	onunload(): void {
		this.clearCommands();
	}

	applySettings(next: PluginSettings): void {
		this.settings = this.normalize(next);
		this.refreshCommands();
	}

	private normalize(data: Partial<PluginSettings>): PluginSettings {
		const prefix =
			typeof data.commandNamePrefix === "string"
				? data.commandNamePrefix
				: DEFAULT_SETTINGS.commandNamePrefix;
		let entries: LauncherEntry[] = [];
		if (Array.isArray(data.entries)) {
			for (const raw of data.entries) {
				const entry = sanitizeEntry(raw);
				if (entry) entries.push(entry);
			}
		}
		return {
			commandNamePrefix: prefix,
			entries,
			collectionXiewerSeedApplied: data.collectionXiewerSeedApplied === true,
		};
	}

	async reseedCollectionXiewerTemplate(): Promise<boolean> {
		const result = applyCollectionXiewerSeedOnce(this.settings.entries);
		if (!result.seeded) return false;
		this.settings.entries = result.entries;
		this.settings.collectionXiewerSeedApplied = true;
		this.refreshCommands();
		return true;
	}

	getCommandDisplayName(entry: LauncherEntry): string {
		return `${this.settings.commandNamePrefix}${entry.name}`;
	}

	/** Palette / AS-button command label (plugin title prefix from Obsidian). */
	getPaletteActionName(entry: LauncherEntry): string {
		return `${this.host.manifest.name}: ${this.getCommandDisplayName(entry)}`;
	}

	/** @deprecated Buttons retired — alias for palette name. */
	getButtonsActionName(entry: LauncherEntry): string {
		return this.getPaletteActionName(entry);
	}

	hasDuplicateCommandName(entry: LauncherEntry, name: string): boolean {
		const candidate = `${this.settings.commandNamePrefix}${name}`.toUpperCase();
		return this.settings.entries.some((other) => {
			if (other.id === entry.id || !other.enabled) return false;
			return this.getCommandDisplayName(other).toUpperCase() === candidate;
		});
	}

	/** Local command id (Obsidian prefixes with plugin id). */
	commandIdFor(entry: LauncherEntry): string {
		return `monolith-beacon-launch-${entry.id}`;
	}

	/** Full command id for `app.commands.executeCommandById` / Grimoire `cmd:`. */
	getFullCommandId(entry: LauncherEntry): string {
		return `${this.host.manifest.id}:${this.commandIdFor(entry)}`;
	}

	/** Note snippet: `` `q= "cmd:…" AS button` `` */
	getAsButtonSnippet(entry: LauncherEntry): string {
		const label = entry.name.replace(/"/g, '\\"');
		return `\`q= "[${label}](cmd:${this.getFullCommandId(entry)})" AS button\``;
	}

	clearCommands(): void {
		for (const id of this.registeredCommandIds) {
			try {
				this.host.removeCommand(id);
			} catch {
				// ignore
			}
		}
		this.registeredCommandIds = [];
	}

	refreshCommands(): void {
		this.clearCommands();
		const seenNames = new Set<string>();

		for (const entry of this.settings.entries) {
			if (!entry.enabled) continue;
			const displayName = this.getCommandDisplayName(entry);
			const key = displayName.toUpperCase();
			if (seenNames.has(key)) {
				console.warn(`[beacon] Skipping duplicate command name: ${displayName}`);
				continue;
			}
			seenNames.add(key);
			const localId = this.commandIdFor(entry);
			this.host.addCommand({
				id: localId,
				name: displayName,
				callback: () => {
					void this.runLaunch(entry);
				},
			});
			this.registeredCommandIds.push(localId);
		}
	}

	async runLaunch(entry: LauncherEntry): Promise<void> {
		try {
			await launchEntry(entry);
			new Notice(`Launched: ${entry.name}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			new Notice(`Failed to launch ${entry.name}: ${message}`, 8000);
			console.error("[beacon]", err);
		}
	}
}

export type SystemAppLauncherPlugin = BeaconModule;
export default BeaconModule;
