import { MarkdownView, Notice, Plugin, type Editor } from "obsidian";
import { setMonolithCompanions, type MonolithCompanionBag } from "./companions";
import { GalleryBuilderModal } from "./oculus/builderModal";
import { VaultPathBrowser, formatPickedPath } from "./picker/pathBrowser";
import { AugurEditorSuggest } from "./suggest/editorSuggest";
import { DEFAULT_SETTINGS, type AugurSettings } from "./types";
import { formatVTabsBlock, formatVTabsTemplate } from "./visage/formatTabs";
import { resolveVisageDefaults } from "./companions";

export type { AugurSettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_AUGUR_SETTINGS } from "./types";
export { setMonolithCompanions, type MonolithCompanionBag } from "./companions";

/** Augur spine module — editor suggest + insert commands. */
export class AugurModule {
	settings: AugurSettings;

	constructor(
		private host: Plugin,
		initial: AugurSettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...initial };
	}

	async onload(companions: MonolithCompanionBag | null): Promise<void> {
		setMonolithCompanions(companions);

		this.host.registerEditorSuggest(
			new AugurEditorSuggest(this.host.app, () => this.settings),
		);

		this.host.addCommand({
			id: "monolith-augur-insert-oculus",
			name: "Augur: Insert Oculus gallery",
			icon: "images",
			editorCheckCallback: (checking) => {
				const editor = this.activeEditor();
				if (checking) return Boolean(editor);
				if (!editor) {
					new Notice("Open a note to insert an Oculus gallery block.");
					return false;
				}
				new GalleryBuilderModal(this.host.app, this.settings, editor).open();
				return true;
			},
		});

		this.host.addCommand({
			id: "monolith-augur-insert-v-tabs",
			name: "Augur: Insert Visage tabs",
			icon: "layout",
			editorCheckCallback: (checking) => {
				const editor = this.activeEditor();
				if (checking) return Boolean(editor);
				if (!editor) {
					new Notice("Open a note to insert a Visage tabs block.");
					return false;
				}
				const block = formatVTabsBlock(
					formatVTabsTemplate(resolveVisageDefaults(this.host.app, this.settings)),
				);
				const cursor = editor.getCursor();
				editor.replaceRange(`${block}\n`, cursor);
				new Notice("Visage tabs block inserted.");
				return true;
			},
		});

		this.host.addCommand({
			id: "monolith-augur-pick-folder",
			name: "Augur: Pick vault folder",
			icon: "folder",
			editorCheckCallback: (checking) => {
				const editor = this.activeEditor();
				if (checking) return Boolean(editor);
				if (!editor) {
					new Notice("Open a note to insert a folder path.");
					return false;
				}
				this.openPicker(editor, "folder");
				return true;
			},
		});

		this.host.addCommand({
			id: "monolith-augur-pick-file",
			name: "Augur: Pick vault file",
			icon: "file",
			editorCheckCallback: (checking) => {
				const editor = this.activeEditor();
				if (checking) return Boolean(editor);
				if (!editor) {
					new Notice("Open a note to insert a file path.");
					return false;
				}
				this.openPicker(editor, "file");
				return true;
			},
		});
	}

	onunload(): void {
		setMonolithCompanions(null);
	}

	applySettings(next: AugurSettings): void {
		this.settings = { ...DEFAULT_SETTINGS, ...next };
	}

	private activeEditor(): Editor | null {
		return this.host.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
	}

	private openPicker(editor: Editor, mode: "file" | "folder"): void {
		new VaultPathBrowser(this.host.app, {
			mode,
			allowModeSwitch: true,
			onPick: (picked) => {
				editor.replaceSelection(formatPickedPath(picked));
			},
		}).open();
	}
}

export default AugurModule;
