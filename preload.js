const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),
  history: {
    load:  ()        => ipcRenderer.invoke('history-load'),
    save:  (entries) => ipcRenderer.invoke('history-save', entries),
    clear: ()        => ipcRenderer.invoke('history-clear'),
  }
});
