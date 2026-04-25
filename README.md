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

### 🕓 History Panel
- Every operation (Format, Beautify, Encode, Compare, Test…) is automatically saved to history
- Click **History** in the title bar to open the panel
- Restore any past operation into the current tab or **open it in a new tab**
- Clear all history with one click

### 🎨 UI
- Dark and Light theme (persisted across sessions)
- Draggable split panes — resize input/output panels freely
- macOS native title bar with traffic light buttons
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
Supports both **Apple Silicon (arm64)** and **Intel (x64)**.

> **Note:** To include a custom app icon, place an `icon.icns` file inside the `build/` directory before running the build command.

---

## 🗂 Project Structure

```
special-dev-tool/
├── main.js          # Electron main process — window, menus, IPC
├── preload.js       # Context bridge (clipboard access)
├── renderer/
│   ├── index.html   # App shell — sidebar, tool panels, history panel
│   ├── style.css    # Full dark/light theme, layout, component styles
│   └── app.js       # All tool logic, tab system, history manager
├── build/           # App icon and electron-builder resources
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

- [Electron](https://www.electronjs.org/) 33
- [CodeMirror 5](https://codemirror.net/5/) — JSON & XML editors with syntax highlighting, folding and linting
- Vanilla HTML / CSS / JavaScript — no frontend framework

---

## 📄 License

MIT © [seydaozdmr](https://github.com/seydaozdmr)
