import { Modal } from "obsidian";
import type { CineVaultMovie } from "../../types/cinevault";
import { createStarRating } from "../starRating";
import { nullSafe, renderExternalRatingBar } from "src/utils/globalMethods";

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
      cls: "obs-plugin-modal-detail-container"
    });

    const modalHeader = modalContainer.createDiv({
      cls: "obs-plugin-modal-detail-header"
    });

    const modalTitleContainer = modalHeader.createDiv({
      cls: "obs-plugin-modal-detail-title-container"
    });

    modalTitleContainer.createEl("h1", {
      text: this.movie.title,
      cls: "obs-plugin-modal-detail-title"
    });

    // Year and Type
    const type = nullSafe(() => this.movie.type[0].toUpperCase() + this.movie.type.slice(1), null);
    const year = nullSafe(() => this.movie.year, null);

    modalTitleContainer.createEl("p", {
      text: `${year} - ${type}`,
    });

    modalTitleContainer.createEl("p", {
      text: "Directed by " + nullSafe(() => this.movie.director, "N/A"),
    });

    modalTitleContainer.createEl("p", {
      text: "Duration " + nullSafe(() => this.movie.runtime, "N/A"),
    });

    // Poster
    if (this.movie.poster) {
      modalHeader.createEl("img", { cls: "obs-plugin-modal-detail-poster" }).setAttribute("src", this.movie.poster);
    }

    // Plot
    if (this.movie.plot) {
      const plotContainer = modalContainer.createEl("div", { cls: "obs-plugin-modal-detail-plot-container" });

      const plotEl = plotContainer.createEl("p", {
        text: this.movie.plot,
        cls: "obs-plugin-modal-detail-plot"
      });

      const showMoreButton = plotContainer.createEl("button", {
        text: "Show more",
        cls: "obs-plugin-modal-detail-show-more obs-plugin-modal-detail-show-more-hidden"
      })

      showMoreButton.addEventListener("click", () => {
        const isExpanded = plotEl.classList.toggle("expanded-plot");
        showMoreButton.setText(isExpanded ? "Show less" : "Show more");
      });

      // Wait for layout so we can measure overflow
      requestAnimationFrame(() => {
        // If content height exceeds container height, it's truncated
        if (plotEl.scrollHeight > plotEl.clientHeight + 1) {
          showMoreButton.removeClass("obs-plugin-modal-detail-show-more-hidden");
        }
      });
    }

    // Generate details section only if at least one detail is available
    function rederDetailSection(type: string, value: string) {
      const detailElement = modalContainer.createEl("div", { cls: "obs-plugin-modal-detail-detail-container" });
      detailElement.createEl("p", {
        text: `${type}:`,
        cls: "obs-plugin-modal-detail-label"
      });
      detailElement.createEl("p", {
        text: value,
        cls: "obs-plugin-modal-detail-detail-value"
      });
    }

    modalContainer.createEl("hr");

    // Genre
    if (this.movie.genre) {
      rederDetailSection("Genre", this.movie.genre);
    }

    // Actors
    if (this.movie.actors) {
      rederDetailSection("Actors", this.movie.actors);
    }

    modalContainer.createEl("hr");

    const ratingWrapper = modalContainer.createDiv({ cls: "obs-plugin-modal-detail-rating-wrapper" });

    // Personal Rating
    const ratingContainer = ratingWrapper.createDiv({
      cls: "obs-plugin-modal-detail-rating-container"
    });

    ratingContainer.createEl("div", { text: "Rating", cls: "obs-plugin-modal-detail-rating-label" });
    createStarRating(ratingContainer, this.movie.starRating, false, (rating) => {
      this.onRate(rating);
    });

    if (this.movie.ratings) {
      const externalRatingsContainer = ratingWrapper.createDiv({ cls: "obs-plugin-modal-detail-rating-container" });

      externalRatingsContainer.createEl("div", {
        text: "External rating",
        cls: "obs-plugin-modal-detail-rating-label"
      });

      renderExternalRatingBar(externalRatingsContainer, this.movie.ratings);

      // External rating disclaimer stays in the modal
      modalContainer.createEl("p", {
        text: "The external rating is an average based on votes from Internet Movie Database, Rotten Tomatoes and Metacritic",
        cls: "obs-plugin-modal-detail-rating-disclaimer"
      });
    }

    const actions = modalContainer.createDiv({ cls: "obs-plugin-modal-detail-actions" });
    const toggleWatchedLabel = this.movie.watched ? "Mark as to watch" : "Mark as watched";
    const toggleWatchedButton = actions.createEl("button", { text: toggleWatchedLabel });
    const removeButton = actions.createEl("button", { text: "Remove", cls: "obs-plugin-danger" });

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