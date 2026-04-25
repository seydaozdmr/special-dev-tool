# 🛠 Special Dev Tool

A lightweight, offline-first developer toolbox for macOS — built with Electron.  
No internet required, no data leaves your machine.

---

## ✨ Features

### 🔧 Tools

| Tool | Description |
|------|-------------|
| **JSON Formatter** | Parse, format, minify and validate JSON with syntax highlighting and collapsible tree view |
| **XML Beautify** | Beautify or minify XML documents with configurable indentation |
| **HTML Encoder / Decoder** | Encode special characters to HTML entities (named or numeric) and decode them back |
| **Text Diff** | Compare two texts side by side — supports line, word and character level diff |
| **Regex Tester** | Test regular expressions with live match highlighting and group capture details |

### 📑 Multi-Tab Support
- Open **multiple independent tabs** for each tool
- Each tab preserves its own input, output and settings
- Double-click a tab label to rename it
- Add new tabs with the `+` button, close with `×`

### 🕓 Persistent History Panel
- Every operation (Format, Beautify, Encode, Compare, Test…) is automatically saved to history
- History is **persisted to disk** via `electron-store` — survives app restarts
- Click **History** in the title bar to open the panel
- Restore any past operation into the current tab or **open it in a new tab**
- Clear all history with one click
- Stored at: `~/Library/Application Support/json-formatter/devtools-history.json`

### 🎨 UI
- Dark and Light theme (persisted across sessions)
- Draggable split panes — resize input/output panels freely
- macOS native title bar with traffic light buttons
- Custom app icon (generated via Electron canvas + `iconutil`)
- Keyboard-friendly — focus stays in editors

---

## 📸 Screenshots

> _Coming soon_

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Install & Run

```bash
git clone https://github.com/seydaozdmr/special-dev-tool.git
cd special-dev-tool
npm install
npm start
```

### Build macOS DMG

```bash
npm run build
```

The `.dmg` file will be generated in the `dist/` folder.  
Supports **Apple Silicon (arm64)**.

> **First launch:** macOS may show a Gatekeeper warning since the app is unsigned.  
> Right-click the app → **Open** to bypass it.

### Regenerate App Icon

```bash
npx electron ./build/generate-icon.js
```

This renders the icon at all required sizes via Electron canvas and packages them into `build/icon.icns` using `iconutil`.

---

## 🗂 Project Structure

```
special-dev-tool/
├── main.js              # Electron main process — window, menus, IPC, history store
├── preload.js           # Context bridge (clipboard + history IPC)
├── renderer/
│   ├── index.html       # App shell — sidebar, tool panels, history panel
│   ├── style.css        # Full dark/light theme, layout, component styles
│   └── app.js           # All tool logic, tab system, history manager
├── build/
│   ├── generate-icon.js # Icon generator script (Electron canvas → ICNS)
│   ├── icon.icns        # App icon (all retina sizes)
│   └── icon.iconset/    # Individual PNG sizes (16px – 1024px)
└── package.json
```

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New tab | `+` button in tab bar |
| Close tab | `×` on tab |
| Rename tab | Double-click tab label |
| Toggle history | History button in title bar |
| Toggle theme | Sidebar footer button |

---

## 🛠 Tech Stack

| | |
|---|---|
| [Electron](https://www.electronjs.org/) 33 | Desktop shell |
| [CodeMirror 5](https://codemirror.net/5/) | JSON & XML editors with syntax highlighting, folding and linting |
| [electron-store](https://github.com/sindresorhus/electron-store) 8 | Persistent history storage |
| Vanilla HTML / CSS / JS | UI — no frontend framework |

---

## 📄 License

MIT © [seydaozdmr](https://github.com/seydaozdmr)
