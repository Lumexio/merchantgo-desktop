# MerchantGo Desktop Agent Guide

## Purpose and structure

This React 19/Vite Electron client is the MerchantGo cashier and kitchen
display application. `public/electron.cjs` owns the main process,
`public/preload.cjs` owns the renderer bridge, `src/api/kdsService.js` owns KDS
data access, and `src/App.jsx` owns the current UI.

## Commands

```bash
npm ci
npm run dev
npm run lint
npm run build
```

Run `npx electron-builder --linux` or the release workflow only when packaging
or native behavior changes.

## Rules

- Preserve Electron `contextIsolation: true` and `nodeIntegration: false`.
- Expose narrow preload APIs; never expose raw `ipcRenderer`.
- Keep payment, cashout, order, and KDS behavior aligned with the backend.
- Treat renderer role/tenant checks as UX; backend authorization is final.
- Keep printing and filesystem work in trusted main/preload boundaries.

## Maintenance cascade

IPC changes require the main handler, preload bridge, renderer caller/listener,
error handling, and tests. Order/KDS changes require API/event payloads,
reconnect behavior, backend gateway, mobile/web parity, and packaging checks.
