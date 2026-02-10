import { ItemView, WorkspaceLeaf, TFile, Notice, setIcon } from "obsidian";
import CineVaultPlugin from "../main";
import { VIEW_TYPE } from "../constants";
import type { CineVaultData, CineVaultMovie } from "../types/cinevault";
import { renderOnboarding } from "../ui/onboarding";
import { CineVaultMovieActionModal } from "../ui/modals/CineVaultMovieActionModal";
import { CineVaultMovieDetailModal } from "../ui/modals/CineVaultMovieDetailModal";
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
import { nullSafe } from "src/utils";

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
    return "CineVault";
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
      text: "CineVault",
      cls: "cinevault-title"
    });

    header.createEl("p", {
      text: "CineVault allow you to manageyour favorites movie and tv library into your vault. Search OMDb, rate titles, and store your collection in a json file within your vault.",
      cls: "cinevault-header-text"
    });

    if (!this.data) {
      renderOnboarding(container, async () => {
        this.file = await createJsonFile(this.plugin.app);
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

    const searchBox = container.createDiv({ cls: "cinevault-search" });
    const searchInput = searchBox.createEl("input", {
      cls: "cinevault-search-input",
      attr: {
        placeholder: "Search"
      }
    });
    const resultsList = searchBox.createDiv({ cls: "cinevault-search-results" });

    const content = container.createDiv({ cls: "cinevault-content" });
    this.moviesContainer = content;

    this.renderMovies(content);

    let searchTimeout: number | null = null;
    searchInput.addEventListener("input", () => {
      if (searchTimeout) window.clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(async () => {
        const query = searchInput.value.trim();
        await this.renderSearchResults(resultsList, query);
      }, 350);
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
    section.createEl("h3", { text: title });

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

      const type = nullSafe(() => movie.type[0].toUpperCase() + movie.type.slice(1), null);
      const year = nullSafe(() => movie.year, null);
      card.createEl("div", { text: `${year} - ${type}` || "", cls: "cinevault-movie-year" });

      card.addEventListener("click", () => this.openMovieDetails(movie));
    });
  }

  private renderMovieList(container: HTMLElement, movies: CineVaultMovie[]) {
    movies.forEach((movie) => {
      const row = container.createDiv({ cls: "cinevault-movie-row" });
      const poster = row.createEl("img", { cls: "cinevault-movie-thumbnail" });
      poster.setAttribute("src", movie.poster || "");

      const info = row.createDiv({ cls: "cinevault-movie-info" });
      info.createEl("div", { text: movie.title, cls: "cinevault-movie-title" });

      const type = nullSafe(() => movie.type[0].toUpperCase() + movie.type.slice(1), null);
      const year = nullSafe(() => movie.year, null);
      info.createEl("div", { text: `${year} - ${type}` || "", cls: "cinevault-movie-year" });

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


  private async renderSearchResults(container: HTMLElement, query: string) {
    container.empty();
    if (!query || query.length < 2) return;

    const results = await searchOmdb(query, this.plugin.omdbApiKey);
    if (results.length === 0) {
      container.createEl("div", { text: "No results found.", cls: "cinevault-search-empty" });
      return;
    }

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
            // Fetch full movie details from OMDb
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