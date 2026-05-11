# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Don't add new comments when editing code.

## Commands

```bash
npm run dev      # Dev server at localhost:5173
npm run build    # Production build (outputs to dist/)
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

No test suite exists in this project.

## Architecture

**Stack**: React 18 + Vite 6 + Tailwind CSS v3 + React Router DOM 7 + Radix UI (shadcn-style components)

**Path alias**: `@/` maps to `src/`

**Deployment**: GitHub Pages at `/read-down-generator/`. The `base` in `vite.config.js` is set conditionally — production builds use that sub-path. The router `basename` in `src/pages/index.jsx` mirrors this. Default images/assets reference `./images/` which resolves relative to the base.

### Design tokens

CSS custom properties (Radix UI / shadcn convention) are defined inline in `src/pages/Layout.jsx` — not in a separate CSS file. Both light and dark mode tokens live there.

### Data flow

All state lives in a single `useReducer` in `src/hooks/usePatternState.js`, backed by `src/state/patternReducer.js`. The reducer module also exports `createActions` (action creator factory) and `createSelectors` (computed value selectors). The main orchestrator is `src/pages/PatternGenerator.jsx`, which owns rendering logic and passes state + actions down to `Sidebar` and `PatternPreview`.

### Pattern generation (canvas-based, two-step)

The active path in `PatternGenerator.jsx` uses two exports from `src/components/pattern/patternGenerator.jsx`:

1. **`generateBackgroundPattern()`** — Draws tiled/scattered image objects onto a 2400×2400 master canvas with seeded randomness, then crops to the target size. Returns a data URL stored in `state.backgroundCache`.
2. **`compositeOverlayOnBackground()`** — Takes a cached background data URL and layers overlays (transparent, solid color, book covers, text) on top. Returns a composited data URL stored in `state.compositedPatterns`.

A third export, `generatePatternFromSettings()`, combines both steps in one pass and is still present but not used by the main rendering path.

Pattern keys in both caches are `"WIDTHxHEIGHT"` strings (e.g. `"1200x628"`). The `emailVariant: 'both'` case for 1080×1080 generates two keys: `"1080x1080-text"` and `"1080x1080-books"`.

Canvas utilities (image loading, tinting, seeded random, text wrapping) live in `src/utils/patternUtils.js`. These utilities are dual-context: they use `OffscreenCanvas`/`createImageBitmap` in a worker environment and fall back to `HTMLCanvasElement`/`HTMLImageElement` on the main thread.

A web worker (`src/workers/patternWorker.js`) exists but is currently disabled — `forceMainThread = true` in `PatternGenerator.jsx` routes all work to the main thread.

### Keyboard shortcuts

Handled by `src/hooks/useKeyboardShortcuts.js`: `Ctrl/Cmd+Enter` (render), `Ctrl/Cmd+S` (download), `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` (undo/redo). Shortcuts are suppressed when focus is inside an `<input>` or `<textarea>`.

### Component structure

- `src/components/pattern/` — feature components: `Sidebar`, `PatternPreview`, `ColorPalette`, `GenreSelector`, `SizeSelector`, `ImageUploader`, `BookUploader`
- `src/components/ui/` — generic Radix UI wrapper components (button, dialog, select, toast, etc.)

### Sizes & collections

Defined as constants at the top of `PatternGenerator.jsx`. A "size" is a `{width, height, name}` object; a "collection" groups multiple sizes. The `selectedSizeKey` can be either a single size key (`"1200x628"`) or a collection key (`"all-sizes"`).

### Genre color palettes

Hard-coded in `PatternGenerator.jsx` (`GENRE_COLORS_OBJ`). JSON palette files in `src/data/` exist but are supplemental — the active palettes used at runtime are the in-file constants.
