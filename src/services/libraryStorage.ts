import { App, TFile } from "obsidian";
import type { CineVaultData, CineVaultMovie } from "../types/cinevault";
import { FOLDER, JSON_NAME } from "src/constants";

const DEFAULT_NAME = `${JSON_NAME}.json`;

export function getDefaultPath(folder?: string) {
  const folderPath = folder ?? FOLDER;
  return `${folderPath}/${DEFAULT_NAME}`;
}

export function getFolder(folder?: string) {
  return folder ?? FOLDER;
}

export function createEmptyMovie(): CineVaultMovie {
  return {
    id: crypto.randomUUID(),
    imdbId: "",
    title: "",
    year: "",
    rated: "",
    released: "",
    runtime: "",
    genre: "",
    director: "",
    writer: "",
    actors: "",
    plot: "",
    language: "",
    country: "",
    awards: "",
    poster: "",
    posterLocal: "",
    ratings: [],
    metascore: "",
    imdbRating: "",
    imdbVotes: "",
    type: "",
    dvd: "",
    boxOffice: "",
    production: "",
    website: "",
    totalSeasons: "",
    tomatoURL: "",
    tomatoMeter: "",
    tomatoImage: "",
    tomatoRating: "",
    tomatoReviews: "",
    tomatoFresh: "",
    tomatoRotten: "",
    tomatoConsensus: "",
    tomatoUserMeter: "",
    tomatoUserRating: "",
    tomatoUserReviews: "",
    starRating: 0,
    watched: false,
    notes: ""
  };
}

export function createDefaultData(): CineVaultData {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    libraryName: "CineVault",
    owner: "",
    source: "CineVault",
    movies: []
  };
}

export function normalizeData(data: CineVaultData): CineVaultData {
  return {
    ...data,
    movies: data.movies.map((movie) => ({
      ...createEmptyMovie(),
      ...movie,
      year: movie.year ? String(movie.year) : "",
      starRating: typeof movie.starRating === "number" ? movie.starRating : 0
    }))
  };
}

export async function ensureFolder(app: App, folder?: string) {
  const folderPath = getFolder(folder);
  if (!app.vault.getAbstractFileByPath(folderPath)) {
    await app.vault.createFolder(folderPath);
  }
}

export async function createJsonFile(app: App, folder?: string): Promise<TFile> {
  const folderPath = getFolder(folder);
  await ensureFolder(app, folder);
  const existing = app.vault.getAbstractFileByPath(getDefaultPath(folder));
  const filename = existing ? `boxoffice-${Date.now()}.json` : DEFAULT_NAME;
  const path = `${folderPath}/${filename}`;

  return app.vault.create(path, JSON.stringify(createDefaultData(), null, 2));
}

export async function loadLocalFile(app: App, file: TFile): Promise<CineVaultData> {
  const raw = await app.vault.read(file);
  const parsed = JSON.parse(raw) as CineVaultData;
  if (!parsed || !Array.isArray(parsed.movies)) {
    throw new Error("Formato JSON non valido");
  }
  return normalizeData(parsed);
}

export async function saveLocalData(app: App, file: TFile, data: CineVaultData) {
  await app.vault.modify(file, JSON.stringify(data, null, 2));
}
