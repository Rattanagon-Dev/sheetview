# SheetView — Deployment Guide

SheetView is a fully static client-side Progressive Web App (PWA). All spreadsheet processing (XLSX parsing, CSV encoding, styling, virtualization, and saving) occurs on-device in the browser; no backend server or database is required.

---

## Prerequisites

1. Build the production output:
   ```bash
   cd /home/antigravity/sheetview
   npm run build
   ```
2. The production bundle is output to the `dist/` directory:
   - `dist/index.html`
   - `dist/manifest.webmanifest`
   - `dist/sw.js`
   - `dist/assets/` (bundled JS & CSS)
   - `dist/icons/` (PWA application icons)
   - `dist/samples/` (sample files)

> **Important**: HTTPS is required for Service Workers and PWA installation to function. All asset paths in `dist` are relative (`./`), so SheetView can be hosted under any domain root or subfolder (e.g. `https://example.com/sheetview/`).

---

## Hosting Options

### Option A: Netlify Drop (Easiest — Zero CLI)
1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop) in your desktop browser.
2. Drag and drop the `dist/` folder directly onto the drop zone.
3. Netlify will immediately publish your site to an HTTPS URL (e.g. `https://sheetview-xxxx.netlify.app`).
4. (Optional) Configure a custom domain under *Site configuration* → *Domain management*.

### Option B: Vercel
1. Install and run Vercel CLI from the project directory:
   ```bash
   npx vercel deploy dist --prod
   ```
2. Follow the on-screen prompts to link your Vercel account and project.
3. Your app will be live at a `.vercel.app` HTTPS URL.

### Option C: GitHub Pages
1. Push the contents of the `dist/` folder to a `gh-pages` branch:
   ```bash
   git checkout -b gh-pages
   git add -f dist
   git commit -m "Deploy SheetView to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```
2. In your repository on GitHub, navigate to **Settings** → **Pages**.
3. Under **Branch**, select `gh-pages` and folder `/ (root)`, then click **Save**.
4. GitHub Pages will serve your PWA at `https://<username>.github.io/<repo>/`.

---

## Installing on iPad and iPhone (PWA)

1. Open the hosted HTTPS URL in **Safari** on your iPad or iPhone.
2. Tap the **Share** button (box with upward arrow) in Safari's toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner.
5. Tap the new **SheetView** icon on your home screen. It will launch in full-screen standalone mode without any browser address bars or navigation chrome.

---

## Offline Support & Updates

- **Offline Capability**: Thanks to Workbox and Service Worker precaching, SheetView caches all assets on first load. Once installed, you can enable Airplane mode and launch SheetView to open and edit `.xlsx` and `.csv` files completely offline.
- **Auto-Updates**: When you deploy an updated `dist/` folder, the PWA will detect the updated Service Worker in the background and automatically update on the next launch or reload.
