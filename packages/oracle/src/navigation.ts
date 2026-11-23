import { App, MarkdownView, Notice, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import type { NaviNoteSettings } from "./types";
import { resolveLinkTarget } from "./linkResolver";

export function getPageNameFromPath(path: string): string {
	const parts = path.split("/");
	const fileName = parts[parts.length - 1] ?? path;
	return fileName.replace(/\.md$/i, "");
}

export function getSortedFilesInFolder(
	app: App,
	folderPath: string,
	sortField: string,
): TFile[] {
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) return [];

	const files = folder.children.filter(
		(child): child is TFile => child instanceof TFile && child.extension === "md",
	);

	return files.sort((a, b) => {
		if (sortField === "file.name") {
			return a.name.localeCompare(b.name);
		}

		if (sortField.startsWith("frontmatter.")) {
			const field = sortField.split(".")[1] ?? "";
			const aValue =
				app.metadataCache.getFileCache(a)?.frontmatter?.[field] ?? "";
			const bValue =
				app.metadataCache.getFileCache(b)?.frontmatter?.[field] ?? "";
			return String(aValue).localeCompare(String(bValue));
		}

		return 0;
	});
}

function getActiveMarkdownView(app: App): MarkdownView | null {
	return app.workspace.getActiveViewOfType(MarkdownView);
}

function getActiveLeaf(app: App): WorkspaceLeaf | null {
	const view = getActiveMarkdownView(app);
	return view?.leaf ?? null;
}

export async function openPage(
	app: App,
	path: string,
	sourcePath: string,
): Promise<void> {
	const cleanPath = path.endsWith(".md") ? path.slice(0, -3) : path;

	try {
		const leaf = getActiveLeaf(app);
		if (!leaf) throw new Error("No active leaf");

		const file = app.metadataCache.getFirstLinkpathDest(cleanPath, sourcePath);
		if (!file) throw new Error(`File not found: ${cleanPath}`);

		await leaf.openFile(file);
	} catch (error) {
		console.error(`Failed to open page: ${cleanPath}`, error);
		new Notice(`Failed to open page: ${getPageNameFromPath(cleanPath)}`);
	}
}

export async function navigateBack(
	app: App,
	file: TFile,
	settings: NaviNoteSettings,
): Promise<void> {
	const metadata = app.metadataCache.getFileCache(file);
	if (!metadata?.frontmatter) {
		new Notice("No frontmatter found for this file.");
		return;
	}

	const backLink = metadata.frontmatter[settings.backButtonField];
	if (backLink == null || backLink === "") {
		new Notice(`No ${settings.backButtonField} field found in frontmatter.`);
		return;
	}

	const target = resolveLinkTarget(backLink);
	if (!target) {
		new Notice(`No valid back link found in ${settings.backButtonField} field.`);
		return;
	}

	await openPage(app, target, file.path);
}

export async function navigatePrevious(
	app: App,
	file: TFile,
	settings: NaviNoteSettings,
): Promise<void> {
	const currentFolder = file.parent?.path;
	if (!currentFolder) return;

	const sortField = settings.folderNavigation[currentFolder] ?? "file.name";
	const files = getSortedFilesInFolder(app, currentFolder, sortField);
	const currentIndex = files.findIndex((f) => f.path === file.path);

	if (currentIndex > 0) {
		const prev = files[currentIndex - 1];
		if (prev) await openPage(app, prev.path, file.path);
	} else {
		new Notice("No previous page in this folder");
	}
}

export async function navigateNext(
	app: App,
	file: TFile,
	settings: NaviNoteSettings,
): Promise<void> {
	const currentFolder = file.parent?.path;
	if (!currentFolder) return;

	const sortField = settings.folderNavigation[currentFolder] ?? "file.name";
	const files = getSortedFilesInFolder(app, currentFolder, sortField);
	const currentIndex = files.findIndex((f) => f.path === file.path);

	if (currentIndex >= 0 && currentIndex < files.length - 1) {
		const next = files[currentIndex + 1];
		if (next) await openPage(app, next.path, file.path);
	} else {
		new Notice("No next page in this folder");
	}
}

export function refreshCurrentPage(app: App, view: MarkdownView): void {
	if (view.getMode() === "preview" && view.previewMode) {
		view.previewMode.rerender(true);
		new Notice("Page refreshed");
		return;
	}

	new Notice("Refresh is available in Reading view");
}
