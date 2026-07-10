import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import {
	PastedUrlLinterSettings,
	DEFAULT_SETTINGS,
	PastedUrlLinterSettingTab,
	migrateSettings,
} from './settings';
import { transformPaste } from './utils/transform';

export default class PastedUrlLinterPlugin extends Plugin {
	settings: PastedUrlLinterSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PastedUrlLinterSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on(
				'editor-paste',
				(evt: ClipboardEvent, editor: Editor, _view: MarkdownView) => {
					this.handlePaste(evt, editor);
				}
			)
		);
	}

	private handlePaste(evt: ClipboardEvent, editor: Editor): void {
		const text = evt.clipboardData?.getData('text/plain') ?? '';

		const transformed = transformPaste(text, this.settings);
		if (transformed === null) {
			return;
		}

		evt.preventDefault();
		editor.replaceSelection(transformed.result);
		new Notice(transformed.notice);
	}

	async loadSettings() {
		const raw = await this.loadData();
		const { settings, migrated } = migrateSettings(raw);
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
		// Persist the migrated shape so the old v0.2.0 keys are cleaned up.
		if (migrated) {
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
