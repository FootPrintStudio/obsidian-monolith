import { Plugin, TFile } from "obsidian";
import { createGalleryBlock, GalleryBlock } from "./galleryBlock";
import { registerMarkdownImageLightbox } from "./noteLightbox";
import { DEFAULT_SETTINGS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type MediaGallerySettings } from "./types";
import { clearXiewerSessionMemory, revokeXiewerObjectUrls } from "./xiewerClient";

export type { MediaGallerySettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_OCULUS_SETTINGS } from "./types";

const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

/** Oculus spine module — `oculus` code-block + markdown image lightbox. */
export class OculusModule {
	settings: MediaGallerySettings;
	private activeBlocks = new Set<GalleryBlock>();
	private refreshTimer: number | null = null;

	constructor(
		private host: Plugin,
		initial: MediaGallerySettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...initial };
	}

	get app() {
		return this.host.app;
	}

	async onload(): Promise<void> {
		this.host.registerMarkdownCodeBlockProcessor("oculus", (source, el, ctx) => {
			createGalleryBlock(el, ctx, this, source);
		});

		registerMarkdownImageLightbox(this.host, () => this.settings);

		this.host.registerEvent(
			this.host.app.vault.on("create", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.host.registerEvent(
			this.host.app.vault.on("delete", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.host.registerEvent(
			this.host.app.vault.on("rename", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
		this.host.registerEvent(
			this.host.app.vault.on("modify", (file) => {
				if (file instanceof TFile && MEDIA_EXTENSIONS.has(file.extension.toLowerCase())) {
					this.scheduleRefresh();
				}
			}),
		);
	}

	onunload(): void {
		this.activeBlocks.clear();
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
		revokeXiewerObjectUrls();
		clearXiewerSessionMemory();
	}

	registerGalleryBlock(block: GalleryBlock): void {
		this.activeBlocks.add(block);
		block.register(() => this.activeBlocks.delete(block));
	}

	scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refreshAllBlocks();
		}, 750);
	}

	async refreshAllBlocks(): Promise<void> {
		for (const block of [...this.activeBlocks]) {
			await block.render();
		}
	}

	applySettings(next: MediaGallerySettings): void {
		this.settings = { ...DEFAULT_SETTINGS, ...next };
		void this.refreshAllBlocks();
	}
}

export type OculusPlugin = OculusModule;
export default OculusModule;
