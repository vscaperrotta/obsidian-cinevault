import { Modal } from "obsidian";
import type { CineVaultMovie } from "../../types/cinevault";
import { createStarRating } from "../starRating";
import { nullSafe } from "src/utils";

export class CineVaultMovieDetailModal extends Modal {
  private movie: CineVaultMovie;
  private onRate: (rating: number) => void;
  private onRemove: () => void;
  private onToggleWatched: () => void;

  constructor(
    app: Modal["app"],
    movie: CineVaultMovie,
    onRate: (rating: number) => void,
    onRemove: () => void,
    onToggleWatched: () => void
  ) {
    super(app);
    this.movie = movie;
    this.onRate = onRate;
    this.onRemove = onRemove;
    this.onToggleWatched = onToggleWatched;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const modalContainer = contentEl.createDiv({
      cls: "cinevault-modal-container"
    });

    modalContainer.createEl("h1", {
      text: this.movie.title,
      cls: "cinevault-modal-title"
    });

    // Year and Type
    const type = nullSafe(() => this.movie.type[0].toUpperCase() + this.movie.type.slice(1), null);
    const year = nullSafe(() => this.movie.year, null);
    modalContainer.createEl("p", {
      text: `${year} - ${type}`,
    });

    // Poster
    if (this.movie.poster) {
      modalContainer.createEl("img", { cls: "cinevault-modal-poster" }).setAttribute("src", this.movie.poster);
    }

    // Plot
    if (this.movie.plot) {
      const plotContainer = modalContainer.createEl("div", { cls: "cinevault-modal-plot-container" });

      const plotEl = plotContainer.createEl("p", {
        text: this.movie.plot,
        cls: "cinevault-modal-plot"
      });

      const showMoreButton = plotContainer.createEl("button", {
        text: "Show more",
        cls: "cinevault-modal-show-more cinevault-modal-show-more-hidden"
      })

      showMoreButton.addEventListener("click", () => {
        const isExpanded = plotEl.classList.toggle("expanded-plot");
        showMoreButton.setText(isExpanded ? "Show less" : "Show more");
      });

      // Wait for layout so we can measure overflow
      requestAnimationFrame(() => {
        // If content height exceeds container height, it's truncated
        if (plotEl.scrollHeight > plotEl.clientHeight + 1) {
          showMoreButton.removeClass("cinevault-modal-show-more-hidden");
        }
      });
    }

    // Generate details section only if at least one detail is available
    function rederDetailSection(type: string, value: string) {
      const detailElement = modalContainer.createEl("div", { cls: "cinevault-modal-detail-container" });
      detailElement.createEl("p", {
        text: `${type}:`,
        cls: "cinevault-modal-detail-label"
      });
      detailElement.createEl("p", {
        text: value,
        cls: "cinevault-modal-detail-value"
      });
    }

    modalContainer.createEl("hr");

    // Genre
    if (this.movie.genre) {
      rederDetailSection("Genre", this.movie.genre);
    }

    // Director
    if (this.movie.director) {
      rederDetailSection("Director", this.movie.director);
    }

    // Actors
    if (this.movie.actors) {
      rederDetailSection("Actors", this.movie.actors);
    }

    modalContainer.createEl("hr");

    // Personal Rating
    const ratingContainer = modalContainer.createDiv({
      cls: "cinevault-modal-rating-container"
    });

    ratingContainer.createEl("div", { text: "Rating", cls: "cinevault-modal-rating-label" });
    const stars = createStarRating(ratingContainer, this.movie.starRating, false, (rating) => {
      this.onRate(rating);
    });
    stars.classList.add("cinevault-modal-stars");

    // Ratings from external sources
    if (this.movie.ratings) {
      const externalRatingsContainer = modalContainer.createDiv({
        cls: "cinevault-modal-external-ratings"
      });

      for (const rating of this.movie.ratings) {
        const ratingEl = externalRatingsContainer.createDiv({ cls: "cinevault-modal-external-rating-element" });
        ratingEl.createEl("div", { text: rating.Source, cls: "cinevault-modal-external-rating-source" });
        ratingEl.createEl("div", { text: rating.Value, cls: "cinevault-modal-external-rating-value" });
      }
    }

    const actions = modalContainer.createDiv({ cls: "cinevault-modal-actions" });
    const toggleWatchedLabel = this.movie.watched ? "Mark as to watch" : "Mark as watched";
    const toggleWatchedButton = actions.createEl("button", { text: toggleWatchedLabel });
    const removeButton = actions.createEl("button", { text: "Remove", cls: "cinevault-danger" });

    toggleWatchedButton.addEventListener("click", () => {
      this.onToggleWatched();
      this.close();
    });

    removeButton.addEventListener("click", () => {
      this.onRemove();
      this.close();
    });
  }
}