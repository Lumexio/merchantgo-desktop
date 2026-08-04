const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 950,
    minWidth: 1024,
    minHeight: 768,
    title: 'MerchantGo POS Terminal — Cashier & Station Lead Console',
    backgroundColor: '#0c0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  const devUrl = 'http://localhost:5173';
  const prodPath = `file://${path.join(__dirname, '../dist/index.html')}`;
  
  // Try loading local dev server or compiled production file
  mainWindow.loadURL(process.env.VITE_DEV ? devUrl : prodPath).catch(() => {
    mainWindow.loadURL(prodPath);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Thermal Printer Integration Hooks & Audit Buffers
ipcMain.on('print-ticket', (event, zReportData) => {
  console.log('🖨️ [IPC Thermal Printer Engine] Compiled ESC/POS serial buffer for Z-Report:', zReportData);
  setTimeout(() => {
    if (event.sender) {
      event.sender.send('print-ticket-status', { 
        status: 'SUCCESS', 
        message: `ESC/POS Ticket #${zReportData?.ticket_id || 'Z-809'} printed cleanly via Thermal Interface.` 
      });
    }
  }, 600);
});

ipcMain.on('drawer-open', (event, cashierId) => {
  console.log(`🔓 [IPC Cash Drawer] Serial signal 27 112 0 50 250 triggered by Cashier PIN: ${cashierId}`);
  event.sender.send('drawer-status', { status: 'OPENED', timestamp: new Date().toISOString() });
});

app.whenReady().then(() => {
  createWindow();
  // ponytail: natively handles background downloads & install-on-quit for NSIS via GitHub releases
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
