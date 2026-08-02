# Copilot instructions

- This is a React/Vite Electron cashier and KDS client.
- Preserve `contextIsolation: true`, `nodeIntegration: false`, and narrow
  `contextBridge` APIs. Never expose raw `ipcRenderer`.
- Keep network behavior in `src/api/kdsService.js` and trusted native behavior
  in main/preload boundaries.
- Backend authorization is authoritative for roles, tenants, branches, and financial operations.
- Run `npm run lint` and `npm run build`; package only for native/release changes.

## Maintenance matrix

| When changing | Also update or verify |
| --- | --- |
| Electron IPC | `public/electron.js`, `public/preload.js`, renderer caller/listener, validation, error handling, and tests |
| Order or KDS event | `src/api/kdsService.js`, UI state, Socket.IO/API contract, reconnect/duplicate behavior, backend gateway, and mobile/web parity |
| Payment or cashout | Totals/currency, permissions, audit expectations, printer output, backend contract, reporting, and tests |
| Printer or filesystem behavior | Main/preload boundary, path/input validation, permissions, failure recovery, packaging, and platform smoke tests |
| Auth, tenant, or branch flow | Renderer session UI, API headers/context, backend authorization, reconnect behavior, and logout cleanup |
| Environment or API domain | Vite variables, KDS service, backend CORS/WebSocket origin, release workflow, and connectivity checks |
| Electron/Node dependency | Manifest, lockfile, preload compatibility, Copilot setup, release workflow, lint, build, and packaging |
