import { Modal } from "obsidian";
import type { CineVaultSearchItem } from "../../types/cinevault";

export class CineVaultMovieActionModal extends Modal {
  private movie: CineVaultSearchItem;
  private onSave: (watched: boolean) => void;

  constructor(app: Modal["app"], movie: CineVaultSearchItem, onSave: (watched: boolean) => void) {
    super(app);
    this.movie = movie;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: this.movie.title });
    contentEl.createEl("p", { text: `${this.movie.year} • ${this.movie.type}` });
    if (this.movie.poster) {
      contentEl.createEl("img", { cls: "obs-plugin-modal-detail-poster" }).setAttribute("src", this.movie.poster);
    }
    contentEl.createEl("p", { text: this.movie.plot });

    const actions = contentEl.createDiv({ cls: "obs-plugin-modal-detail-actions" });
    const watchedButton = actions.createEl("button", { text: "Mark as watched" });
    const toWatchButton = actions.createEl("button", { text: "To watch" });

    watchedButton.addEventListener("click", () => {
      this.onSave(true);
      this.close();
    });

    toWatchButton.addEventListener("click", () => {
      this.onSave(false);
      this.close();
    });
  }
}
