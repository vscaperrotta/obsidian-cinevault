import { Plugin } from "obsidian";
import { VIEW_TYPE, FOLDER } from "./constants";
import pluginView from "./views/pluginView";
import CineVaultSettingTab from "./settings/settingsTab";

type CineVaultPluginData = {
	localJsonPath?: string;
	omdbApiKey?: string;
	viewMode?: "grid" | "list";
	libraryFolder?: string;
	open?: boolean;
};

export default class CineVaultPlugin extends Plugin {
	localJsonPath: string | null = null;
	omdbApiKey: string = "";
	viewMode: "grid" | "list" = "grid";
	libraryFolder: string = FOLDER;

	// Load plugin data and register views/settings when the plugin is loaded
	async onload() {
		await this.loadPluginData();

		this.addSettingTab(new CineVaultSettingTab(this.app, this));

		this.registerView(
			VIEW_TYPE,
			(leaf) => new pluginView(leaf, this)
		);

		this.addRibbonIcon("clapperboard", "BoxOffice", async () => {
			await this.openNewTab();
		});
	}

	// Unmount the status bar element when the plugin is disabled
	onunload() {
	}

	private async loadPluginData() {
		const data = (await this.loadData()) as CineVaultPluginData | null;
		this.localJsonPath = data?.localJsonPath ?? null;
		this.omdbApiKey = data?.omdbApiKey ?? "";
		this.viewMode = data?.viewMode ?? "grid";
		this.libraryFolder = data?.libraryFolder ?? FOLDER;
	}

	async setOmdbApiKey(apiKey: string) {
		this.omdbApiKey = apiKey;
		await this.savePluginData();
	}

	async setViewMode(viewMode: "grid" | "list") {
		this.viewMode = viewMode;
		await this.savePluginData();
	}

	private async savePluginData() {
		const data: CineVaultPluginData = {
			omdbApiKey: this.omdbApiKey,
			viewMode: this.viewMode,
			libraryFolder: this.libraryFolder
		};
		if (this.localJsonPath) {
			data.localJsonPath = this.localJsonPath;
		}
		await this.saveData(data);
	}

	async setLocalJsonPath(path: string | null) {
		this.localJsonPath = path;
		await this.savePluginData();
	}

	async setLibraryFolder(folder: string) {
		this.libraryFolder = folder;
		await this.savePluginData();
	}

	// Open a new tab with the "BoxOffice" view type
	private async openNewTab() {
		const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (existingLeaves.length > 0) {
			this.app.workspace.revealLeaf(existingLeaves[0]);
			return;
		}

		const leaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({
			type: VIEW_TYPE,
			active: true
		});
	}
}