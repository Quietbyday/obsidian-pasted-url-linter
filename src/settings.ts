import { App, PluginSettingTab, Setting } from 'obsidian';
import type PastedUrlLinterPlugin from './main';

export interface PastedUrlLinterSettings {
	/** Convert pasted YouTube timestamp URLs into readable Markdown links. */
	youtubeTimestamp: boolean;
	/** Strip utm_* tracking parameters (and the fragment) from pasted links. */
	stripUtm: boolean;
	/** Strip Amazon /ref= reference codes from pasted links. */
	stripAmazonRef: boolean;
	/** Also apply the UTM/Amazon cleaners to bare (non-Markdown) pasted URLs. */
	cleanBareUrls: boolean;
}

export const DEFAULT_SETTINGS: PastedUrlLinterSettings = {
	youtubeTimestamp: true,
	stripUtm: true,
	stripAmazonRef: true,
	cleanBareUrls: false,
};

export class PastedUrlLinterSettingTab extends PluginSettingTab {
	plugin: PastedUrlLinterPlugin;

	constructor(app: App, plugin: PastedUrlLinterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Convert YouTube timestamp links')
			.setDesc(
				'Turn a pasted YouTube URL with a timestamp into a Markdown link showing the time, e.g. [1:55](…?t=115).'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.youtubeTimestamp)
					.onChange(async (value) => {
						this.plugin.settings.youtubeTimestamp = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Strip UTM tracking parameters')
			.setDesc(
				'Remove utm_* parameters and any trailing #fragment from a pasted Markdown link, keeping other query parameters.'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stripUtm)
					.onChange(async (value) => {
						this.plugin.settings.stripUtm = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Strip Amazon reference codes')
			.setDesc(
				'Remove the /ref=… segment (and everything after it) from pasted Amazon Markdown links.'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stripAmazonRef)
					.onChange(async (value) => {
						this.plugin.settings.stripAmazonRef = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Also clean bare URLs')
			.setDesc(
				'Apply the UTM and Amazon cleaners to plain pasted URLs too, not just Markdown links. The result stays a bare URL.'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.cleanBareUrls)
					.onChange(async (value) => {
						this.plugin.settings.cleanBareUrls = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
