# Read Down Creative — Developer Setup

This is a React + Vite app. It runs entirely in the browser with no backend.

---

## Prerequisites

You need **Node.js 18 or higher** installed. Check your version:

```bash
node --version
```

If you need to install Node, download it from [nodejs.org](https://nodejs.org) (choose the LTS version).

---

## Getting Started

### 1. Extract the zip

Unzip the project folder somewhere on your machine. You should see files like `package.json`, `vite.config.js`, and a `src/` folder.

### 2. Open a terminal in the project folder

Navigate into the project root:

```bash
cd read-down-creative
```

### 3. Install dependencies

```bash
npm install
```

This downloads all the packages listed in `package.json` into a `node_modules/` folder. It only needs to be done once (or again if `package.json` changes).

### 4. Start the dev server

```bash
npm run dev
```

The terminal will show something like:

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## Running in Coder

Coder automatically detects and forwards ports. Once `npm run dev` is running, look for the **port 5173** notification in your Coder workspace — click it to open the app in your browser.

The Vite config already has `allowedHosts: true`, so no extra configuration is needed to access it through Coder's proxy.

---

## Available Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server (hot reload enabled) |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run lint` | Run ESLint to check for code issues |
| `npm run preview` | Preview the production build locally |

---

## Project Structure

```
src/
  components/pattern/   # Main feature components (Sidebar, PatternPreview, etc.)
  components/ui/        # Generic UI primitives (buttons, dialogs, selects)
  hooks/                # Custom React hooks (state, keyboard shortcuts)
  pages/                # Page-level components and layout
  state/                # useReducer state management
  utils/                # Canvas drawing helpers
  workers/              # Web worker (currently disabled)
  data/                 # Static data (genre palettes, background styles)
fonts/                  # Local font files
images/                 # Static images used in pattern generation
public/                 # Files served as-is (favicon, etc.)
```

## Key Things to Know

- **All state** is managed in one place: `src/hooks/usePatternState.js` backed by `src/state/patternReducer.js`.
- **Pattern generation** happens on the main thread via canvas in `src/components/pattern/patternGenerator.jsx`.
- **Design tokens** (colors, spacing) are defined as CSS custom properties inside `src/pages/Layout.jsx` — not in a separate CSS file.
- **Path alias**: `@/` resolves to `src/`, so `@/components/ui/button` means `src/components/ui/button`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Enter` | Render pattern |
| `Ctrl/Cmd + S` | Download pattern |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

Shortcuts are suppressed when focus is inside a text input.

---

## Troubleshooting

**Port already in use**
If port 5173 is taken, Vite will automatically try 5174, 5175, etc. Check the terminal output for the actual URL.

**`npm install` fails**
Make sure you're running it from the project root (the folder containing `package.json`). Also confirm your Node version is 18+.

**App loads but images are missing**
The `images/` folder must be present in the project root alongside `src/`. It should be included in the zip — if not, ask for it.

**White screen / blank app**
Open your browser's developer tools (F12), check the Console tab for errors, and share them with the project owner.
