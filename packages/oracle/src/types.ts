export interface NaviNoteSettings {
	highLevelNavigation: string[];
	folderNavigation: Record<string, string>;
	backButtonField: string;
}

export const DEFAULT_SETTINGS: NaviNoteSettings = {
	highLevelNavigation: [],
	folderNavigation: {},
	backButtonField: "pageParent",
};

export function parseHighLevelNavigation(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
