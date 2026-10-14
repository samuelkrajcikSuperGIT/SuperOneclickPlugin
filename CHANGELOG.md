# Update notes

Newest first. The version matches `manifest.json`.

## 0.10.3
- Updated the extension description and README to list all current features.
- Code moved to the SuperOneclickPlugin GitHub repo; releases are built as a zip automatically from version tags.

## 0.10.2
- **Transactions** now clicks Submit in both Financial Transactions and All Transactions (list is `submitUnder` in `content.js`).

## 0.10.1
- **Transactions** clicks the Submit under Financial Transactions after scrolling.

## 0.10.0
- New shortcut **Transactions**: opens the finance page and scrolls to Financial Transactions.
- Shortcuts that share a page (Add funds, Transactions) are no longer both highlighted.

## 0.9.0
- New shortcut **Sessions**: opens the Sessions page and clicks Submit in Successful and Unsuccessful Logins.

## 0.8.1
- Fixed Add funds not scrolling: heading is found by its text anywhere on the page, and the scroll retries for a few seconds while the page loads.

## 0.8.0
- Renamed Finance to **Add funds**; it scrolls to Manual Adjustments.

## 0.7.0
- New shortcut bar at the top of player pages: **KYC** (Due Diligence) and Finance.

## 0.6.0
- Currency badge (for example PLN) next to the amount in the adjustment drawer, read from the player's balance.

## 0.5.1
- Fixed Subreason, Direction and Comment not filling for Stuck round. Dropdowns now pick only from the open list, check the value took, and retry.

## 0.5.0
- New preset **Stuck round** (reason other, subreason other, credit, comment "Crediting customer for stuck round/provider error"). Never auto-submits the drawer.
- Drawer bar now has one button per preset.

## 0.4.0
- The "Type confirm below" popup is pre-filled automatically (whoever opens it). You click its Submit.

## 0.3.0
- Broader detection of the confirmation popup.

## 0.2.0
- Confirm step no longer auto-clicks; you click it yourself.

## 0.1.0
- First version: **Test funds** button in the Create Manual Adjustment drawer fills type, reason, subreason, direction, amount and comment.
- Safety guard: the drawer's Submit is only auto-clicked for players with an `@super.xyz` email or an allowlisted ID.
