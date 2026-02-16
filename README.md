# BoxOffice — Movie Library

BoxOffice is an Obsidian plugin that turns your vault into a personal library for movies and TV shows. It allows searching data from OMDb, saving a local library as JSON, and managing watchlists and star ratings directly inside Obsidian.

## Overview

- Search movies/series via OMDb and retrieve details (plot, poster, ratings).
- Local library with "to watch" / "watched" states and personal star ratings.
- Quick add/remove of items with metadata synchronization.
- In-vault saving as a JSON file (default folder `BoxOffice/libraryStorage.json`).
- Responsive UI with grid or list views and modals for details/actions.

## Demo
##### Features
<p style="text-align: center;">
    <img src="./assets/Screenshot1.png" width="400" />
    <img src="./assets/Screenshot2.png" width="400" />
    <img src="./assets/Screenshot4.png" width="400" />
</p>

##### Settings
<p style="text-align: center;">
    <img src="./assets/Screenshot3.png" width="400" />
</p>

## Requirements

- Node.js >= 22.16.0 (for development/build scripts)

## Development

Main commands (project root):

```bash
npm install
npm run dev       # development mode (esbuild + watch sass)
npm run build     # production build
```

Build scripts and configuration are in `package.json` and `esbuild.config.mjs`.

## Configuration

### OMDb API Key

To use search and retrieve full details, an OMDb API key is required:

1. Request a key at https://www.omdbapi.com/apikey.aspx
2. Open Settings → BoxOffice and paste your key into the `OMDb API Key` field.

The plugin does not require a key for local features (library viewing), but OMDb search will not work without one.

### Library folder and file

By default the library is saved in a `BoxOffice` folder inside the vault as `libraryStorage.json`. You can create multiple files (generated as `boxoffice-<timestamp>.json`) and the plugin provides functions to create/load/save the JSON.

## Quick Start

1. Click the clapperboard icon in the Obsidian ribbon to open the BoxOffice view.
2. Search for a title using the search bar.
3. Click a result to open details, then use actions to add it, mark as watched, or rate it.

## Project Structure (summary)

```
src/
├── main.ts                    # Plugin entrypoint (lifecycle, settings, view)
├── constants.ts               # Shared constants (e.g. VIEW_TYPE)
├── CineVault.ts               # Main logic / helpers (if present)
├── services/
│   ├── libraryStorage.ts      # Functions for creating/loading/saving JSON
│   └── omdbService.ts         # Wrapper for OMDb requests (search, details)
├── settings/
│   └── settingsTab.ts         # Settings UI tab
├── ui/                        # UI components, modals, suggestions
└── views/
    └── pluginView.ts          # Main view UI
```

**Version**: 1.0.1
**Minimum Obsidian Version**: 0.15.0

If you want to support development: https://ko-fi.com/vittorioscaperrotta
