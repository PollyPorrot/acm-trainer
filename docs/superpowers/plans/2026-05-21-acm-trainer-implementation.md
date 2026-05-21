# ACM Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP Windows desktop ACM training assistant described in `docs/superpowers/specs/2026-05-21-acm-trainer-design.md`.

**Architecture:** Use Electron for native Windows behavior, React for the UI, and SQLite for local data. Keep main-process native integrations, preload IPC bridges, renderer UI, and shared types in separate folders so each unit stays focused and testable.

**Tech Stack:** Electron, React, TypeScript, Vite, SQLite via `better-sqlite3`, Vitest, Playwright, Windows notifications, Electron Tray, Electron `powerMonitor`.

---

## File Structure

Create this structure:

```text
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
vitest.config.ts
playwright.config.ts
index.html
src/main/main.ts
src/main/windows.ts
src/main/tray.ts
src/main/ipc.ts
src/main/autostart.ts
src/main/reminderScheduler.ts
src/main/contestRefresh.ts
src/main/timerWindow.ts
src/main/mediaImport.ts
src/preload/preload.ts
src/shared/types.ts
src/shared/date.ts
src/shared/platforms.ts
src/shared/linkMetadata.ts
src/data/db.ts
src/data/schema.ts
src/data/repositories/contestCacheRepo.ts
src/data/repositories/vpContestRepo.ts
src/data/repositories/vpReviewRepo.ts
src/data/repositories/imageWallRepo.ts
src/data/repositories/settingsRepo.ts
src/data/repositories/dailyReminderRepo.ts
src/providers/codeforces.ts
src/providers/atcoder.ts
src/providers/nowcoder.ts
src/renderer/App.tsx
src/renderer/main.tsx
src/renderer/styles.css
src/renderer/api.ts
src/renderer/pages/TodayPage.tsx
src/renderer/pages/ContestReminderPage.tsx
src/renderer/pages/VpContestPage.tsx
src/renderer/pages/VpReviewPage.tsx
src/renderer/pages/ImageWallPage.tsx
src/renderer/pages/SettingsPage.tsx
src/renderer/components/Layout.tsx
src/renderer/components/TimerPanel.tsx
src/renderer/components/ReminderModal.tsx
tests/unit/date.test.ts
tests/unit/platforms.test.ts
tests/unit/linkMetadata.test.ts
tests/unit/providers.test.ts
tests/unit/repositories.test.ts
tests/e2e/app-shell.spec.ts
```

Responsibility boundaries:

- `src/main`: Electron native behavior, windows, tray, notifications, unlock handling, IPC registration.
- `src/preload`: safe renderer bridge only; no business logic.
- `src/shared`: shared TypeScript types and pure helpers.
- `src/data`: SQLite schema and repositories.
- `src/providers`: contest fetchers and parsers.
- `src/renderer`: React UI.
- `tests/unit`: pure helper, provider, and repository tests.
- `tests/e2e`: app smoke tests.

## Task 1: Environment And Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Install or repair Node LTS**

Run:

```powershell
winget install OpenJS.NodeJS.LTS
node --version
npm --version
```

Expected: `node --version` and `npm --version` print versions without `Access is denied`.

- [ ] **Step 2: Create package manifest**

Add `package.json` with scripts for dev, build, test, and Electron launch. Use dependencies: `@vitejs/plugin-react`, `typescript`, `vite`, `react`, `react-dom`, `electron`, `electron-builder`, `concurrently`, `wait-on`, `better-sqlite3`, `@electron/rebuild`, `vitest`, `@playwright/test`, `jsdom`, `lucide-react`, `clsx`, `date-fns`, `cheerio`, `zod`.

- [ ] **Step 3: Install dependencies**

Run:

```powershell
npm install
```

Expected: `node_modules` exists and `package-lock.json` is created.

- [ ] **Step 4: Add TypeScript, Vite, Vitest, and Playwright configs**

Configure:

- `tsconfig.json` for renderer/shared TypeScript.
- `tsconfig.node.json` for Electron main/preload TypeScript.
- `vite.config.ts` with React plugin and `src/renderer/main.tsx` entry.
- `vitest.config.ts` with `environment: "jsdom"` for renderer tests and Node-compatible unit tests.
- `playwright.config.ts` for Chromium smoke tests.

- [ ] **Step 5: Add minimal React shell**

Create `index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, and `src/renderer/styles.css`. The page should render a left navigation placeholder and the text `ACM Trainer`.

- [ ] **Step 6: Verify scaffold**

Run:

```powershell
npm run test -- --run
npm run build
```

Expected: tests pass or report no tests found successfully, and Vite build succeeds.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts playwright.config.ts index.html src
git commit -m "chore: scaffold electron react app"
```

## Task 2: Electron Main Process, Preload, Tray, And Windows

**Files:**
- Create: `src/main/main.ts`
- Create: `src/main/windows.ts`
- Create: `src/main/tray.ts`
- Create: `src/main/ipc.ts`
- Create: `src/main/autostart.ts`
- Create: `src/main/timerWindow.ts`
- Create: `src/preload/preload.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Electron build scripts**

Add scripts:

```json
{
  "dev": "concurrently \"npm:dev:renderer\" \"npm:dev:electron\"",
  "dev:renderer": "vite --host 127.0.0.1",
  "dev:electron": "wait-on http://127.0.0.1:5173 && electron .",
  "build": "vite build && tsc -p tsconfig.node.json",
  "start": "electron ."
}
```

Set Electron entry fields so `electron .` loads compiled main output.

- [ ] **Step 2: Implement window management**

In `windows.ts`, create:

- main window.
- reminder modal window.
- timer window.

Use `BrowserWindow` with preload enabled, context isolation on, and node integration off. Timer window must support `alwaysOnTop`.

- [ ] **Step 3: Implement tray behavior**

In `tray.ts`, create tray menu items:

- Open ACM Trainer
- Open Timer
- Refresh Contests
- Today Reminder
- Quit

Closing the main window hides it instead of quitting. The Quit tray action fully exits the app.

- [ ] **Step 4: Implement autostart wrapper**

In `autostart.ts`, expose:

- `getAutostartEnabled()`
- `setAutostartEnabled(enabled: boolean)`

Use Electron `app.getLoginItemSettings()` and `app.setLoginItemSettings({ openAtLogin: enabled })`.

- [ ] **Step 5: Implement preload bridge**

Expose `window.acmTrainer` with typed methods for:

- app settings.
- contest refresh.
- VP contests.
- reviews.
- images.
- timer.

The bridge delegates to `ipcRenderer.invoke`.

- [ ] **Step 6: Wire main startup**

In `main.ts`, initialize app, create the main window, register IPC, create tray, and handle `window-all-closed` without quitting on Windows.

- [ ] **Step 7: Add app shell smoke test**

Create `tests/e2e/app-shell.spec.ts` to launch the app in dev or packaged test mode and assert the main page contains `ACM Trainer`.

- [ ] **Step 8: Verify and commit**

Run:

```powershell
npm run build
npm run test -- --run
```

Expected: build succeeds and tests pass.

Commit:

```powershell
git add package.json src/main src/preload tests/e2e
git commit -m "feat: add electron shell and tray"
```

## Task 3: Shared Types, Dates, And Platform Detection

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/date.ts`
- Create: `src/shared/platforms.ts`
- Create: `src/shared/linkMetadata.ts`
- Create: `tests/unit/date.test.ts`
- Create: `tests/unit/platforms.test.ts`
- Create: `tests/unit/linkMetadata.test.ts`

- [ ] **Step 1: Define shared domain types**

In `types.ts`, define:

- `Platform`
- `ContestReminder`
- `VpContest`
- `VpReview`
- `ImageWallItem`
- `AppSettings`
- `DailyReminderState`
- `TimerMode`
- `TimerSnapshot`

Use ISO strings for persisted dates.

- [ ] **Step 2: Write date helper tests**

Test:

- `isSameLocalDay()`
- `monthKeyFromIso()`
- `formatLocalDateTimeInput()`
- `parseLocalDateTimeInput()`

- [ ] **Step 3: Implement date helpers**

Use local time semantics because VP dates and daily reminders are tied to the user's Windows day.

- [ ] **Step 4: Write platform detection tests**

Test detection for:

- Codeforces
- AtCoder
- Nowcoder
- QOJ
- Luogu
- Jisuanke
- VJudge
- HDU
- unknown URLs

- [ ] **Step 5: Implement platform detection**

Map URL hostnames and path patterns to `Platform`. Unknown URLs return `unknown` and remain savable.

- [ ] **Step 6: Write link metadata tests**

Test HTML title extraction and Open Graph title extraction from static strings.

- [ ] **Step 7: Implement link metadata parser**

Use `cheerio` to parse `<meta property="og:title">` first and `<title>` second.

- [ ] **Step 8: Verify and commit**

Run:

```powershell
npm run test -- --run tests/unit/date.test.ts tests/unit/platforms.test.ts tests/unit/linkMetadata.test.ts
```

Expected: all tests pass.

Commit:

```powershell
git add src/shared tests/unit/date.test.ts tests/unit/platforms.test.ts tests/unit/linkMetadata.test.ts
git commit -m "feat: add shared ACM trainer domain helpers"
```

## Task 4: SQLite Schema And Repositories

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/schema.ts`
- Create: `src/data/repositories/contestCacheRepo.ts`
- Create: `src/data/repositories/vpContestRepo.ts`
- Create: `src/data/repositories/vpReviewRepo.ts`
- Create: `src/data/repositories/imageWallRepo.ts`
- Create: `src/data/repositories/settingsRepo.ts`
- Create: `src/data/repositories/dailyReminderRepo.ts`
- Create: `tests/unit/repositories.test.ts`

- [ ] **Step 1: Write repository tests**

Test:

- database initializes schema.
- VP contest CRUD.
- one VP contest can have multiple reviews.
- review tags can be searched.
- image wall item CRUD.
- daily reminder state prevents repeat auto reminders.
- contest cache upsert replaces provider data.

- [ ] **Step 2: Implement DB initialization**

In `db.ts`, open SQLite at the app data path in production and at a temp path for tests. Enable foreign keys.

- [ ] **Step 3: Implement schema migrations**

In `schema.ts`, create tables:

- `contest_cache`
- `vp_contests`
- `vp_reviews`
- `vp_review_tags`
- `image_wall_items`
- `image_wall_tags`
- `settings`
- `daily_reminder_state`

Use integer primary keys, ISO string dates, and indexes for platform, date, and tags.

- [ ] **Step 4: Implement repositories**

Each repository should expose small functions:

- list
- get
- create
- update
- delete
- search where needed
- upsert where needed

Keep SQL inside repositories.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run test -- --run tests/unit/repositories.test.ts
```

Expected: repository tests pass.

Commit:

```powershell
git add src/data tests/unit/repositories.test.ts
git commit -m "feat: add local sqlite data layer"
```

## Task 5: Contest Providers And Cache Refresh

**Files:**
- Create: `src/providers/codeforces.ts`
- Create: `src/providers/atcoder.ts`
- Create: `src/providers/nowcoder.ts`
- Create: `src/main/contestRefresh.ts`
- Create: `tests/unit/providers.test.ts`

- [ ] **Step 1: Write provider tests with mocked fetch**

Use static responses for:

- Codeforces `contest.list` response.
- AtCoder contests HTML containing upcoming contests.
- Nowcoder HTML containing weekly, monthly, and challenge series titles.

Assert providers return normalized `ContestReminder` objects.

- [ ] **Step 2: Implement Codeforces provider**

Fetch `https://codeforces.com/api/contest.list`, keep upcoming contests, normalize start time, name, link, platform, and source.

- [ ] **Step 3: Implement AtCoder provider**

Fetch `https://atcoder.jp/contests/`, parse upcoming contests, normalize to the shared type.

- [ ] **Step 4: Implement Nowcoder provider**

Fetch candidate Nowcoder contest listing pages and keep titles matching 周赛, 月赛, or 挑战赛. Do not include winter or summer training camps in automatic fetch results.

- [ ] **Step 5: Implement cache refresh coordinator**

In `contestRefresh.ts`, call all providers, store successful results into `contest_cache`, and return:

- refreshed contests.
- failed providers.
- cache update timestamp.

If a provider fails, keep existing cache for other providers.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm run test -- --run tests/unit/providers.test.ts
```

Expected: provider tests pass.

Commit:

```powershell
git add src/providers src/main/contestRefresh.ts tests/unit/providers.test.ts
git commit -m "feat: add contest refresh providers"
```

## Task 6: IPC APIs And Renderer API Client

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/preload.ts`
- Create: `src/renderer/api.ts`

- [ ] **Step 1: Register IPC handlers**

Add handlers for:

- `settings:get`
- `settings:update`
- `contests:refresh`
- `contests:listToday`
- `vp:list`
- `vp:create`
- `vp:update`
- `vp:delete`
- `reviews:list`
- `reviews:create`
- `reviews:update`
- `reviews:delete`
- `images:list`
- `images:import`
- `images:update`
- `images:delete`
- `timer:open`
- `reminder:showToday`

- [ ] **Step 2: Expand preload bridge**

Expose typed functions on `window.acmTrainer` matching IPC handlers. Validate renderer arguments with `zod` before sending when practical.

- [ ] **Step 3: Add renderer API wrapper**

In `api.ts`, export a typed client used by React pages. Keep direct `window.acmTrainer` access in this file only.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: TypeScript build succeeds.

Commit:

```powershell
git add src/main/ipc.ts src/preload/preload.ts src/renderer/api.ts
git commit -m "feat: expose trainer ipc api"
```

## Task 7: Main UI Layout And Today Page

**Files:**
- Create: `src/renderer/components/Layout.tsx`
- Create: `src/renderer/pages/TodayPage.tsx`
- Create: `src/renderer/components/ReminderModal.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Build left navigation layout**

Create pages for:

- Today
- Contest Reminders
- VP Contests
- Reviews
- Image Wall
- Settings

Use compact desktop layout with restrained colors and clear scanning.

- [ ] **Step 2: Implement Today page data loading**

Load:

- today's cached contests.
- upcoming VP contests.
- current random image selection.
- cache update timestamp.

Render empty states without noisy text.

- [ ] **Step 3: Implement reminder modal component**

Show today's contests and one random image when available. The modal is closeable and suitable for use in a separate reminder window.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds.

Commit:

```powershell
git add src/renderer
git commit -m "feat: add today dashboard shell"
```

## Task 8: VP Contest CRUD UI And Link Recognition

**Files:**
- Create: `src/renderer/pages/VpContestPage.tsx`
- Modify: `src/main/ipc.ts`
- Modify: `src/shared/platforms.ts`

- [ ] **Step 1: Build VP list and filters**

Add filters for:

- platform.
- month.
- keyword.

List records with platform, title, VP date, link, status, and actions.

- [ ] **Step 2: Build add/edit form**

Fields:

- link.
- platform.
- contest name.
- VP date/time.
- status.
- notes.

Date uses a fixed date-time input. The date is always user-selected.

- [ ] **Step 3: Add link recognition flow**

When a link is entered:

- detect platform from URL.
- fetch page title when network is available.
- prefill platform and title.
- allow manual edits.
- save even if recognition fails.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds and VP records can be created manually in the running app.

Commit:

```powershell
git add src/renderer/pages/VpContestPage.tsx src/main/ipc.ts src/shared/platforms.ts
git commit -m "feat: add vp contest management"
```

## Task 9: VP Review UI With Multiple Reviews Per Contest

**Files:**
- Create: `src/renderer/pages/VpReviewPage.tsx`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Build review list**

Filters:

- keyword.
- tag.
- platform.
- month.

Each row shows title, linked VP contest, result tags, free tags, and update time.

- [ ] **Step 2: Build review editor**

Fields:

- linked VP contest.
- title.
- body.
- result tags.
- free tags.

Allow multiple reviews linked to the same VP contest.

- [ ] **Step 3: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds and multiple reviews can be created for one VP contest.

Commit:

```powershell
git add src/renderer/pages/VpReviewPage.tsx src/main/ipc.ts
git commit -m "feat: add vp review module"
```

## Task 10: Image Wall Import, Tags, And Random Reminder Source

**Files:**
- Create: `src/main/mediaImport.ts`
- Create: `src/renderer/pages/ImageWallPage.tsx`
- Modify: `src/preload/preload.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Implement media import**

Copy selected or dropped image files into the app data directory under `media/images`. Store original filename, stored filename, title, tags, import date, and `allowRandomReminder`.

- [ ] **Step 2: Handle drag-and-drop paths safely**

Use Electron `webUtils.getPathForFile(file)` in the preload or IPC boundary to convert renderer `File` objects into local paths. Do not rely on deprecated `file.path`.

- [ ] **Step 3: Build image wall UI**

Support:

- import by file picker.
- import by drag-and-drop.
- title edit.
- tag edit.
- allow random reminder toggle.
- delete image metadata and stored file.
- filter by tag.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds and imported images appear after app restart.

Commit:

```powershell
git add src/main/mediaImport.ts src/renderer/pages/ImageWallPage.tsx src/preload/preload.ts src/main/ipc.ts
git commit -m "feat: add local image wall"
```

## Task 11: Reminder Scheduler, Unlock Handling, And Notifications

**Files:**
- Create: `src/main/reminderScheduler.ts`
- Modify: `src/main/main.ts`
- Modify: `src/main/windows.ts`
- Modify: `src/main/tray.ts`

- [ ] **Step 1: Implement daily reminder decision**

Use `daily_reminder_state` to decide whether today has already auto-shown. The key is the user's local date.

- [ ] **Step 2: Implement startup reminder**

On app ready:

- attempt contest refresh.
- read cached contests for today.
- choose random allowed image if image reminder is enabled.
- show notification and modal only if today's auto reminder has not shown.
- mark today shown after opening the modal or deciding there is nothing to show.

- [ ] **Step 3: Implement unlock reminder**

Listen for Electron `powerMonitor.on("unlock-screen")`. Delay a few seconds, then run the same reminder decision. This supports the user's mobile-hotspot workflow.

- [ ] **Step 4: Implement manual reminder**

Tray action and Today page button can show today's reminder even after the automatic once-per-day reminder has been marked shown.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds; manual tray action opens the reminder window.

Commit:

```powershell
git add src/main/reminderScheduler.ts src/main/main.ts src/main/windows.ts src/main/tray.ts
git commit -m "feat: add daily reminder scheduler"
```

## Task 12: Always-On-Top Timer Window

**Files:**
- Create: `src/renderer/components/TimerPanel.tsx`
- Modify: `src/main/timerWindow.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/renderer/pages/TodayPage.tsx`

- [ ] **Step 1: Build timer UI**

Support:

- count up.
- count down.
- start.
- pause.
- reset.
- duration input for countdown.
- always-on-top toggle.

- [ ] **Step 2: Implement timer window**

Open a compact separate BrowserWindow for the timer. Use `setAlwaysOnTop(enabled)` when toggled.

- [ ] **Step 3: Implement countdown completion notification**

When countdown reaches zero:

- show Electron notification.
- keep the timer window visible.
- display a clear completed state.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds and timer window stays above normal app windows when enabled.

Commit:

```powershell
git add src/renderer/components/TimerPanel.tsx src/main/timerWindow.ts src/main/ipc.ts src/renderer/pages/TodayPage.tsx
git commit -m "feat: add always-on-top timer"
```

## Task 13: Contest Reminder Page And Settings Page

**Files:**
- Create: `src/renderer/pages/ContestReminderPage.tsx`
- Create: `src/renderer/pages/SettingsPage.tsx`
- Modify: `src/main/autostart.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Build contest reminder page**

Show:

- cached contests grouped by platform.
- update timestamp.
- provider failures from last refresh.
- manual refresh button.

- [ ] **Step 2: Build settings page**

Settings:

- open at login.
- today contest reminder enabled.
- random image reminder enabled.
- data directory display.
- exit background app action.

- [ ] **Step 3: Wire autostart setting**

Changing the setting calls `setLoginItemSettings` and persists the choice to settings.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run build
```

Expected: build succeeds and settings persist after restart.

Commit:

```powershell
git add src/renderer/pages/ContestReminderPage.tsx src/renderer/pages/SettingsPage.tsx src/main/autostart.ts src/main/ipc.ts
git commit -m "feat: add contest cache and settings pages"
```

## Task 14: Packaging, Smoke Tests, And MVP Acceptance

**Files:**
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/app-shell.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Add Electron Builder config**

Configure Windows packaging with app name `ACM Trainer`. Keep installer output under `dist-packaged`.

- [ ] **Step 2: Expand smoke tests**

Assert:

- app launches.
- Today page is visible.
- navigation pages render.
- VP contest form opens.
- image wall page renders.
- settings page renders.

- [ ] **Step 3: Add README run instructions**

Document:

- install Node LTS.
- `npm install`.
- `npm run dev`.
- `npm run build`.
- where local data is stored.
- how to quit from tray.

- [ ] **Step 4: Run final verification**

Run:

```powershell
npm run test -- --run
npm run build
npm run package
git status --short
```

Expected:

- tests pass.
- build succeeds.
- package command creates Windows artifact.
- `git status --short` only shows intended packaging output if packaging output is gitignored.

- [ ] **Step 5: Commit**

```powershell
git add package.json playwright.config.ts tests/e2e/app-shell.spec.ts README.md
git commit -m "chore: package acm trainer mvp"
```

## Implementation Notes

- Keep renderer components compact. Split a page once it becomes hard to scan.
- Keep all filesystem access in the main process.
- Renderer talks to the app through preload APIs only.
- Network failures must return user-readable refresh state instead of blocking local app use.
- Auto reminders fire once per local day; manual reminder actions can open the reminder window any time.
- VP dates are user-entered local date-times and are never overwritten by fetched contest metadata.
- Unknown links are valid VP links; platform detection improves convenience but is not required for saving.

## Test Plan

Run throughout implementation:

```powershell
npm run test -- --run
npm run build
```

Run before calling the MVP complete:

```powershell
npm run test -- --run
npm run build
npm run package
```

Manual checks before completion:

- Create, edit, filter, and delete a VP contest.
- Add two reviews to one VP contest and filter by tag.
- Import an image, restart the app, and confirm it still appears.
- Trigger manual contest refresh with network available.
- Disable network and confirm cached data still renders.
- Open timer window, enable always-on-top, run count up and count down.
- Close main window and reopen it from tray.
- Use tray Quit and confirm the process exits.
