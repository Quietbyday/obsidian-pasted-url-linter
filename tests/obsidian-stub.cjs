/**
 * Minimal stand-in for the `obsidian` module so `settings.ts` (which imports
 * App / PluginSettingTab / Setting) can be required in a plain Node test
 * process. The real package ships types only, so `require('obsidian')` would
 * otherwise throw. The unit tests only exercise pure logic, not the UI.
 */
class App {}

class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
	}
}

class Setting {
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	addToggle() {
		return this;
	}
}

module.exports = { App, PluginSettingTab, Setting };
