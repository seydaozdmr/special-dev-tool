const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read')
});
