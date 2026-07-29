const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('merchantGoIPC', {
  send: (channel, data) => {
    const validChannels = ['print-ticket', 'drawer-open', 'sync-stockmachine'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = ['print-ticket-status', 'drawer-status', 'websocket-sync-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});

console.log('⚡ [MerchantGo Preload] Context bridge exposed successfully for POS cashier terminal.');
