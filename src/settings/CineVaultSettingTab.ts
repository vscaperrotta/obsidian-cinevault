import { App, PluginSettingTab, Setting, Notice, TFile } from "obsidian";
import CineVaultView from "../views/CineVaultView";
import { VIEW_TYPE } from "../constants";
import CineVaultPlugin from "../main";
import { createDefaultData, createJsonFile, getDefaultPath, getFolder, saveLocalData } from "../services/libraryStorage";

export default class CineVaultSettingTab extends PluginSettingTab {
  plugin: CineVaultPlugin;

  constructor(app: App, plugin: CineVaultPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // Configuration
    new Setting(containerEl).setName("Configuration").setHeading();
    new Setting(containerEl)
      .setName("OMDb API key")
      .setDesc("Enter your OMDb API key. You can get one for free at omdbapi.com")
      .addText(text => text
        .setPlaceholder("Enter your API key")
        .setValue(this.plugin.omdbApiKey)
        .onChange(async (value) => {
          await this.plugin.setOmdbApiKey(value);
        }));

    // External library support removed.

    new Setting(containerEl)
      .setName("Linked local library")
      .setDesc(
        this.plugin.localJsonPath
          ? `Local file: ${this.plugin.localJsonPath}`
          : "No local library linked"
      )
      .addDropdown(drop => {
        const files = this.app.vault.getFiles().filter((f) => f.extension === "json");
        const options: Record<string, string> = { "": "-- None --" };
        files.forEach((f) => (options[f.path] = f.path));
        drop.addOptions(options).setValue(this.plugin.localJsonPath ?? "").onChange(async (value) => {
          const path = value || null;
          await this.plugin.setLocalJsonPath(path);
          await this.refreshOpenViews();
          this.display();
        });
      })
      .addButton(button => button
        .setButtonText("Unlink local")
        .setDisabled(!this.plugin.localJsonPath)
        .onClick(async () => {
          await this.plugin.setLocalJsonPath(null);
          await this.refreshOpenViews();
          this.display();
        }));

    new Setting(containerEl)
      .setName("Create new library")
      .setDesc("Create a new empty local library from scratch. This will unlink any external library.")
      .addButton(button => button
        .setButtonText("Create library")
        .onClick(async () => {
          await this.createNewLibrary();
        }));

    new Setting(containerEl)
      .setName("Export library")
      .setDesc("Save a copy of your library JSON to a file.")
      .addButton(button => button
        .setButtonText("Export JSON")
        .onClick(async () => {
          await this.exportLibraryJson();
        }));

    // Bugfix
    new Setting(containerEl).setName("Bugfix").setHeading();
    new Setting(containerEl)
      .setName("Report issues")
      .setDesc("If you encounter any issues with the plugin, please report them. Your feedback is invaluable for improving CineVault!")
      .addButton(button => button
        .setButtonText("GitHub")
        .onClick(() => {
          window.open("https://github.com/vscaperrotta/obsidian-cinevault/issues", "_blank");
        }));

    // Support and donation
    new Setting(containerEl).setName("Support").setHeading();
    new Setting(containerEl)
      .setName("Donate")
      .setDesc(
        "If you like this plugin, consider donating to support continued development."
      )
      .addButton((bt) => {
        bt.buttonEl.outerHTML =
          "<a href='https://ko-fi.com/T6T01TX807' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>";
      });
  }

  private async exportLibraryJson() {
    try {
      const content = await this.getLibraryJsonContent();
      if (!content) {
        new Notice("No library file found to export.");
        return;
      }

      // Create export file inside vault for mobile compatibility
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const exportPath = `cinevault-export-${timestamp}.json`;

      // Check if file exists, if so add a counter
      let finalPath = exportPath;
      let counter = 1;
      while (this.app.vault.getAbstractFileByPath(finalPath)) {
        finalPath = `cinevault-export-${timestamp}-${counter}.json`;
        counter++;
      }

      await this.app.vault.create(finalPath, content);
      new Notice(`Library exported to ${finalPath}`);
    } catch (error) {
      console.error("[CineVault] Export library error", error);
      new Notice("Unable to export the library.");
    }
  }

  private async createNewLibrary() {
    const confirmed = window.confirm(
      "Create a new empty CineVault library? This will unlink any external library and reset your local library data."
    );
    if (!confirmed) return;

    try {
      const defaultFile = this.app.vault.getAbstractFileByPath(getDefaultPath());
      let createdFile: TFile | undefined;
      if (defaultFile instanceof TFile) {
        await saveLocalData(this.app, defaultFile, createDefaultData());
        createdFile = defaultFile;
      } else {
        createdFile = await createJsonFile(this.app);
      }

      if (createdFile) {
        await this.plugin.setLocalJsonPath(createdFile.path);
      }
      await this.refreshOpenViews();
      this.display();
      new Notice("New library created.");
    } catch (error) {
      console.error("[CineVault] Create new library error", error);
      new Notice("Unable to create a new library.");
    }
  }

  private async getLibraryJsonContent(): Promise<string | null> {
    // Prefer a local linked file inside the vault
    if (this.plugin.localJsonPath) {
      const localPath = this.plugin.localJsonPath;
      const file = this.app.vault.getAbstractFileByPath(localPath);
      if (file instanceof TFile) {
        return this.app.vault.read(file);
      }
    }

    const defaultFile = this.app.vault.getAbstractFileByPath(getDefaultPath());
    if (defaultFile instanceof TFile) {
      return this.app.vault.read(defaultFile);
    }

    const folder = getFolder();
    const fallback = this.app.vault
      .getFiles()
      .find((file) => file.extension === "json" && file.path.startsWith(`${folder}/`));

    if (fallback) {
      return this.app.vault.read(fallback);
    }

    return null;
  }

  private async refreshOpenViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof CineVaultView) {
        await leaf.view.onOpen();
      }
    }
  }
}
