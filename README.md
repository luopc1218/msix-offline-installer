# MSIX Offline Installer

A Windows desktop GUI built with Tauri v2, React, TypeScript, and Rust for installing `.msix` / `.msixbundle` packages in offline environments.

## Features

- Select `msix`, `msixbundle`, `appx`, or `appxbundle` packages
- Optional `license.xml` support for provisioned installs
- Optional dependency package selection
- Drag and drop package files into the UI
- Real-time PowerShell stdout / stderr log streaming
- Parse package manifest metadata
- Detect sibling dependency candidates in the package directory
- Run with `requireAdministrator` on Windows

## Install Modes

- Current user install
  - Uses `Add-AppxPackage`
  - Supports dependency packages
  - `license.xml` is intentionally ignored because `Add-AppxPackage` does not support `-LicensePath`
- Provisioned system install
  - Uses `Add-AppxProvisionedPackage -Online`
  - Supports `license.xml`
  - Supports dependency packages

## Tech Stack

- Frontend: React + TypeScript + Vite
- Desktop runtime: Tauri v2
- Backend: Rust
- Windows integration: PowerShell via `std::process::Command`

## Local Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run build
```

## Release

This repository includes a GitHub Actions workflow that builds a Windows x64 NSIS installer and publishes it to GitHub Releases when a tag like `v0.1.1` is pushed.

Generated release artifacts include:

- NSIS installer

## Project Structure

```text
src/
  App.tsx
  components/
    FileDrop.tsx
    InstallerPanel.tsx
    LogPanel.tsx
  services/
    tauriService.ts

src-tauri/
  build.rs
  tauri.conf.json
  src/
    commands.rs
    main.rs
```

## Notes

- Package installation commands only run on Windows.
- Development on macOS is supported, but actual MSIX installation and final Windows packaging must run on Windows or GitHub Actions Windows runners.

## License

MIT
