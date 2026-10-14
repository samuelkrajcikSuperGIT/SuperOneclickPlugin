# SuperOneclickPlugin
Oneclick plugin for test funds and other routine tasks.

A Chrome extension for the Betler back-office:

- **Adjustment drawer:** type an amount and click **Test funds** or **Stuck round**. All fields are filled, a currency badge shows the player's currency, and the "Type confirm below" popup is pre-filled. You click Submit.
- **Shortcuts bar on player pages:** **KYC**, **Add funds**, **Sessions**, **Transactions**.
- Safety: Test funds only auto-clicks the drawer's Submit for allowlisted players (`@super.xyz` email or an ID in `allowCustomerIds`). Stuck round never auto-submits.

## Install (teammates)
1. Download the latest zip from the **Releases** page and unzip it somewhere permanent.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the unzipped folder (the one containing `manifest.json`).
3. Reload the back-office tab.

To update: download the newest release zip, replace the old folder's files, click the reload icon on the extension, then reload the tab.

## Develop
The extension lives in `extension/`. Load that folder with **Load unpacked** to test changes. Settings (presets, shortcuts, allowlist) are in the `CONFIG` block at the top of `extension/content.js`.

## Push changes
Double-click `Push update.command`. Leave the version blank for a normal push, or enter a version (for example `0.10.4`) to also publish a release zip.

## Release a new version
1. Change the code, then add a `## X.Y.Z` section at the top of `CHANGELOG.md`.
2. Run `scripts/release.sh X.Y.Z`. It bumps `extension/manifest.json`, commits, tags `vX.Y.Z` and pushes.
3. GitHub Actions checks the version, builds `super-oneclick-plugin-vX.Y.Z.zip` and publishes it as a Release with the changelog notes.

## If something doesn't work
Open DevTools (Cmd+Opt+J) and look for lines starting with `[TestFunds]`.
