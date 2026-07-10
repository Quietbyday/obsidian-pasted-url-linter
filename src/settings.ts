import { App, PluginSettingTab, Setting } from 'obsidian';
import type PastedUrlLinterPlugin from './main';

export interface PastedUrlLinterSettings {
	/** Convert pasted YouTube timestamp URLs into readable Markdown links. */
	youtubeTimestamp: boolean;
	/** Strip tracking parameters (and tracking fragments) from pasted links. */
	stripTrackingParams: boolean;
	/** Canonicalise Amazon product links down to `…/dp/<ASIN>`. */
	cleanAmazonLinks: boolean;
	/** Also apply the cleaners to bare (non-Markdown) pasted URLs. */
	cleanBareUrls: boolean;
}

export const DEFAULT_SETTINGS: PastedUrlLinterSettings = {
	youtubeTimestamp: true,
	stripTrackingParams: true,
	cleanAmazonLinks: true,
	cleanBareUrls: false,
};

/**
 * Carries values over from the v0.2.0 setting keys (`stripUtm`,
 * `stripAmazonRef`) to their v0.3.0 replacements when the old keys are present
 * and the new ones are not. Returns a settings-shaped object with the old keys
 * removed, plus a `migrated` flag so the caller knows whether to re-save.
 */
export function migrateSettings(raw: unknown): {
	settings: Partial<PastedUrlLinterSettings>;
	migrated: boolean;
} {
	if (!raw || typeof raw !== 'object') {
		return { settings: {}, migrated: false };
	}

	const data = { ...(raw as Record<string, unknown>) };
	let migrated = false;

	if (data.stripUtm !== undefined && data.stripTrackingParams === undefined) {
		data.stripTrackingParams = data.stripUtm;
		migrated = true;
	}
	if (
		data.stripAmazonRef !== undefined &&
		data.cleanAmazonLinks === undefined
	) {
		data.cleanAmazonLinks = data.stripAmazonRef;
		migrated = true;
	}

	if (data.stripUtm !== undefined || data.stripAmazonRef !== undefined) {
		delete data.stripUtm;
		delete data.stripAmazonRef;
		migrated = true;
	}

	return {
		settings: data as Partial<PastedUrlLinterSettings>,
		migrated,
	};
}

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
			.setName('Strip tracking parameters')
			.setDesc(
				'Remove a broad list of tracking parameters (utm_*, gclid, fbclid, igshid, affiliate tags, and more) plus any tracking data hidden in the #fragment. Real anchors and other query parameters are kept.'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stripTrackingParams)
					.onChange(async (value) => {
						this.plugin.settings.stripTrackingParams = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Clean Amazon product links')
			.setDesc(
				'Shorten an Amazon product link to its canonical …/dp/<ASIN> form, dropping the /ref=… code, query, and fragment.'
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.cleanAmazonLinks)
					.onChange(async (value) => {
						this.plugin.settings.cleanAmazonLinks = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Also clean bare URLs')
			.setDesc(
				'Apply the tracking and Amazon cleaners to plain pasted URLs too, not just Markdown links. The result stays a bare URL.'
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
