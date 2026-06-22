# Markdown Viewer — Architecture Design

## Overview

A cross-platform Electron desktop markdown viewer with workspace-based file management, multi-tab editing, rich rendering (GFM + KaTeX + Mermaid), search, and state persistence.

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop framework | Electron |
| Build tool | electron-vite |
| Packaging | electron-builder (Windows/macOS/Linux) |
| Frontend framework | React + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State management | zustand |
| Markdown rendering | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| Mermaid | mermaid (dynamic import, cached after first use) |
| Code highlighting | highlight.js (auto-detect 190+ languages) |
| IPC | preload + contextBridge + ipcRenderer.invoke / ipcMain.handle |
| Local resources | Custom protocol `local-file://` |
| Persistence | electron-store |

## Project Structure

```
markdown-viewer/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # Entry, lifecycle orchestration
│   │   ├── window.ts          # BrowserWindow management
│   │   ├── menu.ts            # System menu + accelerators
│   │   ├── protocol.ts        # local-file:// protocol handler
│   │   ├── watcher.ts         # fs.watch for open files
│   │   ├── search.ts          # Global content search
│   │   └── store.ts           # electron-store wrapper
│   ├── preload/               # Context bridge (security boundary)
│   │   ├── index.ts           # API exposure
│   │   └── index.d.ts         # API type declarations
│   ├── renderer/              # React frontend
│   │   ├── index.html
│   │   ├── main.tsx           # Entry
│   │   ├── App.tsx            # Root layout
│   │   ├── components/        # Shared UI components
│   │   ├── features/          # Feature modules
│   │   │   ├── welcome/       # Startup page
│   │   │   ├── file-tree/     # Recursive file tree
│   │   │   ├── tabs/          # Tab bar
│   │   │   ├── markdown-viewer/ # Markdown renderer
│   │   │   ├── outline/       # Heading outline panel
│   │   │   ├── search/        # File + content search
│   │   │   └── settings/      # User preferences
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # Shared hooks
│   │   └── styles/            # Tailwind + global CSS
│   └── shared/                # Types + utils (main + renderer)
│       ├── types.ts           # IPC channel names, interfaces
│       └── utils.ts
└── resources/                 # Icons, packaging assets
```

## Architecture: Layered (Recommended)

```
┌──────────────────────────────────────┐
│         Renderer (React)              │
│  features + stores + components       │
│              │                        │
│          contextBridge                │
│              │                        │
├──────────────────────────────────────┤
│         Preload (type-safe API)        │
│              │                        │
│         ipcRenderer.invoke            │
│              │                        │
├──────────────────────────────────────┤
│         Main Process                  │
│  window / fs / watcher / search       │
│              │                        │
│          electron-store               │
└──────────────────────────────────────┘
```

## Main Process Modules

### index.ts
- App lifecycle: `app.ready` → init modules → restore state → show window
- Cleanup on quit

### window.ts
- Create BrowserWindow with saved size/position
- Persist window bounds on resize/move
- Handle close → save state for restoration

### menu.ts
- Application menu (File, Edit, View, Help)
- Keyboard shortcuts (Ctrl+P, Ctrl+Shift+F, Ctrl+B, Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+,, etc.)
- Recent files submenu

### protocol.ts
- Register `local-file://` protocol
- Map protocol requests to local file system paths
- Set appropriate MIME types

### watcher.ts
- `fs.watch` on all currently opened file paths
- On change: read new content, push to renderer via `webContents.send`
- Handle file deletion / rename

### search.ts
- File name search: recursive directory scan, filter by name
- Content search: read files + regex match, stream results to renderer
- Prioritize file name results, then content results

### store.ts
- Electron-store wrapper for typed persistence
- Keys: windowBounds, theme, ignoreList, recentFiles, recentDirs, readingPositions, openFiles

## IPC API (Preload Bridge)

```
files:        listDirectory, readFile, getFileInfo
search:       searchContent (main → renderer streaming)
watcher:      watchFile, unwatchFile, onFileChange
window:       setTitle, minimize/maximize/close
store:        get, set, delete
dialog:       openDirectory, openFile
shell:        openExternal
```

## User Flow

1. **App launch**: restore last workspace state (or show welcome page)
2. **Welcome page**: recent files/dirs list, button to open folder
3. **Workspace**: open directory → file tree populates on left
4. **Open file**: click in tree → new tab opens → markdown renders
5. **Navigation**: tab bar for switching, file tree for browsing
6. **Search**: Ctrl+P for file search, Ctrl+Shift+F for content search
7. **External change**: fs.watch detects → auto-update tab content
8. **Settings**: Ctrl+, for preferences
9. **App close**: save window bounds, open files, reading positions

## State Management (Zustand)

| Store | Data |
|---|---|
| `useFileStore` | File tree data, expand/collapse state |
| `useTabStore` | openFiles[], activeFileId, dirty flag |
| `useEditorStore` | Rendered content per file (lazy loaded) |
| `useOutlineStore` | Current file heading list |
| `useSearchStore` | Search query, results (file + content) |
| `useSettingsStore` | User config (theme, ignoreList) |
| `useUIStore` | Theme, panel visibility, window state |

## Data Flow

### Normal file open
```
Click file in tree
  → useTabStore.openFile(id)
  → IPC invoke readFile
  → content returned
  → useEditorStore.setContent(id, content)
  → markdown-viewer renders
```

### File search
```
Ctrl+P → type query
  → IPC invoke searchFiles
  → results returned
  → select result → useTabStore.openFile(id)
```

### Global content search
```
Ctrl+Shift+F → type query
  → IPC invoke searchContent
  → main process streams results via webContents.send
  → useSearchStore appends results progressively
  → UI shows file name results first, content matches later
```

### External file change
```
fs.watch detects change
  → main process reads new content
  → webContents.send to renderer
  → useTabStore sets dirty flag
  → markdown-viewer re-renders automatically
```

## Feature Module Details

### File Tree
- Recursive React component
- Default: show all files (including hidden)
- Hidden files (.prefix) displayed in gray
- Ignore list: .git, node_modules, __pycache__, .DS_Store by default
- Directory without supported extensions → not expandable (gray)
- Supported: .md, .markdown

### Tabs
- Horizontal tab bar at top
- Each open file = one tab
- Click tab to switch, close button or middle-click to close
- Dirty marker on external change (brief "refreshed" indicator)
- Lazy loading: render content only when tab is active

### Markdown Viewer
- Full GFM: tables, task lists, strikethrough, footnotes, autolinks
- Math: inline `$...$` and block `$$...$$` via KaTeX
- Mermaid: intercept ` ```mermaid ` code blocks, render with mermaid.run()
- Code blocks: syntax highlighting via highlight.js (auto-detect)
- Image: rewrite relative paths → absolute → local-file:// protocol

### Outline
- Right panel showing H1-H6 headings of current file
- Click heading → scroll to position
- Active heading highlighted based on scroll position
- Uses IntersectionObserver

### Search
- File search: Ctrl+P, fuzzy match on filename, top results
- Content search: Ctrl+Shift+F, async search with progressive results
- File name results show first, content results stream in

### Settings
- Ignore list editor
- Theme toggle (dark/light/system)
- Accessible via Ctrl+,

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+P | File search |
| Ctrl+Shift+F | Content search |
| Ctrl+B | Toggle file tree |
| Ctrl+T | Toggle outline |
| Ctrl+W | Close current tab |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |
| Ctrl+, | Open settings |

## Link Handling
- Internal `.md` link → open in new tab within app
- External link (`https://`) → system default browser
- Image relative paths → resolve to absolute → local-file://

## Image Handling
- Custom `local-file://` protocol for local images
- Renderer rewrites relative `src` to `local-file://` absolute URLs
- Main process registers protocol handler

## Window Management
- Single window
- Startup: restore last position/size
- Close: save window state for next launch

## Persistence (electron-store)

| Key | Data |
|---|---|
| windowBounds | { x, y, width, height } |
| theme | "system" \| "light" \| "dark" |
| ignoreList | string[] |
| recentFiles | { path, name, timestamp }[] |
| recentDirs | { path, name, timestamp }[] |
| readingPositions | { [filePath]: scrollPosition } |
| lastWorkspace | path |
| openFiles | string[] (file paths open on last close) |

## Scope Note
- Single window only (no split pane in V1)
- No custom file icons
- No customizable shortcuts
- No independent preview window
