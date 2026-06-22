Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'api', {
  writable: true,
  value: {
    files: {
      listDirectory: () => Promise.resolve([]),
      readFile: () => Promise.resolve({ path: '', content: '' }),
      getFileInfo: () =>
        Promise.resolve({ name: '', path: '', isDirectory: false, isHidden: false }),
    },
    search: {
      searchContent: () => {},
      onResult: () => {},
      offResult: () => {},
    },
    watcher: {
      watchFile: () => {},
      unwatchFile: () => {},
      onChange: () => {},
      offChange: () => {},
    },
    store: {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
    dialog: {
      openDirectory: () => Promise.resolve(null),
      openFile: () => Promise.resolve(null),
    },
    shell: {
      openExternal: () => Promise.resolve(),
    },
    ipc: {
      on: () => {},
      off: () => {},
    },
  },
})
