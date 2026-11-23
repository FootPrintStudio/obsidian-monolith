import { App, Platform, Setting } from "obsidian";
import { isMediaExtendedAvailable } from "./mediaExtended";
import { DEFAULT_SETTINGS, VIEW_TYPES, type MediaGallerySettings } from "./types";
import { isPrivateOrLoopbackBaseUrl } from "./xiewerBaseUrl";
import { revokeXiewerObjectUrls } from "./xiewerClient";

export interface OculusSettingsUiCtx {
	app: App;
	settings: MediaGallerySettings;
	/** Persist host/module settings bag (settings object is mutated in place). */
	persist: () => Promise<void>;
	/** Refresh UI after CollectionXiewer URL changes (loopback warning copy). */
	redisplay?: () => void;
}

/** Package-owned Oculus settings fields — single source for host + standalone tab. */
export function renderOculusSettings(containerEl: HTMLElement, ctx: OculusSettingsUiCtx): void {
	const { app, settings } = ctx;

	new Setting(containerEl)
		.setName("Allow remote media")
		.setDesc(
			"Enable URL: entries for remote images, direct video links, and hosted platforms. Off by default (author URLs can hit LAN/metadata).",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.allowRemoteImages).onChange(async (value) => {
				settings.allowRemoteImages = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Remote media host allowlist")
		.setDesc(
			"Optional. Comma or newline separated hostnames (e.g. cdn.example.com, *.github.io). Empty = any host when remote media is on.",
		)
		.addTextArea((area) =>
			area
				.setPlaceholder("cdn.example.com\n*.github.io")
				.setValue(settings.remoteMediaHostAllowlist)
				.onChange(async (value) => {
					settings.remoteMediaHostAllowlist = value;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Validate remote Content-Type")
		.setDesc(
			"When enabled, URL entries without a recognized extension are checked via HEAD/GET before loading.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.validateRemoteContentType).onChange(async (value) => {
				settings.validateRemoteContentType = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Remote request timeout")
		.setDesc("Milliseconds to wait when probing remote Content-Type.")
		.addText((text) =>
			text
				.setPlaceholder("30000")
				.setValue(String(settings.remoteLoadTimeoutMs))
				.onChange(async (value) => {
					const parsed = Number.parseInt(value.trim(), 10);
					if (Number.isNaN(parsed) || parsed < 1000) return;
					settings.remoteLoadTimeoutMs = parsed;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Show captions")
		.addToggle((toggle) =>
			toggle.setValue(settings.showCaptions).onChange(async (value) => {
				settings.showCaptions = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Caption max lines")
		.addSlider((slider) =>
			slider
				.setLimits(1, 5, 1)
				.setValue(settings.captionMaxLines)
				.setDynamicTooltip()
				.onChange(async (value) => {
					settings.captionMaxLines = value;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Use Media Extended for videos")
		.setDesc(
			Platform.isDesktopApp && isMediaExtendedAvailable(app)
				? "Open local and direct URL videos in Media Extended when a gallery tile is clicked. Hosted platform URLs (YouTube, Vimeo, etc.) always use Media Extended. Images still use the built-in lightbox."
				: "Requires the Media Extended plugin (desktop). Local and direct URL videos use the lightbox when unavailable. Hosted platform URLs will not resolve without Media Extended.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.useMediaExtendedPlayback).onChange(async (value) => {
				settings.useMediaExtendedPlayback = value;
				await ctx.persist();
			}),
		);

	if (!Platform.isDesktopApp || !isMediaExtendedAvailable(app)) {
		new Setting(containerEl).setName("Hosted platform URLs").setDesc(
			"YouTube, Vimeo, Bilibili, and Coursera links require Media Extended on desktop. They will show a resolve warning until Media Extended is installed and enabled.",
		);
	}

	new Setting(containerEl)
		.setName("Lightbox note images")
		.setDesc(
			"Click wiki embeds and markdown images in notes to open the Oculus lightbox. Ctrl/Cmd, Alt, and Shift+click keep Obsidian’s default behavior. Gallery tiles always use the lightbox.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.lightboxMarkdownImages).onChange(async (value) => {
				settings.lightboxMarkdownImages = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Default view")
		.setDesc("Used when VIEW is omitted from a block.")
		.addDropdown((dropdown) => {
			for (const view of VIEW_TYPES) dropdown.addOption(view, view);
			dropdown.setValue(settings.defaultView).onChange(async (value) => {
				settings.defaultView = value as typeof DEFAULT_SETTINGS.defaultView;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default filter")
		.setDesc("Used when FILTER is omitted from a block.")
		.addDropdown((dropdown) => {
			dropdown.addOption("all", "All media");
			dropdown.addOption("images", "Images only");
			dropdown.addOption("video", "Video only");
			dropdown.setValue(settings.defaultFilter).onChange(async (value) => {
				settings.defaultFilter = value as typeof DEFAULT_SETTINGS.defaultFilter;
				await ctx.persist();
			});
		});

	const xiewerPrivate = isPrivateOrLoopbackBaseUrl(settings.collectionXiewerBaseUrl);
	new Setting(containerEl)
		.setName("CollectionXiewer API URL")
		.setDesc(
			xiewerPrivate
				? "Loopback/private base URL for XIEWER: sources (default http://127.0.0.1:47821). CollectionXiewer must be running. Non-private hosts are refused at request time (token stays local)."
				: "Blocked: this host is not loopback/private. XIEWER: requests will not send the local token off-machine. Use http://127.0.0.1:47821 or a LAN private address.",
		)
		.addText((text) =>
			text
				.setPlaceholder("http://127.0.0.1:47821")
				.setValue(settings.collectionXiewerBaseUrl)
				.onChange(async (value) => {
					const trimmed = value.trim().replace(/\/+$/, "");
					const next = trimmed || DEFAULT_SETTINGS.collectionXiewerBaseUrl;
					const prev = settings.collectionXiewerBaseUrl;
					settings.collectionXiewerBaseUrl = next;
					if (prev !== next) {
						revokeXiewerObjectUrls();
						await ctx.persist();
						ctx.redisplay?.();
						return;
					}
					await ctx.persist();
				}),
		);
}
