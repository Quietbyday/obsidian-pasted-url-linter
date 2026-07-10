import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import {
	PastedUrlLinterSettings,
	DEFAULT_SETTINGS,
	PastedUrlLinterSettingTab,
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
