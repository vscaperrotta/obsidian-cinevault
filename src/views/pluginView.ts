import { ItemView, WorkspaceLeaf, TFile, Notice, setIcon } from "obsidian";
import CineVaultPlugin from "../main";
import { VIEW_TYPE, OMDB_TYPES } from "../constants";
import type { CineVaultData, CineVaultMovie } from "../types/cinevault";
import { renderOnboarding } from "../ui/onboarding";
import { CineVaultMovieActionModal } from "../ui/modals/actionModal";
import { CineVaultMovieDetailModal } from "../ui/modals/detailModal";
import { JsonFileSuggestModal } from "../ui/JsonFileSuggestModal";
import {
  createEmptyMovie,
  createJsonFile,
  getDefaultPath,
  getFolder,
  loadLocalFile,
  saveLocalData
} from "../services/libraryStorage";
import { searchOmdb, getOmdbDetails } from "../services/omdbService";
import { createStarRating } from "../ui/starRating";
import { nullSafe, renderExternalRatingBar } from "src/utils/globalMethods";

export default class CineVaultView extends ItemView {

  plugin: CineVaultPlugin;
  file: TFile | null = null;
  data: CineVaultData | null = null;
  activeTab: "toWatch" | "watched" = "toWatch";
  moviesContainer: HTMLElement | null = null;
  viewMode: "grid" | "list" = "grid";

  constructor(leaf: WorkspaceLeaf, plugin: CineVaultPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "BoxOffice";
  }

  // Provide a custom icon for the view's tab
  getIcon(): string {
    return "clapperboard";
  }

  async onOpen() {
    this.viewMode = this.plugin.viewMode ?? "grid";
    await this.initializeData();
    await this.render();
  }

  private async render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const header = container.createDiv({ cls: "cinevault-header" });
    header.createEl("h1", {
      text: "BoxOffice",
      cls: "cinevault-title"
    });

    header.createEl("p", {
      text: "This plugin allow you to manage your favorites movie and tv library into your vault.\nSearch OMDb, rate titles, and store your collection in a json file within your vault or in a separate vault.",
      cls: "cinevault-header-text"
    });

    if (!this.data) {
      renderOnboarding(container, async () => {
        this.file = await createJsonFile(this.plugin.app, this.plugin.libraryFolder);
        if (this.file) {
          await this.plugin.setLocalJsonPath(this.file.path);
        }
        await this.loadFile(this.file);
        await this.render();
      }, () => {
        // Open modal to select JSON file from vault
        new JsonFileSuggestModal(this.plugin.app, async (file) => {
          await this.loadFile(file);
          await this.render();
        }).open();
      });
      return;
    }

    // Search area
    const searchBox = container.createDiv({ cls: "cinevault-search" });

    // Search title
    const searchInputContainer = searchBox.createDiv({ cls: "cinevault-search-input-container" });
    const searchInput = searchInputContainer.createEl("input", {
      cls: "cinevault-search-input",
      attr: {
        placeholder: "Search"
      }
    });

    const filterSwitch = searchInputContainer.createEl("button", {
      cls: "cinevault-search-clear",
      attr: {
        "aria-label": "More filter",
        title: "More filter"
      }
    })

    setIcon(filterSwitch, "sliders-horizontal");

    const moreFilterContainer = searchBox.createDiv({ cls: "cinevault-more-filter" });

    moreFilterContainer.style.display = "none";

    filterSwitch.addEventListener("click", () => {
      if (moreFilterContainer.style.display === "none") {
        moreFilterContainer.style.display = "flex";
      } else {
        moreFilterContainer.style.display = "none";
      }
    });

    // Year filter
    const yearInput = moreFilterContainer.createEl("input", {
      cls: "cinevault-search-input",
      attr: { placeholder: "Year" }
    });

    // Type filter
    const typeSelect = moreFilterContainer.createEl("select", { cls: "cinevault-search-select" });
    typeSelect.createEl("option", {
      text: "All",
      attr: {
        value: "",
        placeholder: "Type"
      }
    });

    OMDB_TYPES.forEach((t) => {
      typeSelect.createEl("option", {
        text: t[0].toUpperCase() + t.slice(1),
        attr: { value: t }
      });
    });

    // Container for search results, created on demand
    let resultsList: HTMLElement | null = null;

    const content = container.createDiv({ cls: "cinevault-content" });
    this.moviesContainer = content;

    this.renderMovies(content);

    let searchTimeout: number | null = null;
    const runSearch = async () => {
      const query = searchInput.value.trim();
      if (!query) return;
      const type = typeSelect.value || undefined;
      const year = yearInput.value.trim() || undefined;

      const results = await searchOmdb(query, this.plugin.omdbApiKey, type, year);

      if (!results || results.length === 0) {
        if (!resultsList) resultsList = searchBox.createDiv({ cls: "cinevault-search-results" });
        resultsList.empty();
        resultsList.createEl("div", { text: "No results found.", cls: "cinevault-search-empty" });
        return;
      }

      if (!resultsList) resultsList = searchBox.createDiv({ cls: "cinevault-search-results" });
      await this.renderSearchResults(resultsList, results);
    };

    searchInput.addEventListener("input", () => {
      if (!searchInput.value.trim()) {
        if (resultsList) {
          resultsList.empty();
          resultsList.remove();
          resultsList = null;
        }
        if (searchTimeout) {
          window.clearTimeout(searchTimeout);
          searchTimeout = null;
        }
        return;
      }

      if (searchTimeout) window.clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(runSearch, 350);
    });

    yearInput.addEventListener("input", async () => {
      if (!searchInput.value.trim()) return;
      await runSearch();
    });

    typeSelect.addEventListener("change", async () => {
      if (!searchInput.value.trim()) return;
      await runSearch();
    });
  }

  private renderMovies(container: HTMLElement) {
    container.empty();

    if (!this.data) {
      container.createEl("p", { text: "No library loaded." });
      return;
    }

    const watched = this.data.movies.filter((movie) => movie.watched);
    const toWatch = this.data.movies.filter((movie) => !movie.watched);

    const tabsContainer = container.createDiv({ cls: "cinevault-tabs-container" });
    const tabHeader = tabsContainer.createDiv({ cls: "cinevault-tab-header" });

    const tabButtons = tabHeader.createDiv({ cls: "cinevault-tab-buttons" });
    const viewToggle = tabHeader.createDiv({ cls: "cinevault-view-toggle" });

    const toWatchButton = tabButtons.createEl("button", {
      cls: "cinevault-tab-button",
      text: `To Watch (${toWatch.length})`
    });

    const watchedButton = tabButtons.createEl("button", {
      cls: "cinevault-tab-button",
      text: `Watched (${watched.length})`
    });

    const gridButton = viewToggle.createEl("button", {
      cls: "cinevault-view-button",
      attr: { "aria-label": "Grid view", title: "Grid view" }
    });
    const listButton = viewToggle.createEl("button", {
      cls: "cinevault-view-button",
      attr: { "aria-label": "List view", title: "List view" }
    });

    setIcon(gridButton, "layout-grid");
    setIcon(listButton, "list");

    if (this.activeTab === "toWatch") {
      toWatchButton.classList.add("cinevault-tab-button-active");
    } else {
      watchedButton.classList.add("cinevault-tab-button-active");
    }

    if (this.viewMode === "grid") {
      gridButton.classList.add("cinevault-view-button-active");
    } else {
      listButton.classList.add("cinevault-view-button-active");
    }

    const tabContent = tabsContainer.createDiv({ cls: "cinevault-tab-content" });
    const activeMovies = this.activeTab === "toWatch" ? toWatch : watched;
    const activeTitle = this.activeTab === "toWatch" ? "To Watch" : "Watched";
    this.renderMovieSection(tabContent, activeTitle, activeMovies);

    toWatchButton.addEventListener("click", () => {
      if (this.activeTab === "toWatch") return;
      this.activeTab = "toWatch";
      this.renderMovies(container);
    });

    watchedButton.addEventListener("click", () => {
      if (this.activeTab === "watched") return;
      this.activeTab = "watched";
      this.renderMovies(container);
    });

    gridButton.addEventListener("click", async () => {
      if (this.viewMode === "grid") return;
      this.viewMode = "grid";
      await this.plugin.setViewMode("grid");
      this.renderMovies(container);
    });

    listButton.addEventListener("click", async () => {
      if (this.viewMode === "list") return;
      this.viewMode = "list";
      await this.plugin.setViewMode("list");
      this.renderMovies(container);
    });
  }

  private renderMovieSection(container: HTMLElement, title: string, movies: CineVaultMovie[]) {
    const section = container.createDiv({ cls: "cinevault-section" });
    // section.createEl("h3", { text: title });

    if (movies.length === 0) {
      section.createEl("p", { text: "No movies in this list." });
      return;
    }

    const list = section.createDiv({
      cls: this.viewMode === "grid" ? "cinevault-movie-grid" : "cinevault-movie-list"
    });

    if (this.viewMode === "grid") {
      this.renderMovieGrid(list, movies);
    } else {
      this.renderMovieList(list, movies);
    }
  }

  private renderMovieGrid(container: HTMLElement, movies: CineVaultMovie[]) {
    movies.forEach((movie) => {
      const card = container.createDiv({ cls: "cinevault-movie-card" });
      card.createEl("img", { cls: "cinevault-movie-poster" }).setAttribute("src", movie.poster);
      card.createEl("div", { text: movie.title, cls: "cinevault-movie-title" });

      // Build the details string conditionally, only including non-null/undefined values
      const detailsParts: string[] = [];
      const year = nullSafe(() => movie.year, null);
      const type = nullSafe(() => movie.type[0].toUpperCase() + movie.type.slice(1), null);

      if (year) detailsParts.push(year);
      if (type) detailsParts.push(type);

      const detailsText = detailsParts.join(" - ");
      if (detailsText) {
        card.createEl("div", { text: detailsText, cls: "cinevault-movie-year" });
      }

      if (movie.watched) {
        createStarRating(card, movie.starRating, true);
      } else {
        if (movie.ratings && movie.ratings.length) {
          renderExternalRatingBar(card, movie.ratings);
        }
      }

      card.addEventListener("click", () => this.openMovieDetails(movie));
    });
  }

  private renderMovieList(container: HTMLElement, movies: CineVaultMovie[]) {
    movies.forEach((movie) => {
      const row = container.createDiv({
        cls: "cinevault-movie-row"
      });
      const poster = row.createEl("img", {
        cls: "cinevault-movie-thumbnail"
      });
      poster.setAttribute("src", movie.poster || "");

      const info = row.createDiv({
        cls: "cinevault-movie-info"
      });

      info.createEl("div", {
        text: movie.title,
        cls: "cinevault-movie-title"
      });

      // Build the details string conditionally, only including non-null/undefined values
      const detailsParts: string[] = [];
      const year = nullSafe(() => movie.year, null);
      const type = nullSafe(() => movie.type[0].toUpperCase() + movie.type.slice(1), null);

      if (year) {
        detailsParts.push(year)
      };

      if (type) {
        detailsParts.push(type)
      };

      const detailsText = detailsParts.join(" - ");
      if (detailsText) {
        info.createEl("div", {
          text: detailsText,
          cls: "cinevault-movie-year"
        });
      }

      if (movie.watched) {
        createStarRating(info, movie.starRating, true);
      } else {
        if (movie.ratings && movie.ratings.length) {
          renderExternalRatingBar(info, movie.ratings);
        }
      }

      row.addEventListener("click", () => this.openMovieDetails(movie));
    });
  }

  private openMovieDetails(movie: CineVaultMovie) {
    new CineVaultMovieDetailModal(this.plugin.app, movie, async (rating) => {
      if (!this.data) return;
      movie.starRating = rating;
      await this.saveData();
      this.refreshMovies();
    }, async () => {
      if (!this.data) return;
      this.data.movies = this.data.movies.filter((item) => item.id !== movie.id);
      await this.saveData();
      this.refreshMovies();
    }, async () => {
      if (!this.data) return;
      movie.watched = !movie.watched;
      await this.saveData();
      this.refreshMovies();
    }).open();
  }

  private refreshMovies() {
    if (!this.moviesContainer) return;
    this.renderMovies(this.moviesContainer);
  }

  private getJsonFiles(): TFile[] {
    return this.plugin.app.vault.getFiles().filter((file) => file.extension === "json");
  }

  private async initializeData() {
    // Prefer a locally linked file inside the vault if configured
    const localPath = this.plugin.localJsonPath;
    if (localPath) {
      const localFile = this.plugin.app.vault.getAbstractFileByPath(localPath);
      if (localFile instanceof TFile) {
        await this.loadFile(localFile);
        return;
      }
    }

    // No linked files found — don't create folders/files automatically. Show onboarding.
    this.file = null;
    this.data = null;
  }

  private async loadFile(file: TFile) {
    try {
      const parsed = await loadLocalFile(this.plugin.app, file);
      this.file = file;
      this.data = parsed;
      await this.plugin.setLocalJsonPath(file.path);
    } catch (error) {
      this.data = null;
      this.file = null;
      new Notice("Unable to read the JSON file.");
    }
  }
  private async saveData() {
    if (!this.data) return;
    this.data.updatedAt = new Date().toISOString();
    if (this.file) {
      await saveLocalData(this.plugin.app, this.file, this.data);
    }
  }


  private async renderSearchResults(container: HTMLElement, results: any[]) {
    container.empty();

    results.forEach((result) => {
      const item = container.createDiv({ cls: "cinevault-search-item" });
      if (result.poster) {
        item.createEl("img", { cls: "cinevault-search-poster" }).setAttribute("src", result.poster);
      }
      const info = item.createDiv({ cls: "cinevault-search-info" });
      info.createEl("div", { text: result.title, cls: "cinevault-search-title" });
      info.createEl("div", { text: result.year, cls: "cinevault-search-year" });

      item.addEventListener("click", () => {
        new CineVaultMovieActionModal(this.plugin.app, result, async (watched) => {
          if (!this.data) return;

          const existing = this.data.movies.find((movie) => movie.imdbId === result.imdbId);
          if (existing) {
            existing.watched = watched;
          } else {
            new Notice(`Loading details for ${result.title}...`);
            const details = await getOmdbDetails(result.imdbId, this.plugin.omdbApiKey);

            if (!details) {
              new Notice("Unable to load movie details.");
              return;
            }

            const newMovie = createEmptyMovie();
            newMovie.imdbId = details.imdbID || result.imdbId;
            newMovie.title = details.Title || result.title;
            newMovie.year = details.Year || result.year;
            newMovie.rated = details.Rated || "";
            newMovie.released = details.Released || "";
            newMovie.runtime = details.Runtime || "";
            newMovie.genre = details.Genre || "";
            newMovie.director = details.Director || "";
            newMovie.writer = details.Writer || "";
            newMovie.actors = details.Actors || "";
            newMovie.plot = details.Plot || result.plot;
            newMovie.language = details.Language || "";
            newMovie.country = details.Country || "";
            newMovie.awards = details.Awards || "";
            newMovie.poster = details.Poster && details.Poster !== "N/A" ? details.Poster : result.poster;
            newMovie.posterLocal = "";
            newMovie.ratings = details.Ratings || [];
            newMovie.metascore = details.Metascore || "";
            newMovie.imdbRating = details.imdbRating || "";
            newMovie.imdbVotes = details.imdbVotes || "";
            newMovie.type = details.Type || result.type;
            newMovie.dvd = details.DVD || "";
            newMovie.boxOffice = details.BoxOffice || "";
            newMovie.production = details.Production || "";
            newMovie.website = details.Website || "";
            newMovie.totalSeasons = details.totalSeasons || "";
            newMovie.watched = watched;

            this.data.movies.push(newMovie);
          }
          await this.saveData();
          this.render();
        }).open();
      });
    });
  }
}