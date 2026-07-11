import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import {
	PastedUrlLinterSettings,
	DEFAULT_SETTINGS,
	PastedUrlLinterSettingTab,
	migrateSettings,
} from './settings';
import { transformText } from './utils/transform';

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

		this.addCommand({
			id: 'lint-urls-in-selection',
			name: 'Lint URLs in selected text',
			editorCallback: (editor: Editor) => this.lintSelection(editor),
		});
	}

	private lintSelection(editor: Editor): void {
		const selection = editor.getSelection();
		if (!selection) {
			new Notice('No text selected');
			return;
		}

		const transformed = transformText(selection, this.settings);
		if (transformed === null) {
			new Notice('No links to lint');
			return;
		}

		editor.replaceSelection(transformed.result);
		new Notice(transformed.notice);
	}

	private handlePaste(evt: ClipboardEvent, editor: Editor): void {
		// Obsidian can dispatch the same `editor-paste` event to this handler
		// more than once (notably in Live Preview). Without this guard the
		// replacement is inserted twice, producing a doubled link. Once we've
		// handled a paste we call preventDefault(), so a repeat delivery of the
		// same event is skipped here.
		if (evt.defaultPrevented) {
			return;
		}

		const text = evt.clipboardData?.getData('text/plain') ?? '';

		const transformed = transformText(text, this.settings);
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
