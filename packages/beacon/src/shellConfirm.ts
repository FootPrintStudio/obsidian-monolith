import { App, Modal, Setting } from "obsidian";

/** Confirm before running a free-form shell launcher (sync/share risk). */
export class ShellConfirmModal extends Modal {
	private decided = false;

	constructor(
		app: App,
		private entryName: string,
		private command: string,
		private onConfirm: () => void,
		private onCancel?: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Launch shell command?" });
		contentEl.createEl("p", {
			text: `Beacon will run this shell command for “${this.entryName}”. Entries live in plugin settings (sync/share risk).`,
		});
		contentEl.createEl("pre", {
			text: this.command,
			cls: "sal-shell-confirm-cmd",
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.close();
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText("Launch")
					.setCta()
					.setWarning()
					.onClick(() => {
						this.decided = true;
						this.close();
						this.onConfirm();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.decided) {
			this.onCancel?.();
		}
	}
}
